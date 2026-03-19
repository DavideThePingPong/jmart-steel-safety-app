/**
 * Sync Integrity Integration Test
 *
 * Guards the entire Firebase sync pipeline against regression:
 * 1. Anti-loop protection (Firebase listener → setForms → syncFormsEffect must NOT loop)
 * 2. Auth gate (all writes wait for signInAnonymously before firing)
 * 3. Circuit breaker (trips after 3 storage errors, recovers after cooldown)
 * 4. Queue management (size caps, byte limits, oversized entry drop)
 * 5. sanitizeForFirebase coverage (no undefined values reach Firebase)
 * 6. Deletion persistence (deletedFormIdsRef survives page reload + Firebase merge)
 * 7. Concurrency guard (_isProcessing prevents overlapping queue processing)
 *
 * If any of these break, forms will either:
 * - Loop infinitely filling localStorage with photo data
 * - Get PERMISSION_DENIED and trip the circuit breaker on every load
 * - Silently drop data or resurrect deleted forms
 */

const loadScript = require('../helpers/loadScript');
const fs = require('fs');
const path = require('path');

describe('Sync Integrity', () => {
  let store;

  beforeEach(() => {
    store = {};
    localStorage.getItem.mockImplementation(key => store[key] !== undefined ? store[key] : null);
    localStorage.setItem.mockImplementation((key, value) => { store[key] = String(value); });
    localStorage.removeItem.mockImplementation(key => { delete store[key]; });

    // Mock Firebase
    global.isFirebaseConfigured = true;
    global.firebaseAuthUid = 'test-uid-123';
    global.firebaseAuthReady = Promise.resolve();

    const mockRef = (refPath) => ({
      path: refPath,
      set: jest.fn().mockResolvedValue(),
      update: jest.fn().mockResolvedValue(),
      remove: jest.fn().mockResolvedValue(),
      push: jest.fn(() => ({ set: jest.fn().mockResolvedValue() })),
      on: jest.fn(),
      off: jest.fn(),
      once: jest.fn().mockResolvedValue({ val: () => null })
    });
    global.firebaseDb = { ref: jest.fn(mockRef) };

    global.IntervalRegistry = {
      setTimeout: jest.fn((fn, delay, label) => setTimeout(fn, delay)),
      clearTimeout: jest.fn(id => clearTimeout(id)),
      setInterval: jest.fn((fn, delay, label) => setInterval(fn, delay)),
      clearInterval: jest.fn(id => clearInterval(id))
    };

    global.ErrorTelemetry = { captureError: jest.fn() };
    global.ToastNotifier = { error: jest.fn(), success: jest.fn() };
    global.StorageQuotaManager = {
      stripLargeData: jest.fn(d => d),
      safeFormsWrite: jest.fn((forms) => {
        store['jmart-safety-forms'] = JSON.stringify(forms);
      })
    };
    global.DeviceAuthManager = { deviceId: 'TEST-DEVICE' };

    // Load FirebaseSync
    loadScript('js/firebaseSync.js', {
      globalizeConst: ['FirebaseSync', 'sanitizeForFirebase'],
      stripAutoInit: ['FirebaseSync.init()'],
      quiet: true
    });
  });

  afterEach(() => {
    delete global.FirebaseSync;
    delete global.sanitizeForFirebase;
    delete global.isFirebaseConfigured;
    delete global.firebaseDb;
    delete global.firebaseAuthUid;
    delete global.firebaseAuthReady;
    delete global.IntervalRegistry;
    delete global.ErrorTelemetry;
    delete global.ToastNotifier;
    delete global.StorageQuotaManager;
    delete global.DeviceAuthManager;
  });

  // =============================================
  // 1. AUTH GATE
  // =============================================
  describe('Auth Gate', () => {
    it('_ensureAuth returns true when auth resolves', async () => {
      FirebaseSync._authReady = false;
      // firebaseAuthReady is already Promise.resolve() from beforeEach

      const result = await FirebaseSync._ensureAuth();
      expect(result).toBe(true);
      expect(FirebaseSync._authReady).toBe(true);
    });

    it('_ensureAuth returns false when Firebase not configured', async () => {
      global.isFirebaseConfigured = false;
      FirebaseSync._authReady = false;

      const result = await FirebaseSync._ensureAuth();
      expect(result).toBe(false);
    });

    it('resets circuit breaker after auth recovery', async () => {
      FirebaseSync.circuitOpen = true;
      FirebaseSync.consecutiveStorageErrors = 5;
      FirebaseSync.circuitOpenedAt = Date.now() - 300000;
      FirebaseSync._authReady = false;

      await FirebaseSync._initAuth();

      expect(FirebaseSync.circuitOpen).toBe(false);
      expect(FirebaseSync.consecutiveStorageErrors).toBe(0);
    });

    it('_ensureAuth returns cached true on subsequent calls', async () => {
      FirebaseSync._authReady = true;
      const result = await FirebaseSync._ensureAuth();
      expect(result).toBe(true);
    });

    it('init always calls _initAuth eagerly', () => {
      const spy = jest.spyOn(FirebaseSync, '_initAuth').mockResolvedValue();
      FirebaseSync.init();
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  // =============================================
  // 2. CIRCUIT BREAKER
  // =============================================
  describe('Circuit Breaker', () => {
    it('opens after 3 consecutive storage errors', () => {
      // Simulate storage full
      localStorage.setItem.mockImplementation(() => { throw new Error('QuotaExceeded'); });

      FirebaseSync.pendingQueue = [{ id: '1', type: 'forms', data: [], attempts: 0 }];
      FirebaseSync.saveQueue();
      FirebaseSync.saveQueue();
      FirebaseSync.saveQueue();

      expect(FirebaseSync.circuitOpen).toBe(true);
      expect(FirebaseSync.circuitOpenedAt).toBeTruthy();
    });

    it('blocks addToQueue when open', () => {
      FirebaseSync.circuitOpen = true;
      const result = FirebaseSync.addToQueue('forms', []);
      expect(result).toBeNull();
    });

    it('half-opens after cooldown', async () => {
      FirebaseSync.circuitOpen = true;
      FirebaseSync.circuitOpenedAt = Date.now() - (3 * 60 * 1000); // 3 minutes ago (past 2min cooldown)
      FirebaseSync._authReady = true;
      FirebaseSync.pendingQueue = [];

      await FirebaseSync.processQueue();

      expect(FirebaseSync.circuitOpen).toBe(false);
    });

    it('resets on manual resetCircuitBreaker()', () => {
      FirebaseSync.circuitOpen = true;
      FirebaseSync.consecutiveStorageErrors = 10;
      FirebaseSync.circuitOpenedAt = Date.now();

      FirebaseSync.resetCircuitBreaker();

      expect(FirebaseSync.circuitOpen).toBe(false);
      expect(FirebaseSync.consecutiveStorageErrors).toBe(0);
      expect(FirebaseSync.circuitOpenedAt).toBeNull();
    });
  });

  // =============================================
  // 3. QUEUE MANAGEMENT
  // =============================================
  describe('Queue Management', () => {
    it('caps queue at 50 items on load', () => {
      const spy = jest.spyOn(FirebaseSync, '_initAuth').mockResolvedValue();
      const bigQueue = Array.from({ length: 80 }, (_, i) => ({
        id: 'item-' + i, type: 'forms', data: [], attempts: 0
      }));
      store['jmart-sync-queue'] = JSON.stringify(bigQueue);

      FirebaseSync.init();

      expect(FirebaseSync.pendingQueue.length).toBeLessThanOrEqual(50);
      spy.mockRestore();
    });

    it('drops oldest entries when byte limit exceeded', () => {
      FirebaseSync.pendingQueue = [];
      // Add items until we exceed 250KB
      for (let i = 0; i < 10; i++) {
        FirebaseSync.addToQueue('forms', { id: 'f' + i, bigData: 'x'.repeat(30000) });
      }
      // Queue should have been trimmed during save
      const serialized = JSON.stringify(FirebaseSync.pendingQueue);
      expect(serialized.length).toBeLessThanOrEqual(FirebaseSync.MAX_QUEUE_BYTES + 1000); // some slack for metadata
    });

    it('drops single oversized entry instead of getting stuck', () => {
      FirebaseSync.pendingQueue = [];
      FirebaseSync.addToQueue('forms', { id: 'huge', bigData: 'x'.repeat(300000) });

      // The entry should have been dropped entirely
      const saved = JSON.parse(store['jmart-sync-queue'] || '[]');
      const totalBytes = JSON.stringify(saved).length;
      expect(totalBytes).toBeLessThanOrEqual(FirebaseSync.MAX_QUEUE_BYTES);
    });

    it('strips base64 photos from queued data', () => {
      const formWithPhoto = {
        id: 'f1',
        type: 'prestart',
        photos: ['data:image/jpeg;base64,' + 'x'.repeat(5000)]
      };
      FirebaseSync.addToQueue('forms', formWithPhoto);

      const queued = FirebaseSync.pendingQueue[FirebaseSync.pendingQueue.length - 1];
      const dataStr = JSON.stringify(queued.data);
      // Should not contain the full base64 photo
      expect(dataStr.length).toBeLessThan(2000);
    });
  });

  // =============================================
  // 4. CONCURRENCY GUARD
  // =============================================
  describe('Concurrency Guard', () => {
    it('prevents overlapping processQueue calls', async () => {
      FirebaseSync._authReady = true;
      FirebaseSync._isProcessing = true;

      const spy = jest.spyOn(console, 'log').mockImplementation();
      await FirebaseSync.processQueue();
      spy.mockRestore();

      // Should have exited early
      expect(FirebaseSync._isProcessing).toBe(true); // still held by original
    });

    it('releases lock after processing completes', async () => {
      FirebaseSync._authReady = true;
      FirebaseSync.pendingQueue = [];

      await FirebaseSync.processQueue();

      expect(FirebaseSync._isProcessing).toBe(false);
    });

    it('releases lock even if processing throws', async () => {
      FirebaseSync._authReady = true;
      FirebaseSync.pendingQueue = [{
        id: 'bad', type: 'unknown-type', data: {}, attempts: 4
      }];

      const spy = jest.spyOn(console, 'error').mockImplementation();
      await FirebaseSync.processQueue();
      spy.mockRestore();

      expect(FirebaseSync._isProcessing).toBe(false);
    });
  });

  // =============================================
  // 5. sanitizeForFirebase COVERAGE (source audit)
  // =============================================
  describe('sanitizeForFirebase Source Coverage', () => {
    // This test reads the actual source files and verifies every .set() and .update()
    // call is wrapped with sanitizeForFirebase(). It's a static analysis guard.

    const filesToAudit = [
      'js/firebaseSync.js',
      'js/auditLogManager.js',
      'js/photoUploadManager.js',
      'js/jobsManager.js'
    ];

    filesToAudit.forEach(file => {
      it('should sanitize all Firebase writes in ' + file, () => {
        const filePath = path.resolve(__dirname, '../../', file);
        if (!fs.existsSync(filePath)) {
          console.warn('File not found, skipping: ' + file);
          return;
        }
        const source = fs.readFileSync(filePath, 'utf8');

        // Find all .set( and .update( calls
        const writePattern = /\.(set|update)\s*\(/g;
        let match;
        const unsanitized = [];

        while ((match = writePattern.exec(source)) !== null) {
          // Get context: 500 chars before the match (enough for multi-line sanitize patterns)
          const start = Math.max(0, match.index - 500);
          const context = source.substring(start, match.index + match[0].length + 100);

          // Check if sanitizeForFirebase or _sanitize appears in the surrounding context
          const hasSanitize = context.includes('sanitizeForFirebase') ||
                              context.includes('_sanitize') ||
                              context.includes('sanitize(');

          // Skip non-Firebase calls (e.g. Set.add, Map.set, localStorage.setItem)
          const beforeDot = source.substring(Math.max(0, match.index - 50), match.index);
          const isFirebaseWrite = beforeDot.includes('ref(') ||
                                  beforeDot.includes('Ref.') ||
                                  beforeDot.includes('ref.') ||
                                  beforeDot.includes(').') ||
                                  context.includes('firebaseDb') ||
                                  context.includes('firebase.database');

          // Skip known safe patterns
          const isSafe = beforeDot.includes('localStorage') ||
                         beforeDot.includes('formMap') ||
                         beforeDot.includes('seenSites') ||
                         beforeDot.includes('Map') ||
                         beforeDot.includes('deletedFormIdsRef') ||
                         beforeDot.includes('mockImplementation') ||
                         context.includes('.remove()');

          if (isFirebaseWrite && !hasSanitize && !isSafe) {
            const lineNum = source.substring(0, match.index).split('\n').length;
            unsanitized.push({
              file: file,
              line: lineNum,
              method: match[1],
              context: context.trim().substring(0, 120)
            });
          }
        }

        if (unsanitized.length > 0) {
          const details = unsanitized.map(u =>
            '  Line ' + u.line + ': .' + u.method + '() — ' + u.context.substring(0, 80)
          ).join('\n');
          throw new Error(
            'Found ' + unsanitized.length + ' unsanitized Firebase write(s) in ' + file + ':\n' + details +
            '\n\nWrap with sanitizeForFirebase() to prevent undefined value crashes.'
          );
        }
      });
    });
  });

  // =============================================
  // 6. SYNC FORMS — granular update, not full overwrite
  // =============================================
  describe('syncForms', () => {
    it('uses update() for granular per-form sync, not set()', async () => {
      FirebaseSync._authReady = true;
      const forms = [
        { id: 'form-1', type: 'prestart', data: {} },
        { id: 'form-2', type: 'incident', data: {} }
      ];

      await FirebaseSync.syncForms(forms);

      const ref = firebaseDb.ref;
      expect(ref).toHaveBeenCalledWith('jmart-safety/forms');

      // Should use update (granular), NOT set (full overwrite)
      const formsRef = ref.mock.results.find(r => r.value.path === 'jmart-safety/forms');
      expect(formsRef.value.update).toHaveBeenCalled();
      expect(formsRef.value.set).not.toHaveBeenCalled();
    });

    it('skips forms with missing id', async () => {
      FirebaseSync._authReady = true;
      const forms = [
        { id: 'form-1', type: 'prestart' },
        { type: 'incident' }, // no id
        null, // null form
        { id: 'form-3', type: 'toolbox' }
      ];

      await FirebaseSync.syncForms(forms);

      const ref = firebaseDb.ref;
      const formsRef = ref.mock.results.find(r => r.value.path === 'jmart-safety/forms');
      const updateCall = formsRef.value.update.mock.calls[0][0];

      // Should only have form-1 and form-3
      expect(updateCall['form-1']).toBeDefined();
      expect(updateCall['form-3']).toBeDefined();
      expect(Object.keys(updateCall)).toHaveLength(2);
    });

    it('queues forms when Firebase is not configured', async () => {
      global.isFirebaseConfigured = false;
      const result = await FirebaseSync.syncForms([{ id: 'f1' }]);

      expect(result.success).toBe(false);
      expect(result.queued).toBe(true);
    });

    it('queues forms when Firebase is not configured and auth not ready', async () => {
      FirebaseSync._authReady = false;
      global.isFirebaseConfigured = false;

      const result = await FirebaseSync.syncForms([{ id: 'f1' }]);

      expect(result.success).toBe(false);
      expect(result.queued).toBe(true);
    });
  });

  // =============================================
  // 7. SYNC SITES — clean replace with set()
  // =============================================
  describe('syncSites', () => {
    it('uses set() to replace entire sites node (prevents accumulation)', async () => {
      FirebaseSync._authReady = true;
      const sites = ['Site A', 'Site B', 'Site C'];

      await FirebaseSync.syncSites(sites);

      const ref = firebaseDb.ref;
      const sitesRef = ref.mock.results.find(r => r.value.path === 'jmart-safety/sites');
      expect(sitesRef.value.set).toHaveBeenCalledWith(['Site A', 'Site B', 'Site C']);
    });

    it('deduplicates and cleans site names', async () => {
      FirebaseSync._authReady = true;
      const sites = ['Site A', 'Site A', 'Site B', '', 'undefined', 'null', 'Site B'];

      await FirebaseSync.syncSites(sites);

      const ref = firebaseDb.ref;
      const sitesRef = ref.mock.results.find(r => r.value.path === 'jmart-safety/sites');
      const written = sitesRef.value.set.mock.calls[0][0];

      // Should deduplicate exact matches and filter invalid entries
      expect(written).not.toContain('');
      expect(written).not.toContain('undefined');
      expect(written).not.toContain('null');
      // Exact dedup: "Site A" appears once, "Site B" appears once
      expect(written.filter(s => s === 'Site A')).toHaveLength(1);
      expect(written.filter(s => s === 'Site B')).toHaveLength(1);
    });
  });

  // =============================================
  // 8. ONLINE/OFFLINE RESILIENCE
  // =============================================
  describe('Online/Offline Resilience', () => {
    it('skips queue processing when circuit breaker is open and not cooled down', async () => {
      FirebaseSync._authReady = true;
      FirebaseSync.pendingQueue = [{ id: '1', type: 'forms', data: [], attempts: 0 }];
      FirebaseSync.circuitOpen = true;
      FirebaseSync.circuitOpenedAt = Date.now(); // just now — hasn't cooled down

      const spy = jest.spyOn(console, 'log').mockImplementation();
      await FirebaseSync.processQueue();
      spy.mockRestore();

      // Queue should still have the item (circuit breaker blocked processing)
      expect(FirebaseSync.pendingQueue).toHaveLength(1);
      expect(FirebaseSync.circuitOpen).toBe(true);
    });
  });

  // =============================================
  // 9. ANTI-LOOP PROTECTION (source structure verification)
  // =============================================
  describe('Anti-loop Protection (hooks.jsx audit)', () => {
    it('should have formsFromFirebaseRef guard in hooks.jsx', () => {
      const hooksPath = path.resolve(__dirname, '../../js/components/hooks.jsx');
      if (!fs.existsSync(hooksPath)) {
        console.warn('hooks.jsx not found, skipping');
        return;
      }
      const source = fs.readFileSync(hooksPath, 'utf8');

      // Verify the anti-loop ref exists
      expect(source).toContain('formsFromFirebaseRef');

      // Verify it's set to true BEFORE setForms in the Firebase listener
      const listenerSection = source.substring(
        source.indexOf('onFormsChange'),
        source.indexOf('onFormsChange') + 2000
      );
      const setTrueIdx = listenerSection.indexOf('formsFromFirebaseRef.current = true');
      const setFormsIdx = listenerSection.indexOf('setForms(');
      expect(setTrueIdx).toBeGreaterThan(-1);
      expect(setFormsIdx).toBeGreaterThan(-1);
      expect(setTrueIdx).toBeLessThan(setFormsIdx); // must come BEFORE setForms

      // Verify syncFormsEffect checks the ref and returns early
      // Use the function definition, not first mention (which may be a comment)
      const syncDefIdx = source.indexOf('const syncFormsEffect');
      expect(syncDefIdx).toBeGreaterThan(-1);
      const syncSection = source.substring(syncDefIdx, syncDefIdx + 1000);
      expect(syncSection).toContain('formsFromFirebaseRef.current');
      expect(syncSection).toContain('return');
    });

    it('should have sitesFromFirebaseRef guard in hooks.jsx', () => {
      const hooksPath = path.resolve(__dirname, '../../js/components/hooks.jsx');
      if (!fs.existsSync(hooksPath)) return;
      const source = fs.readFileSync(hooksPath, 'utf8');

      expect(source).toContain('sitesFromFirebaseRef');

      // Verify it's set in the sites listener
      const sitesListenerIdx = source.indexOf('onSitesChange');
      const sitesSection = source.substring(sitesListenerIdx, sitesListenerIdx + 1000);
      expect(sitesSection).toContain('sitesFromFirebaseRef.current = true');
    });

    it('should have deletedFormIdsRef filter in Firebase merge', () => {
      const hooksPath = path.resolve(__dirname, '../../js/components/hooks.jsx');
      if (!fs.existsSync(hooksPath)) return;
      const source = fs.readFileSync(hooksPath, 'utf8');

      // The merge logic must check deletedFormIdsRef before adding forms
      const mergeSection = source.substring(
        source.indexOf('onFormsChange'),
        source.indexOf('onFormsChange') + 3000
      );
      expect(mergeSection).toContain('deletedIds.has(form.id)');
      expect(mergeSection).toContain('return'); // the skip
    });
  });
});
