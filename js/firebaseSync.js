// Firebase Sync
// Extracted from index.html for maintainability

// Universal sanitizer: recursively replace undefined with null in any object
// Firebase Realtime DB rejects .set()/.update() if ANY nested value is undefined
function sanitizeForFirebase(obj) {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeForFirebase);
  var clean = {};
  Object.keys(obj).forEach(function(k) {
    clean[k] = sanitizeForFirebase(obj[k]);
  });
  return clean;
}

const FirebaseSync = {
  // Retry queue stored in localStorage
  pendingQueue: [],
  retryAttempts: {},
  maxRetries: 5,
  retryDelays: [1000, 5000, 15000, 30000, 60000], // Exponential backoff
  syncListeners: [], // UI callbacks for sync status

  // Circuit breaker — stops retry storms when storage is full or Firebase is down
  circuitOpen: false,
  consecutiveStorageErrors: 0,
  CIRCUIT_BREAKER_THRESHOLD: 3,
  circuitOpenedAt: null,
  CIRCUIT_COOLDOWN_MS: 2 * 60 * 1000, // 2 minutes (reduced from 5 for faster recovery)

  MAX_QUEUE_SIZE: 50,         // Hard cap — prevents localStorage bloat (was 100)
  MAX_QUEUE_BYTES: 250000,    // 250KB max — beyond this, oldest entries get dropped (was 500KB)
  _isProcessing: false,       // Concurrency guard — prevents overlapping processQueue calls
  _authReady: false,          // Tracks whether Firebase auth has completed

  // ========================================
  // AUTH GATE — ensures Firebase auth is ready before any operation
  // Without this, operations fire before signInAnonymously() completes
  // and get PERMISSION_DENIED, tripping the circuit breaker.
  // ========================================
  _ensureAuth: async function() {
    // Already confirmed ready
    if (this._authReady) return true;

    // Firebase not configured — no auth needed
    if (!isFirebaseConfigured || !firebaseDb) return false;

    // Wait for the auth promise (set in config.js)
    try {
      await Promise.race([
        firebaseAuthReady,
        new Promise(function(_, reject) {
          setTimeout(function() { reject(new Error('AUTH_TIMEOUT')); }, 10000);
        })
      ]);
      this._authReady = true;
      return true;
    } catch (e) {
      console.warn('[FirebaseSync] Auth not ready:', e.message);
      return false;
    }
  },

  // Initialize - load pending queue from localStorage
  init: function() {
    try {
      const saved = localStorage.getItem('jmart-sync-queue');
      this.pendingQueue = saved ? JSON.parse(saved) : [];
      // Enforce size cap on load (in case of corruption or old bloated data)
      if (this.pendingQueue.length > this.MAX_QUEUE_SIZE) {
        console.warn('[FirebaseSync] Queue over cap (' + this.pendingQueue.length + '), trimming to ' + this.MAX_QUEUE_SIZE);
        this.pendingQueue = this.pendingQueue.slice(-this.MAX_QUEUE_SIZE);
        this.saveQueue();
      }
      if (this.pendingQueue.length > 0) {
        console.log('[FirebaseSync] Found ' + this.pendingQueue.length + ' pending sync items — waiting for auth before processing');
        // FIXED: Wait for auth before processing queue.
        // Previously this called processQueue() immediately, which fired
        // before signInAnonymously() completed → PERMISSION_DENIED → circuit breaker trip
        this._processAfterAuth();
      }
    } catch (e) {
      console.error('Error loading sync queue:', e);
      if (typeof ErrorTelemetry !== 'undefined') ErrorTelemetry.captureError(e, 'sync-queue-load');
      this.pendingQueue = [];
    }
  },

  // Deferred queue processing — waits for Firebase auth then processes
  _processAfterAuth: async function() {
    var authOk = await this._ensureAuth();
    if (authOk) {
      console.log('[FirebaseSync] Auth ready — processing ' + this.pendingQueue.length + ' queued items');
      // Reset circuit breaker on fresh auth — previous PERMISSION_DENIED errors
      // would have tripped it, but now auth is valid so we should retry
      if (this.circuitOpen) {
        console.log('[FirebaseSync] Resetting circuit breaker after auth recovery');
        this.circuitOpen = false;
        this.consecutiveStorageErrors = 0;
        this.circuitOpenedAt = null;
      }
      this.processQueue();
    } else {
      console.warn('[FirebaseSync] Auth failed — queue processing deferred until online event');
    }
  },

  // Save queue to localStorage — tracks storage errors for circuit breaker
  saveQueue: function() {
    try {
      // Enforce size cap before saving
      if (this.pendingQueue.length > this.MAX_QUEUE_SIZE) {
        this.pendingQueue = this.pendingQueue.slice(-this.MAX_QUEUE_SIZE);
      }
      var serialized = JSON.stringify(this.pendingQueue);
      // Check byte size — if over limit, drop oldest entries until under
      while (serialized.length > this.MAX_QUEUE_BYTES && this.pendingQueue.length > 1) {
        this.pendingQueue.shift(); // drop oldest
        serialized = JSON.stringify(this.pendingQueue);
      }
      // FIXED: If a single entry is still over the limit, drop it entirely.
      // Previously this case was ignored, and a single 5MB+ entry would be written
      // to localStorage, immediately filling storage.
      if (serialized.length > this.MAX_QUEUE_BYTES && this.pendingQueue.length === 1) {
        console.warn('[FirebaseSync] Single queue entry too large (' + Math.round(serialized.length / 1024) + 'KB) — dropping it');
        this.pendingQueue = [];
        serialized = '[]';
      }
      localStorage.setItem('jmart-sync-queue', serialized);
      // Reset consecutive error counter on success
      this.consecutiveStorageErrors = 0;
    } catch (e) {
      console.error('Error saving sync queue:', e);
      if (typeof ErrorTelemetry !== 'undefined') ErrorTelemetry.captureError(e, 'sync-queue-save');
      this.consecutiveStorageErrors++;
      if (this.consecutiveStorageErrors >= this.CIRCUIT_BREAKER_THRESHOLD && !this.circuitOpen) {
        this.circuitOpen = true;
        this.circuitOpenedAt = Date.now();
        console.error('CIRCUIT BREAKER OPEN — too many storage errors (' + this.consecutiveStorageErrors + '). Retries paused for 2 minutes.');
        this.notifyListeners('circuit_open', { reason: 'storage_full', cooldownMs: this.CIRCUIT_COOLDOWN_MS });
      }
    }
  },

  // Add listener for sync status updates
  onSyncStatusChange: function(callback) {
    this.syncListeners.push(callback);
    return () => {
      this.syncListeners = this.syncListeners.filter(cb => cb !== callback);
    };
  },

  // Notify listeners of status change
  notifyListeners: function(status, details) {
    this.syncListeners.forEach(cb => cb(status, details));
  },

  // Add item to retry queue — blocked when circuit breaker is open
  // FIXED: Strip base64 photos from queued data. Without this, a single failed
  // syncForms() call would store 5MB+ of photo data in the sync queue in localStorage,
  // immediately filling storage to 130%.
  addToQueue: function(type, data) {
    if (this.circuitOpen) {
      console.warn('Circuit breaker OPEN — cannot add to queue. Try again after cooldown.');
      this.notifyListeners('circuit_open', { reason: 'queue_blocked' });
      return null;
    }
    // Strip large data (photos, signatures, base64) from queue items.
    // The queue only needs form metadata — photos live in Firebase.
    var safeData = data;
    if (typeof StorageQuotaManager !== 'undefined' && StorageQuotaManager.stripLargeData) {
      if (Array.isArray(data)) {
        safeData = StorageQuotaManager.stripLargeData(data);
      } else if (data && typeof data === 'object') {
        try { safeData = JSON.parse(JSON.stringify(data, function(k, v) {
          if (typeof v === 'string' && v.length > 500 && (v.indexOf('data:') === 0 || v.indexOf('/9j/') === 0 || v.indexOf('iVBOR') === 0)) return '[queued]';
          if (typeof v === 'string' && v.length > 5000) return v.substring(0, 200) + '...[truncated]';
          return v;
        })); } catch (e) { /* use original */ }
      }
    }
    var item = {
      id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      type: type,
      data: safeData,
      timestamp: new Date().toISOString(),
      attempts: 0
    };
    this.pendingQueue.push(item);
    this.saveQueue();
    this.notifyListeners('queued', { pending: this.pendingQueue.length });
    return item.id;
  },

  // Process the retry queue — respects circuit breaker, concurrency guard, AND auth gate
  processQueue: async function() {
    // Concurrency guard — prevent overlapping processQueue calls
    if (this._isProcessing) {
      console.log('[FirebaseSync] processQueue already running — skipping');
      return;
    }

    // Circuit breaker check
    if (this.circuitOpen) {
      const elapsed = Date.now() - (this.circuitOpenedAt || 0);
      if (elapsed < this.CIRCUIT_COOLDOWN_MS) {
        console.log('Circuit breaker OPEN — queue processing blocked. Cooldown: ' + Math.round((this.CIRCUIT_COOLDOWN_MS - elapsed) / 1000) + 's remaining');
        return;
      }
      // Half-open: try one cycle
      console.log('Circuit breaker half-open — attempting recovery...');
      this.circuitOpen = false;
      this.consecutiveStorageErrors = 0;
    }

    if (!navigator.onLine || !this.isConnected()) {
      console.log('Offline - queue processing deferred');
      return;
    }

    // Verify Firebase is actually reachable (not just navigator.onLine lie-fi)
    if (typeof NetworkStatus !== 'undefined' && !NetworkStatus.isActuallyOnline) {
      console.log('[FirebaseSync] Lie-fi detected — deferring queue processing');
      return;
    }

    // FIXED: Wait for Firebase auth before processing
    // Without this, operations fire before signInAnonymously() completes
    var authOk = await this._ensureAuth();
    if (!authOk) {
      console.warn('[FirebaseSync] Auth not ready — deferring queue processing');
      return;
    }

    this._isProcessing = true;
    try {
      const itemsToProcess = [...this.pendingQueue];
      for (const item of itemsToProcess) {
        try {
          await this.executeSync(item);
          // Success - remove from queue
          this.pendingQueue = this.pendingQueue.filter(i => i.id !== item.id);
          this.saveQueue();
          this.notifyListeners('synced', { pending: this.pendingQueue.length, item: item.type });
          console.log('[FirebaseSync] Sync successful for ' + item.type);
        } catch (error) {
          // Check if it's a PERMISSION_DENIED error — if so, try re-auth
          if (error.message && error.message.indexOf('PERMISSION_DENIED') !== -1) {
            console.warn('[FirebaseSync] PERMISSION_DENIED — attempting re-auth');
            this._authReady = false;
            var reAuthOk = await this._ensureAuth();
            if (!reAuthOk) {
              console.error('[FirebaseSync] Re-auth failed — stopping queue processing');
              break;
            }
            // Retry this one item after re-auth
            try {
              await this.executeSync(item);
              this.pendingQueue = this.pendingQueue.filter(i => i.id !== item.id);
              this.saveQueue();
              this.notifyListeners('synced', { pending: this.pendingQueue.length, item: item.type });
              console.log('[FirebaseSync] Sync successful for ' + item.type + ' after re-auth');
              continue;
            } catch (e2) {
              // Still failing after re-auth — fall through to retry logic
              error = e2;
            }
          }

          item.attempts++;
          if (item.attempts >= this.maxRetries) {
            console.error('[FirebaseSync] Max retries reached for ' + item.type + ', removing from queue');
            this.pendingQueue = this.pendingQueue.filter(i => i.id !== item.id);
            this.notifyListeners('failed', { pending: this.pendingQueue.length, error: error.message });
          } else {
            const delay = this.retryDelays[Math.min(item.attempts - 1, this.retryDelays.length - 1)];
            console.log('[FirebaseSync] Retry ' + item.attempts + '/' + this.maxRetries + ' for ' + item.type + ' in ' + delay + 'ms');
            IntervalRegistry.setTimeout(() => this.processQueue(), delay, 'FirebaseSync-retry');
          }
          this.saveQueue();
        }
      }
    } finally {
      this._isProcessing = false;
    }
  },

  // Execute a single sync operation (v3: supports granular update/delete)
  executeSync: async function(item) {
    if (!firebaseDb || !isFirebaseConfigured) {
      throw new Error('Firebase not configured');
    }

    // FIXED: Ensure auth is ready before any Firebase write
    await this._ensureAuth();

    // v3 granular operations (path-based)
    if (item.path && item.operation) {
      const ref = firebaseDb.ref(item.path);
      switch (item.operation) {
        case 'set': await ref.set(sanitizeForFirebase(item.data)); break;
        case 'update': await ref.update(sanitizeForFirebase(item.data)); break;
        case 'delete': await ref.remove(); break;
        default: throw new Error('Unknown operation: ' + item.operation);
      }
      return;
    }

    // Legacy bulk operations (fallback)
    switch (item.type) {
      case 'forms':
        await firebaseDb.ref('jmart-safety/forms').set(sanitizeForFirebase(item.data));
        break;
      case 'sites': {
        // Sanitize queued sites data — old queue entries may contain corrupted objects
        const raw = Array.isArray(item.data) ? item.data : Object.values(item.data || {});
        const clean = [...new Set(raw.map(s => {
          if (typeof s === 'string') return s;
          if (s && typeof s === 'object') {
            const chars = Object.keys(s).filter(k => k !== '_lastModified' && !isNaN(k)).sort((a,b) => Number(a) - Number(b));
            return chars.map(k => s[k]).join('');
          }
          return null;
        }).filter(s => s && s.length > 1 && s !== 'undefined' && s !== 'null'))];
        await firebaseDb.ref('jmart-safety/sites').set(clean);
        break;
      }
      case 'training':
        await firebaseDb.ref('jmart-safety/training').set(sanitizeForFirebase(item.data));
        break;
      case 'signatures':
        await firebaseDb.ref('signatures').set(sanitizeForFirebase(item.data));
        break;
      default:
        throw new Error('Unknown sync type: ' + item.type);
    }
  },

  // Sync forms to Firebase - v3: granular per-form update() instead of full set()
  syncForms: async function(forms) {
    if (!firebaseDb || !isFirebaseConfigured) {
      this.addToQueue('forms', forms);
      return { success: false, queued: true };
    }
    // FIXED: Wait for auth before writing
    var authOk = await this._ensureAuth();
    if (!authOk) {
      this.addToQueue('forms', forms);
      return { success: false, queued: true, error: 'Auth not ready' };
    }
    try {
      const deviceId = localStorage.getItem('jmart-device-id') || 'unknown';
      const updates = {};
      const formsArray = Array.isArray(forms) ? forms : Object.values(forms || {});
      formsArray.forEach(form => {
        if (!form || !form.id) return; // Skip invalid forms
        const key = form.id || ('form-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6));
        updates[key] = sanitizeForFirebase({
          ...form,
          _lastModified: Date.now(),
          _modifiedBy: deviceId
        });
      });
      // Single atomic update of all forms (granular keys, no full overwrite)
      await firebaseDb.ref('jmart-safety/forms').update(updates);
      console.log('Forms synced to Firebase (granular):', formsArray.length, 'forms');
      return { success: true };
    } catch (error) {
      console.error('Error syncing forms, adding to retry queue:', error);
      this.addToQueue('forms', forms);
      this.notifyListeners('error', { message: 'Sync failed - will retry automatically' });
      return { success: false, queued: true, error: error.message };
    }
  },

  // Sync sites to Firebase - v4: REPLACE entire sites array with set()
  // v3 used update() which accumulated entries and spread strings into char objects
  syncSites: async function(sites) {
    if (!firebaseDb || !isFirebaseConfigured) {
      this.addToQueue('sites', sites);
      return { success: false, queued: true };
    }
    // FIXED: Wait for auth before writing
    var authOk = await this._ensureAuth();
    if (!authOk) {
      this.addToQueue('sites', sites);
      return { success: false, queued: true, error: 'Auth not ready' };
    }
    try {
      // Ensure we're writing a clean array of plain strings (no objects, no duplicates)
      const sitesArray = [...new Set(
        (Array.isArray(sites) ? sites : Object.values(sites || {}))
          .map(s => typeof s === 'string' ? s : (s && s.name ? s.name : String(s)))
          .filter(s => s && s.length > 0 && s !== 'undefined' && s !== 'null')
      )];

      // Use set() to REPLACE the entire sites node — prevents accumulation
      await firebaseDb.ref('jmart-safety/sites').set(sitesArray);
      console.log('Sites synced to Firebase (clean replace):', sitesArray.length, 'sites');
      return { success: true };
    } catch (error) {
      console.error('Error syncing sites, adding to retry queue:', error);
      this.addToQueue('sites', sites);
      return { success: false, queued: true, error: error.message };
    }
  },

  // Sync training records to Firebase - v3: granular per-record update()
  syncTraining: async function(training) {
    if (!firebaseDb || !isFirebaseConfigured) {
      this.addToQueue('training', training);
      return { success: false, queued: true };
    }
    // FIXED: Wait for auth before writing
    var authOk = await this._ensureAuth();
    if (!authOk) {
      this.addToQueue('training', training);
      return { success: false, queued: true, error: 'Auth not ready' };
    }
    try {
      const trainingArray = Array.isArray(training) ? training : Object.values(training || {});
      const updates = {};
      trainingArray.forEach((record, i) => {
        const key = record.id || ('training-' + i);
        updates[key] = sanitizeForFirebase({ ...record, _lastModified: Date.now() });
      });
      await firebaseDb.ref('jmart-safety/training').update(updates);
      console.log('Training synced to Firebase (granular):', trainingArray.length, 'records');
      return { success: true };
    } catch (error) {
      console.error('Error syncing training, adding to retry queue:', error);
      this.addToQueue('training', training);
      return { success: false, queued: true, error: error.message };
    }
  },

  // Get pending queue count
  getPendingCount: function() {
    return this.pendingQueue.length;
  },

  // Reset circuit breaker manually (e.g. from settings UI)
  resetCircuitBreaker: function() {
    this.circuitOpen = false;
    this.consecutiveStorageErrors = 0;
    this.circuitOpenedAt = null;
    console.log('Circuit breaker manually reset');
    this.notifyListeners('circuit_reset', { pending: this.pendingQueue.length });
  },

  // Manual retry all pending items
  retryAll: function() {
    this.pendingQueue.forEach(item => item.attempts = 0);
    this.saveQueue();
    this.processQueue();
  },

  // Listen for real-time form updates
  // FIXED: Sets up listener immediately but the Firebase SDK handles auth internally
  // for .on() listeners — they auto-retry after auth completes
  onFormsChange: (callback) => {
    if (!firebaseDb || !isFirebaseConfigured) return () => {};
    const ref = firebaseDb.ref('jmart-safety/forms');
    const handler = (snapshot) => {
      const data = snapshot.val();
      if (data) callback(data);
    };
    const errorHandler = (error) => {
      console.error('Firebase listener error:', error);
      if (typeof ToastNotifier !== 'undefined') ToastNotifier.error('Lost connection to form updates');
      if (typeof ErrorTelemetry !== 'undefined') ErrorTelemetry.captureError(error, 'firebase-listener');
    };
    ref.on('value', handler, errorHandler);
    return () => ref.off('value', handler);
  },

  // Listen for real-time site updates
  onSitesChange: (callback) => {
    if (!firebaseDb || !isFirebaseConfigured) return () => {};
    const ref = firebaseDb.ref('jmart-safety/sites');
    const handler = (snapshot) => {
      const data = snapshot.val();
      if (data) callback(data);
    };
    const errorHandler = (error) => {
      console.error('Firebase sites listener error:', error);
      if (typeof ErrorTelemetry !== 'undefined') ErrorTelemetry.captureError(error, 'firebase-sites-listener');
    };
    ref.on('value', handler, errorHandler);
    return () => ref.off('value', handler);
  },

  // Listen for real-time training updates
  onTrainingChange: (callback) => {
    if (!firebaseDb || !isFirebaseConfigured) return () => {};
    const ref = firebaseDb.ref('jmart-safety/training');
    const handler = (snapshot) => {
      const data = snapshot.val();
      if (data) callback(data);
    };
    const errorHandler = (error) => {
      console.error('Firebase training listener error:', error);
      if (typeof ErrorTelemetry !== 'undefined') ErrorTelemetry.captureError(error, 'firebase-training-listener');
    };
    ref.on('value', handler, errorHandler);
    return () => ref.off('value', handler);
  },

  // Check if Firebase is configured and connected
  isConnected: () => isFirebaseConfigured && firebaseDb !== null,

  // Firebase database reference (getter — returns live value, not stale capture)
  get db() { return firebaseDb; }
};

// Initialize sync queue on load
FirebaseSync.init();

// Expose processQueue for SW background sync triggers
window.processSyncQueue = () => FirebaseSync.processQueue();

// Process queue when coming back online — verify Firebase connection first
window.addEventListener('online', () => {
  console.log('Back online - verifying Firebase connection before sync...');
  // Wait for network to stabilize, then verify Firebase is actually connected
  // before processing queue. Do NOT blindly reset _authReady — if auth is
  // already valid, resetting it causes unnecessary re-auth that can fail.
  setTimeout(async () => {
    // Check if Firebase is actually reachable, not just navigator.onLine
    if (typeof firebaseDb !== 'undefined' && firebaseDb) {
      try {
        const snap = await Promise.race([
          firebaseDb.ref('.info/connected').once('value'),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
        ]);
        if (snap.val() !== true) {
          console.log('Firebase not yet connected — deferring queue processing');
          return;
        }
      } catch (e) {
        console.log('Firebase connection check failed:', e.message, '— deferring queue');
        return;
      }
    }
    // Only reset auth if Firebase user is actually gone (e.g. token expired)
    if (typeof firebase !== 'undefined' && firebase.auth && !firebase.auth().currentUser) {
      console.log('Firebase auth user missing — resetting auth flag');
      FirebaseSync._authReady = false;
    }
    console.log('Firebase connected — processing sync queue');
    FirebaseSync.processQueue();
  }, 2000);
});

// NOTE: Google Drive silent reconnect removed from online handler.
// On Android, requestAccessToken({ prompt: '' }) opens a popup that gets blocked.
// User must tap Connect manually to re-auth Google Drive.
