// Firebase Sync
// Extracted from index.html for maintainability
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

  // Initialize - load pending queue from localStorage
  init: function() {
    try {
      const saved = localStorage.getItem('jmart-sync-queue');
      this.pendingQueue = saved ? JSON.parse(saved) : [];
      if (this.pendingQueue.length > 0) {
        console.log(`Found ${this.pendingQueue.length} pending sync items`);
        this.processQueue();
      }
    } catch (e) {
      console.error('Error loading sync queue:', e);
      this.pendingQueue = [];
    }
  },

  // Save queue to localStorage — tracks storage errors for circuit breaker
  saveQueue: function() {
    try {
      localStorage.setItem('jmart-sync-queue', JSON.stringify(this.pendingQueue));
      // Reset consecutive error counter on success
      this.consecutiveStorageErrors = 0;
    } catch (e) {
      console.error('Error saving sync queue:', e);
      this.consecutiveStorageErrors++;
      if (this.consecutiveStorageErrors >= this.CIRCUIT_BREAKER_THRESHOLD && !this.circuitOpen) {
        this.circuitOpen = true;
        this.circuitOpenedAt = Date.now();
        console.error('CIRCUIT BREAKER OPEN — too many storage errors (' + this.consecutiveStorageErrors + '). Retries paused for 5 minutes.');
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
  addToQueue: function(type, data) {
    if (this.circuitOpen) {
      console.warn('Circuit breaker OPEN — cannot add to queue. Try again after cooldown.');
      this.notifyListeners('circuit_open', { reason: 'queue_blocked' });
      return null;
    }
    const item = {
      id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      type,
      data,
      timestamp: new Date().toISOString(),
      attempts: 0
    };
    this.pendingQueue.push(item);
    this.saveQueue();
    this.notifyListeners('queued', { pending: this.pendingQueue.length });
    return item.id;
  },

  // Process the retry queue — respects circuit breaker
  processQueue: async function() {
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

    const itemsToProcess = [...this.pendingQueue];
    for (const item of itemsToProcess) {
      try {
        await this.executeSync(item);
        // Success - remove from queue
        this.pendingQueue = this.pendingQueue.filter(i => i.id !== item.id);
        this.saveQueue();
        this.notifyListeners('synced', { pending: this.pendingQueue.length, item: item.type });
        console.log(`Sync successful for ${item.type}`);
      } catch (error) {
        item.attempts++;
        if (item.attempts >= this.maxRetries) {
          console.error(`Max retries reached for ${item.type}, removing from queue`);
          this.pendingQueue = this.pendingQueue.filter(i => i.id !== item.id);
          this.notifyListeners('failed', { pending: this.pendingQueue.length, error: error.message });
        } else {
          const delay = this.retryDelays[Math.min(item.attempts - 1, this.retryDelays.length - 1)];
          console.log(`Retry ${item.attempts}/${this.maxRetries} for ${item.type} in ${delay}ms`);
          setTimeout(() => this.processQueue(), delay);
        }
        this.saveQueue();
      }
    }
  },

  // Execute a single sync operation (v3: supports granular update/delete)
  executeSync: async function(item) {
    if (!firebaseDb || !isFirebaseConfigured) {
      throw new Error('Firebase not configured');
    }

    // v3 granular operations (path-based)
    if (item.path && item.operation) {
      const ref = firebaseDb.ref(item.path);
      switch (item.operation) {
        case 'set': await ref.set(item.data); break;
        case 'update': await ref.update(item.data); break;
        case 'delete': await ref.remove(); break;
        default: throw new Error(`Unknown operation: ${item.operation}`);
      }
      return;
    }

    // Legacy bulk operations (fallback)
    switch (item.type) {
      case 'forms':
        await firebaseDb.ref('jmart-safety/forms').set(item.data);
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
        await firebaseDb.ref('jmart-safety/training').set(item.data);
        break;
      case 'signatures':
        await firebaseDb.ref('signatures').set(item.data);
        break;
      default:
        throw new Error(`Unknown sync type: ${item.type}`);
    }
  },

  // Sync forms to Firebase - v3: granular per-form update() instead of full set()
  syncForms: async function(forms) {
    if (!firebaseDb || !isFirebaseConfigured) {
      this.addToQueue('forms', forms);
      return { success: false, queued: true };
    }
    try {
      const deviceId = localStorage.getItem('jmart-device-id') || 'unknown';
      const updates = {};
      const formsArray = Array.isArray(forms) ? forms : Object.values(forms || {});
      formsArray.forEach(form => {
        const key = form.id || `form-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        updates[key] = {
          ...form,
          _lastModified: Date.now(),
          _modifiedBy: deviceId
        };
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
    try {
      const trainingArray = Array.isArray(training) ? training : Object.values(training || {});
      const updates = {};
      trainingArray.forEach((record, i) => {
        const key = record.id || `training-${i}`;
        updates[key] = { ...record, _lastModified: Date.now() };
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
  onFormsChange: (callback) => {
    if (!firebaseDb || !isFirebaseConfigured) return () => {};
    const ref = firebaseDb.ref('jmart-safety/forms');
    ref.on('value', (snapshot) => {
      const data = snapshot.val();
      if (data) callback(data);
    }, (error) => {
      console.error('Firebase listener error:', error);
    });
    return () => ref.off();
  },

  // Listen for real-time site updates
  onSitesChange: (callback) => {
    if (!firebaseDb || !isFirebaseConfigured) return () => {};
    const ref = firebaseDb.ref('jmart-safety/sites');
    ref.on('value', (snapshot) => {
      const data = snapshot.val();
      if (data) callback(data);
    }, (error) => {
      console.error('Firebase sites listener error:', error);
    });
    return () => ref.off();
  },

  // Listen for real-time training updates
  onTrainingChange: (callback) => {
    if (!firebaseDb || !isFirebaseConfigured) return () => {};
    const ref = firebaseDb.ref('jmart-safety/training');
    ref.on('value', (snapshot) => {
      const data = snapshot.val();
      if (data) callback(data);
    }, (error) => {
      console.error('Firebase training listener error:', error);
    });
    return () => ref.off();
  },

  // Check if Firebase is configured and connected
  isConnected: () => isFirebaseConfigured && firebaseDb !== null,

  // Firebase database reference (for direct access when needed)
  db: firebaseDb
};

// Initialize sync queue on load
FirebaseSync.init();

// Expose processQueue for SW background sync triggers
window.processSyncQueue = () => FirebaseSync.processQueue();

// Process queue when coming back online
window.addEventListener('online', () => {
  console.log('Back online - processing sync queue');
  FirebaseSync.processQueue();
});
