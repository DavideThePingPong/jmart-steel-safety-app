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

    // Use IntervalRegistry for proper cleanup on page unload
    this.heartbeatInterval = IntervalRegistry.setInterval(() => {
      this.checkHeartbeat();
    }, this.HEARTBEAT_INTERVAL_MS, 'NetworkHeartbeat');

    // Initial check
    this.checkHeartbeat();
  },

  stopHeartbeat: function() {
    if (this.heartbeatInterval) {
      IntervalRegistry.clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  },

  // Fetch-based fallback probe — used when Firebase isn't ready / configured,
  // or as a sanity check on top of Firebase's cached `.info/connected`.
  // Hits the served version.json (or manifest.json) which is no-cache, so a
  // successful fetch proves real network reachability.
  _fetchProbe: async function() {
    var url = './version.json?_=' + Date.now();
    var controller = new AbortController();
    var timeout = setTimeout(function() { controller.abort(); }, 5000);
    try {
      var resp = await fetch(url, { cache: 'no-store', signal: controller.signal });
      return resp && resp.ok;
    } catch (e) {
      // Try manifest.json as a fallback probe (always present)
      try {
        var resp2 = await fetch('./manifest.json?_=' + Date.now(), { cache: 'no-store', signal: controller.signal });
        return resp2 && resp2.ok;
      } catch (e2) {
        return false;
      }
    } finally {
      clearTimeout(timeout);
    }
  },

  checkHeartbeat: async function() {
    if (!navigator.onLine) return;

    var firebaseProbeResult = null;
    if (typeof firebaseDb !== 'undefined' && firebaseDb && typeof isFirebaseConfigured !== 'undefined' && isFirebaseConfigured) {
      try {
        const connectedRef = firebaseDb.ref('.info/connected');
        let settled = false;
        const snap = await Promise.race([
          new Promise((resolve) => {
            connectedRef.once('value', (s) => { settled = true; resolve(s); });
          }),
          new Promise((_, reject) => setTimeout(() => {
            if (!settled) { try { connectedRef.off('value'); } catch(e) {} }
            reject(new Error('heartbeat timeout'));
          }, 10000))
        ]);
        firebaseProbeResult = snap.val() === true;
      } catch (e) {
        firebaseProbeResult = false;
      }
    }

    // Fetch-based probe runs ALWAYS — covers the case where Firebase isn't
    // configured/ready (boot window) and the case where Firebase's cached
    // .info/connected lies after a real network drop. Either probe being
    // healthy means we're online; both failing means we're not.
    var fetchProbeResult = await this._fetchProbe();
    var anyHealthy = firebaseProbeResult === true || fetchProbeResult === true;
    var anyChecked = firebaseProbeResult !== null || true;

    if (anyHealthy) {
      this.consecutiveFailures = 0;
      if (!this.isActuallyOnline) {
        this.isActuallyOnline = true;
        console.log('Network: Heartbeat restored — actually online');
        this.notifyListeners();
      }
    } else if (anyChecked) {
      this.consecutiveFailures++;
      if (this.consecutiveFailures >= this.MAX_FAILURES_BEFORE_LIEFI && this.isActuallyOnline) {
        this.isActuallyOnline = false;
        console.warn('Network: Lie-fi detected — both Firebase and fetch probes failed');
        this.notifyListeners();
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
