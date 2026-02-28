// Network Status Manager
// Extracted from index.html for maintainability
// ========================================
// NETWORK STATUS MANAGER
// Tracks online/offline status for UI
// Enhanced: Firebase heartbeat to detect "lie-fi" (connected but no real data flow)
// ========================================
const NetworkStatus = {
  isOnline: navigator.onLine,
  isActuallyOnline: navigator.onLine, // Heartbeat-verified connectivity
  listeners: [],
  heartbeatInterval: null,
  HEARTBEAT_INTERVAL_MS: 60000, // Check every 60 seconds
  consecutiveFailures: 0,
  MAX_FAILURES_BEFORE_LIEFI: 2,

  init: function() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.isActuallyOnline = true; // Optimistic until heartbeat says otherwise
      this.consecutiveFailures = 0;
      this.notifyListeners();
      console.log('Network: Online');
      // Start heartbeat when we come online
      this.startHeartbeat();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.isActuallyOnline = false;
      this.notifyListeners();
      console.log('Network: Offline');
      this.stopHeartbeat();
    });

    // Start heartbeat if already online
    if (navigator.onLine) {
      this.startHeartbeat();
    }
  },

  // Firebase heartbeat — checks .info/connected to verify real connectivity
  startHeartbeat: function() {
    if (this.heartbeatInterval) return; // Already running

    this.heartbeatInterval = setInterval(() => {
      this.checkHeartbeat();
    }, this.HEARTBEAT_INTERVAL_MS);

    // Initial check
    this.checkHeartbeat();
  },

  stopHeartbeat: function() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  },

  checkHeartbeat: async function() {
    if (!navigator.onLine) return;

    // Use Firebase .info/connected if available
    if (typeof firebaseDb !== 'undefined' && firebaseDb && typeof isFirebaseConfigured !== 'undefined' && isFirebaseConfigured) {
      try {
        const connectedRef = firebaseDb.ref('.info/connected');
        const snap = await Promise.race([
          new Promise((resolve) => {
            connectedRef.once('value', resolve);
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('heartbeat timeout')), 10000))
        ]);

        if (snap.val() === true) {
          this.consecutiveFailures = 0;
          if (!this.isActuallyOnline) {
            this.isActuallyOnline = true;
            console.log('Network: Heartbeat restored — actually online');
            this.notifyListeners();
          }
        } else {
          this.consecutiveFailures++;
          if (this.consecutiveFailures >= this.MAX_FAILURES_BEFORE_LIEFI && this.isActuallyOnline) {
            this.isActuallyOnline = false;
            console.warn('Network: Lie-fi detected — browser says online but Firebase disconnected');
            this.notifyListeners();
          }
        }
      } catch (e) {
        this.consecutiveFailures++;
        if (this.consecutiveFailures >= this.MAX_FAILURES_BEFORE_LIEFI && this.isActuallyOnline) {
          this.isActuallyOnline = false;
          console.warn('Network: Lie-fi detected — heartbeat failed:', e.message);
          this.notifyListeners();
        }
      }
    }
  },

  subscribe: function(callback) {
    this.listeners.push(callback);
    callback(this.isActuallyOnline);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  },

  notifyListeners: function() {
    this.listeners.forEach(cb => cb(this.isActuallyOnline));
  }
};

// Initialize Network Status
NetworkStatus.init();
