// Network Status Manager
// Extracted from index.html for maintainability
// ========================================
// NETWORK STATUS MANAGER
// Tracks online/offline status for UI
// ========================================
const NetworkStatus = {
  isOnline: navigator.onLine,
  listeners: [],

  init: function() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifyListeners();
      console.log('Network: Online');
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyListeners();
      console.log('Network: Offline');
    });
  },

  subscribe: function(callback) {
    this.listeners.push(callback);
    callback(this.isOnline);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  },

  notifyListeners: function() {
    this.listeners.forEach(cb => cb(this.isOnline));
  }
};

// Initialize Network Status
NetworkStatus.init();
