/**
 * Firebase Sync Service for JMart Steel Safety App
 * Extracted from index.html for testability
 *
 * Handles data synchronization with Firebase Realtime Database
 * Includes retry queue for offline support
 */

/**
 * Creates a Firebase Sync service instance
 * @param {Object} firebaseDb - Firebase database instance
 * @param {Object} localStorage - localStorage interface
 * @returns {Object} - FirebaseSync service
 */
export function createFirebaseSync(firebaseDb, localStorage) {
  const QUEUE_KEY = 'jmart-sync-queue';
  const MAX_RETRIES = 5;
  const RETRY_DELAYS = [1000, 5000, 15000, 30000, 60000]; // Exponential backoff

  let pendingQueue = [];
  let retryAttempts = {};
  let syncListeners = [];

  /**
   * Initialize - load pending queue from localStorage
   */
  function init() {
    try {
      const saved = localStorage.getItem(QUEUE_KEY);
      pendingQueue = saved ? JSON.parse(saved) : [];
      if (pendingQueue.length > 0) {
        processQueue();
      }
    } catch (e) {
      console.error('Error loading sync queue:', e);
      pendingQueue = [];
    }
  }

  /**
   * Save queue to localStorage
   */
  function saveQueue() {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(pendingQueue));
    } catch (e) {
      console.error('Error saving sync queue:', e);
    }
  }

  /**
   * Add listener for sync status updates
   * @param {Function} callback - Callback function
   * @returns {Function} - Unsubscribe function
   */
  function onSyncStatusChange(callback) {
    syncListeners.push(callback);
    return () => {
      syncListeners = syncListeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Notify listeners of status change
   * @param {string} status - Status type
   * @param {Object} details - Additional details
   */
  function notifyListeners(status, details) {
    syncListeners.forEach(cb => cb(status, details));
  }

  /**
   * Add item to retry queue
   * @param {string} type - Data type (forms, sites, training, signatures)
   * @param {*} data - Data to sync
   * @returns {string} - Queue item ID
   */
  function addToQueue(type, data) {
    const item = {
      id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      type,
      data,
      timestamp: new Date().toISOString(),
      attempts: 0
    };
    pendingQueue.push(item);
    saveQueue();
    notifyListeners('queued', { pending: pendingQueue.length });
    return item.id;
  }

  /**
   * Check if Firebase is connected
   * @returns {boolean}
   */
  function isConnected() {
    return firebaseDb !== null;
  }

  /**
   * Execute a single sync operation
   * @param {Object} item - Queue item
   */
  async function executeSync(item) {
    if (!firebaseDb) {
      throw new Error('Firebase not configured');
    }

    switch (item.type) {
      case 'forms':
        await firebaseDb.ref('jmart-safety/forms').set(item.data);
        break;
      case 'sites':
        await firebaseDb.ref('jmart-safety/sites').set(item.data);
        break;
      case 'training':
        await firebaseDb.ref('jmart-safety/training').set(item.data);
        break;
      case 'signatures':
        await firebaseDb.ref('signatures').set(item.data);
        break;
      default:
        throw new Error(`Unknown sync type: ${item.type}`);
    }
  }

  /**
   * Process the retry queue
   */
  async function processQueue() {
    if (!navigator.onLine || !isConnected()) {
      return { processed: 0, pending: pendingQueue.length, offline: true };
    }

    const results = {
      processed: 0,
      failed: 0,
      pending: 0
    };

    const itemsToProcess = [...pendingQueue];
    for (const item of itemsToProcess) {
      try {
        await executeSync(item);
        // Success - remove from queue
        pendingQueue = pendingQueue.filter(i => i.id !== item.id);
        saveQueue();
        notifyListeners('synced', { pending: pendingQueue.length, item: item.type });
        results.processed++;
      } catch (error) {
        item.attempts++;
        if (item.attempts >= MAX_RETRIES) {
          notifyListeners('failed', { pending: pendingQueue.length, error: error.message });
          results.failed++;
        } else {
          const delay = RETRY_DELAYS[Math.min(item.attempts - 1, RETRY_DELAYS.length - 1)];
          setTimeout(() => processQueue(), delay);
        }
        saveQueue();
      }
    }

    results.pending = pendingQueue.length;
    return results;
  }

  /**
   * Sync forms to Firebase with retry support
   * @param {Array} forms - Forms to sync
   * @returns {Object} - Result object
   */
  async function syncForms(forms) {
    if (!firebaseDb) {
      addToQueue('forms', forms);
      return { success: false, queued: true };
    }
    try {
      await firebaseDb.ref('jmart-safety/forms').set(forms);
      return { success: true };
    } catch (error) {
      addToQueue('forms', forms);
      notifyListeners('error', { message: 'Sync failed - will retry automatically' });
      return { success: false, queued: true, error: error.message };
    }
  }

  /**
   * Sync sites to Firebase with retry support
   * @param {Array} sites - Sites to sync
   * @returns {Object} - Result object
   */
  async function syncSites(sites) {
    if (!firebaseDb) {
      addToQueue('sites', sites);
      return { success: false, queued: true };
    }
    try {
      await firebaseDb.ref('jmart-safety/sites').set(sites);
      return { success: true };
    } catch (error) {
      addToQueue('sites', sites);
      return { success: false, queued: true, error: error.message };
    }
  }

  /**
   * Sync training records to Firebase with retry support
   * @param {Array} training - Training records to sync
   * @returns {Object} - Result object
   */
  async function syncTraining(training) {
    if (!firebaseDb) {
      addToQueue('training', training);
      return { success: false, queued: true };
    }
    try {
      await firebaseDb.ref('jmart-safety/training').set(training);
      return { success: true };
    } catch (error) {
      addToQueue('training', training);
      return { success: false, queued: true, error: error.message };
    }
  }

  /**
   * Get pending queue count
   * @returns {number}
   */
  function getPendingCount() {
    return pendingQueue.length;
  }

  /**
   * Get pending queue items
   * @returns {Array}
   */
  function getPendingQueue() {
    return [...pendingQueue];
  }

  /**
   * Manual retry all pending items
   */
  function retryAll() {
    pendingQueue.forEach(item => item.attempts = 0);
    saveQueue();
    return processQueue();
  }

  /**
   * Clear the pending queue
   */
  function clearQueue() {
    pendingQueue = [];
    saveQueue();
  }

  /**
   * Listen for real-time form updates
   * @param {Function} callback - Callback for updates
   * @returns {Function} - Unsubscribe function
   */
  function onFormsChange(callback) {
    if (!firebaseDb) return () => {};
    const ref = firebaseDb.ref('jmart-safety/forms');
    ref.on('value', (snapshot) => {
      const data = snapshot.val();
      if (data) callback(data);
    }, (error) => {
      console.error('Firebase listener error:', error);
    });
    return () => ref.off();
  }

  return {
    init,
    isConnected,
    syncForms,
    syncSites,
    syncTraining,
    getPendingCount,
    getPendingQueue,
    processQueue,
    retryAll,
    clearQueue,
    onSyncStatusChange,
    onFormsChange,
    addToQueue
  };
}

export default createFirebaseSync;
