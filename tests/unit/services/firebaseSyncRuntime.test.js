/**
 * Tests for js/firebaseSync.js — FirebaseSync (production runtime with circuit breaker)
 *
 * This tests the js/ production version, NOT the src/ factory version.
 * Key differences: circuit breaker, auth gate, concurrency guard, queue size caps.
 */

const fs = require('fs');
const path = require('path');

const SCRIPT = path.resolve(__dirname, '..', '..', '..', 'js', 'firebaseSync.js');

function loadFirebaseSync() {
  let code = fs.readFileSync(SCRIPT, 'utf-8');
  code = code.replace(/^const FirebaseSync\s*=/m, 'global.FirebaseSync =');
  // Strip auto-init at bottom
  code = code.replace(/^FirebaseSync\.init\(\);$/m, '// [stripped]');
  code = code.replace(/^window\.processSyncQueue[\s\S]*$/m, '// [stripped]');
  code = code.replace(/^window\.addEventListener\('online'[\s\S]*?\}\);$/m, '// [stripped]');
  const fn = new Function(code);
  fn.call(global);
}

describe('FirebaseSync (runtime)', () => {
  let store;
  let mockRef;

  beforeEach(() => {
    store = {};
    localStorage.getItem.mockImplementation(key => store[key] !== undefined ? store[key] : null);
    localStorage.setItem.mockImplementation((key, value) => { store[key] = String(value); });

    mockRef = {
      set: jest.fn().mockResolvedValue(),
      update: jest.fn().mockResolvedValue(),
      remove: jest.fn().mockResolvedValue(),
      on: jest.fn(),
      off: jest.fn(),
      child: jest.fn(function() { return mockRef; }),
      push: jest.fn().mockResolvedValue()
    };

    global.firebaseDb = { ref: jest.fn(() => mockRef) };
    global.isFirebaseConfigured = true;
    global.firebaseAuthReady = Promise.resolve();
    global.IntervalRegistry = {
      setTimeout: jest.fn(),
      clearTimeout: jest.fn()
    };
    global.StorageQuotaManager = {
      stripLargeData: jest.fn(data => data)
    };
    global.AuditLogManager = { log: jest.fn() };

    navigator.onLine = true;

    loadFirebaseSync();
    // Reset state
    FirebaseSync.pendingQueue = [];
    FirebaseSync.circuitOpen = false;
    FirebaseSync.consecutiveStorageErrors = 0;
    FirebaseSync.circuitOpenedAt = null;
    FirebaseSync._isProcessing = false;
    FirebaseSync._authReady = false;
    FirebaseSync.syncListeners = [];
  });

  afterEach(() => {
    delete global.FirebaseSync;
    delete global.firebaseDb;
    delete global.isFirebaseConfigured;
    delete global.firebaseAuthReady;
    delete global.IntervalRegistry;
    delete global.StorageQuotaManager;
    delete global.AuditLogManager;
  });

  // =====================================================
  // init()
  // =====================================================
  describe('init()', () => {
    // init() calls _processAfterAuth() async — mock to prevent background processing
    beforeEach(() => {
      jest.spyOn(FirebaseSync, '_processAfterAuth').mockResolvedValue();
    });
    afterEach(() => {
      FirebaseSync._processAfterAuth.mockRestore();
    });

    it('loads empty queue when nothing saved', () => {
      FirebaseSync.init();
      expect(FirebaseSync.pendingQueue).toEqual([]);
    });

    it('loads saved queue from localStorage', () => {
      store['jmart-sync-queue'] = JSON.stringify([{ id: '1', type: 'forms' }]);
      FirebaseSync.init();
      expect(FirebaseSync.pendingQueue).toHaveLength(1);
    });

    it('trims queue over MAX_QUEUE_SIZE', () => {
      const big = Array.from({ length: 100 }, (_, i) => ({ id: String(i), type: 'forms' }));
      store['jmart-sync-queue'] = JSON.stringify(big);
      FirebaseSync.init();
      expect(FirebaseSync.pendingQueue.length).toBeLessThanOrEqual(FirebaseSync.MAX_QUEUE_SIZE);
    });

    it('handles corrupt JSON', () => {
      store['jmart-sync-queue'] = 'not-json{';
      FirebaseSync.init();
      expect(FirebaseSync.pendingQueue).toEqual([]);
    });

    it('calls _processAfterAuth when queue has items', () => {
      store['jmart-sync-queue'] = JSON.stringify([{ id: '1', type: 'forms' }]);
      FirebaseSync.init();
      expect(FirebaseSync._processAfterAuth).toHaveBeenCalled();
    });
  });

  // =====================================================
  // saveQueue()
  // =====================================================
  describe('saveQueue()', () => {
    it('saves queue to localStorage', () => {
      FirebaseSync.pendingQueue = [{ id: '1', type: 'forms' }];
      FirebaseSync.saveQueue();
      expect(store['jmart-sync-queue']).toBeTruthy();
      expect(JSON.parse(store['jmart-sync-queue'])).toHaveLength(1);
    });

    it('enforces MAX_QUEUE_SIZE', () => {
      FirebaseSync.pendingQueue = Array.from({ length: 100 }, (_, i) => ({ id: String(i) }));
      FirebaseSync.saveQueue();
      const saved = JSON.parse(store['jmart-sync-queue']);
      expect(saved.length).toBeLessThanOrEqual(FirebaseSync.MAX_QUEUE_SIZE);
    });

    it('drops oldest when over MAX_QUEUE_BYTES', () => {
      FirebaseSync.pendingQueue = [
        { id: '1', data: 'x'.repeat(200000) },
        { id: '2', data: 'y'.repeat(200000) }
      ];
      FirebaseSync.saveQueue();
      const saved = JSON.parse(store['jmart-sync-queue']);
      expect(saved.length).toBeLessThan(2);
    });

    it('drops single oversized entry', () => {
      FirebaseSync.pendingQueue = [{ id: '1', data: 'x'.repeat(300000) }];
      FirebaseSync.saveQueue();
      expect(JSON.parse(store['jmart-sync-queue'])).toEqual([]);
    });

    it('resets error counter on success', () => {
      FirebaseSync.consecutiveStorageErrors = 2;
      FirebaseSync.pendingQueue = [{ id: '1' }];
      FirebaseSync.saveQueue();
      expect(FirebaseSync.consecutiveStorageErrors).toBe(0);
    });

    it('trips circuit breaker after threshold storage errors', () => {
      // Make setItem throw
      localStorage.setItem.mockImplementation(() => { throw new Error('full'); });
      FirebaseSync.consecutiveStorageErrors = FirebaseSync.CIRCUIT_BREAKER_THRESHOLD - 1;
      FirebaseSync.pendingQueue = [{ id: '1' }];
      FirebaseSync.saveQueue();
      expect(FirebaseSync.circuitOpen).toBe(true);
    });
  });

  // =====================================================
  // onSyncStatusChange()
  // =====================================================
  describe('onSyncStatusChange()', () => {
    it('adds listener', () => {
      const cb = jest.fn();
      FirebaseSync.onSyncStatusChange(cb);
      expect(FirebaseSync.syncListeners).toContain(cb);
    });

    it('returns unsubscribe function', () => {
      const cb = jest.fn();
      const unsub = FirebaseSync.onSyncStatusChange(cb);
      unsub();
      expect(FirebaseSync.syncListeners).not.toContain(cb);
    });
  });

  describe('notifyListeners()', () => {
    it('calls listeners with status and details', () => {
      const cb = jest.fn();
      FirebaseSync.syncListeners = [cb];
      FirebaseSync.notifyListeners('synced', { pending: 0 });
      expect(cb).toHaveBeenCalledWith('synced', { pending: 0 });
    });
  });

  // =====================================================
  // addToQueue()
  // =====================================================
  describe('addToQueue()', () => {
    it('adds item with correct shape', () => {
      const id = FirebaseSync.addToQueue('forms', [{ id: 1 }]);
      expect(id).toBeTruthy();
      expect(FirebaseSync.pendingQueue).toHaveLength(1);
      expect(FirebaseSync.pendingQueue[0]).toMatchObject({
        type: 'forms',
        attempts: 0
      });
    });

    it('notifies listeners', () => {
      const cb = jest.fn();
      FirebaseSync.syncListeners = [cb];
      FirebaseSync.addToQueue('forms', []);
      expect(cb).toHaveBeenCalledWith('queued', expect.objectContaining({ pending: 1 }));
    });

    it('blocked when circuit breaker open', () => {
      FirebaseSync.circuitOpen = true;
      const id = FirebaseSync.addToQueue('forms', []);
      expect(id).toBeNull();
      expect(FirebaseSync.pendingQueue).toHaveLength(0);
    });

    it('strips large data via StorageQuotaManager', () => {
      StorageQuotaManager.stripLargeData.mockReturnValue([{ id: 1, photo: '[stripped]' }]);
      FirebaseSync.addToQueue('forms', [{ id: 1, photo: 'data:image/...' }]);
      expect(StorageQuotaManager.stripLargeData).toHaveBeenCalled();
    });
  });

  // =====================================================
  // Circuit breaker
  // =====================================================
  describe('circuit breaker', () => {
    it('resetCircuitBreaker() resets all state', () => {
      FirebaseSync.circuitOpen = true;
      FirebaseSync.consecutiveStorageErrors = 5;
      FirebaseSync.circuitOpenedAt = Date.now();
      const cb = jest.fn();
      FirebaseSync.syncListeners = [cb];

      FirebaseSync.resetCircuitBreaker();
      expect(FirebaseSync.circuitOpen).toBe(false);
      expect(FirebaseSync.consecutiveStorageErrors).toBe(0);
      expect(FirebaseSync.circuitOpenedAt).toBeNull();
      expect(cb).toHaveBeenCalledWith('circuit_reset', expect.any(Object));
    });

    it('processQueue blocked during cooldown', async () => {
      FirebaseSync.circuitOpen = true;
      FirebaseSync.circuitOpenedAt = Date.now(); // just opened
      FirebaseSync.pendingQueue = [{ id: '1', type: 'forms', attempts: 0 }];
      await FirebaseSync.processQueue();
      // Should not have attempted sync
      expect(mockRef.set).not.toHaveBeenCalled();
    });

    it('processQueue enters half-open after cooldown', async () => {
      FirebaseSync.circuitOpen = true;
      FirebaseSync.circuitOpenedAt = Date.now() - FirebaseSync.CIRCUIT_COOLDOWN_MS - 1000;
      FirebaseSync.pendingQueue = [];
      await FirebaseSync.processQueue();
      expect(FirebaseSync.circuitOpen).toBe(false);
    });
  });

  // =====================================================
  // processQueue()
  // =====================================================
  describe('processQueue()', () => {
    it('skips when offline', async () => {
      navigator.onLine = false;
      FirebaseSync.pendingQueue = [{ id: '1', type: 'forms', attempts: 0 }];
      await FirebaseSync.processQueue();
      expect(mockRef.set).not.toHaveBeenCalled();
    });

    it('skips when not connected', async () => {
      global.isFirebaseConfigured = false;
      FirebaseSync.pendingQueue = [{ id: '1', type: 'forms', attempts: 0 }];
      await FirebaseSync.processQueue();
      expect(mockRef.set).not.toHaveBeenCalled();
    });

    it('concurrency guard prevents overlap', async () => {
      FirebaseSync._isProcessing = true;
      FirebaseSync.pendingQueue = [{ id: '1', type: 'forms', attempts: 0 }];
      await FirebaseSync.processQueue();
      expect(mockRef.set).not.toHaveBeenCalled();
    });

    it('processes and removes successful items', async () => {
      FirebaseSync._authReady = true;
      FirebaseSync.pendingQueue = [{ id: '1', type: 'forms', data: [{ id: 'f1' }], attempts: 0 }];
      await FirebaseSync.processQueue();
      expect(FirebaseSync.pendingQueue).toHaveLength(0);
    });

    it('increments attempts on failure', async () => {
      FirebaseSync._authReady = true;
      mockRef.set.mockRejectedValue(new Error('network error'));
      mockRef.update.mockRejectedValue(new Error('network error'));
      FirebaseSync.pendingQueue = [{ id: '1', type: 'forms', data: [], attempts: 0 }];
      await FirebaseSync.processQueue();
      expect(FirebaseSync.pendingQueue[0].attempts).toBe(1);
    });

    it('removes item after max retries', async () => {
      FirebaseSync._authReady = true;
      mockRef.set.mockRejectedValue(new Error('fail'));
      mockRef.update.mockRejectedValue(new Error('fail'));
      FirebaseSync.pendingQueue = [{ id: '1', type: 'forms', data: [], attempts: 4 }];
      const cb = jest.fn();
      FirebaseSync.syncListeners = [cb];
      await FirebaseSync.processQueue();
      expect(FirebaseSync.pendingQueue).toHaveLength(0);
      expect(cb).toHaveBeenCalledWith('failed', expect.any(Object));
    });

    it('resets _isProcessing in finally block', async () => {
      FirebaseSync._authReady = true;
      FirebaseSync.pendingQueue = [];
      await FirebaseSync.processQueue();
      expect(FirebaseSync._isProcessing).toBe(false);
    });
  });

  // =====================================================
  // executeSync()
  // =====================================================
  describe('executeSync()', () => {
    beforeEach(() => { FirebaseSync._authReady = true; });

    it('handles v3 set operation', async () => {
      await FirebaseSync.executeSync({ path: 'test/path', operation: 'set', data: { a: 1 } });
      expect(firebaseDb.ref).toHaveBeenCalledWith('test/path');
      expect(mockRef.set).toHaveBeenCalledWith({ a: 1 });
    });

    it('handles v3 update operation', async () => {
      await FirebaseSync.executeSync({ path: 'test/path', operation: 'update', data: { a: 1 } });
      expect(mockRef.update).toHaveBeenCalledWith({ a: 1 });
    });

    it('handles v3 delete operation', async () => {
      await FirebaseSync.executeSync({ path: 'test/path', operation: 'delete' });
      expect(mockRef.remove).toHaveBeenCalled();
    });

    it('throws on unknown operation', async () => {
      await expect(FirebaseSync.executeSync({ path: 'p', operation: 'bad' }))
        .rejects.toThrow('Unknown operation');
    });

    it('handles legacy forms type', async () => {
      await FirebaseSync.executeSync({ type: 'forms', data: [{ id: 1 }] });
      expect(firebaseDb.ref).toHaveBeenCalledWith('jmart-safety/forms');
      expect(mockRef.set).toHaveBeenCalled();
    });

    it('handles legacy training type', async () => {
      await FirebaseSync.executeSync({ type: 'training', data: [] });
      expect(firebaseDb.ref).toHaveBeenCalledWith('jmart-safety/training');
    });

    it('throws when Firebase not configured', async () => {
      global.isFirebaseConfigured = false;
      global.firebaseDb = null;
      await expect(FirebaseSync.executeSync({ type: 'forms', data: [] }))
        .rejects.toThrow('Firebase not configured');
    });

    it('throws on unknown legacy type', async () => {
      await expect(FirebaseSync.executeSync({ type: 'bogus', data: [] }))
        .rejects.toThrow('Unknown sync type');
    });
  });

  // =====================================================
  // syncForms()
  // =====================================================
  describe('syncForms()', () => {
    beforeEach(() => { FirebaseSync._authReady = true; });

    it('syncs forms via granular update', async () => {
      store['jmart-device-id'] = 'dev-1';
      const result = await FirebaseSync.syncForms([{ id: 'f1', title: 'Test' }]);
      expect(result.success).toBe(true);
      expect(mockRef.update).toHaveBeenCalled();
    });

    it('queues when Firebase not configured', async () => {
      global.isFirebaseConfigured = false;
      global.firebaseDb = null;
      const result = await FirebaseSync.syncForms([{ id: 'f1' }]);
      expect(result.success).toBe(false);
      expect(result.queued).toBe(true);
    });

    it('queues on error', async () => {
      mockRef.update.mockRejectedValue(new Error('fail'));
      const result = await FirebaseSync.syncForms([{ id: 'f1' }]);
      expect(result.success).toBe(false);
      expect(result.queued).toBe(true);
    });
  });

  // =====================================================
  // syncSites()
  // =====================================================
  describe('syncSites()', () => {
    beforeEach(() => { FirebaseSync._authReady = true; });

    it('syncs sites via set()', async () => {
      const result = await FirebaseSync.syncSites(['Site A', 'Site B']);
      expect(result.success).toBe(true);
      expect(mockRef.set).toHaveBeenCalledWith(['Site A', 'Site B']);
    });

    it('deduplicates and filters sites', async () => {
      const result = await FirebaseSync.syncSites(['A', 'A', '', 'B', 'undefined']);
      expect(result.success).toBe(true);
      const arg = mockRef.set.mock.calls[0][0];
      expect(arg).not.toContain('');
      expect(arg).not.toContain('undefined');
    });

    it('queues when not configured', async () => {
      global.isFirebaseConfigured = false;
      global.firebaseDb = null;
      const result = await FirebaseSync.syncSites(['A']);
      expect(result.queued).toBe(true);
    });
  });

  // =====================================================
  // Utility methods
  // =====================================================
  describe('utility methods', () => {
    it('getPendingCount returns queue length', () => {
      FirebaseSync.pendingQueue = [1, 2, 3];
      expect(FirebaseSync.getPendingCount()).toBe(3);
    });

    it('retryAll resets attempts and calls processQueue', () => {
      const spy = jest.spyOn(FirebaseSync, 'processQueue').mockResolvedValue();
      FirebaseSync.pendingQueue = [{ id: '1', attempts: 3 }, { id: '2', attempts: 5 }];
      FirebaseSync.retryAll();
      expect(FirebaseSync.pendingQueue[0].attempts).toBe(0);
      expect(FirebaseSync.pendingQueue[1].attempts).toBe(0);
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('isConnected checks config and db', () => {
      expect(FirebaseSync.isConnected()).toBe(true);
      global.isFirebaseConfigured = false;
      expect(FirebaseSync.isConnected()).toBe(false);
    });

  });

  // =====================================================
  // onFormsChange / onSitesChange / onTrainingChange
  // =====================================================
  describe('real-time listeners', () => {
    it('onFormsChange sets up listener', () => {
      const cb = jest.fn();
      const unsub = FirebaseSync.onFormsChange(cb);
      expect(firebaseDb.ref).toHaveBeenCalledWith('jmart-safety/forms');
      expect(mockRef.on).toHaveBeenCalledWith('value', expect.any(Function), expect.any(Function));
      expect(typeof unsub).toBe('function');
    });

    it('onFormsChange returns noop when not configured', () => {
      global.isFirebaseConfigured = false;
      const unsub = FirebaseSync.onFormsChange(jest.fn());
      expect(typeof unsub).toBe('function');
    });

    it('onSitesChange sets up listener', () => {
      FirebaseSync.onSitesChange(jest.fn());
      expect(firebaseDb.ref).toHaveBeenCalledWith('jmart-safety/sites');
    });

    it('onTrainingChange sets up listener', () => {
      FirebaseSync.onTrainingChange(jest.fn());
      expect(firebaseDb.ref).toHaveBeenCalledWith('jmart-safety/training');
    });
  });

  // =====================================================
  // _ensureAuth()
  // =====================================================
  describe('_ensureAuth()', () => {
    it('returns true when already ready', async () => {
      FirebaseSync._authReady = true;
      expect(await FirebaseSync._ensureAuth()).toBe(true);
    });

    it('returns false when Firebase not configured', async () => {
      global.isFirebaseConfigured = false;
      expect(await FirebaseSync._ensureAuth()).toBe(false);
    });

    it('waits for firebaseAuthReady', async () => {
      global.firebaseAuthReady = Promise.resolve();
      const result = await FirebaseSync._ensureAuth();
      expect(result).toBe(true);
      expect(FirebaseSync._authReady).toBe(true);
    });

    it('returns false on auth timeout', async () => {
      global.firebaseAuthReady = new Promise(() => {}); // never resolves
      // Override the timeout to be instant
      jest.useFakeTimers();
      const promise = FirebaseSync._ensureAuth();
      jest.advanceTimersByTime(11000);
      const result = await promise;
      expect(result).toBe(false);
      jest.useRealTimers();
    });
  });
});
