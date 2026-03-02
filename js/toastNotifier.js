// ========================================
// TOAST NOTIFICATION SYSTEM
// Global notification UI for sync status, errors, warnings
// Renders auto-dismissing toasts at the top of the screen
// ========================================
const ToastNotifier = {
  container: null,
  toasts: [],
  maxVisible: 3,

  // Initialize — creates the container element
  init: function() {
    if (this.container) return;
    this.container = document.createElement('div');
    this.container.id = 'jmart-toast-container';
    this.container.style.cssText = 'position:fixed;top:env(safe-area-inset-top,12px);left:50%;transform:translateX(-50%);z-index:99999;display:flex;flex-direction:column;gap:8px;pointer-events:none;width:92%;max-width:420px;padding-top:12px;';
    document.body.appendChild(this.container);
  },

  // Show a toast
  // type: 'success' | 'error' | 'warning' | 'info' | 'sync'
  // message: string
  // options: { duration, action, actionLabel }
  show: function(type, message, options) {
    this.init();
    options = options || {};
    var duration = options.duration || (type === 'error' ? 6000 : 3500);

    var toast = document.createElement('div');
    var icons = { success: '\u2705', error: '\u274C', warning: '\u26A0\uFE0F', info: '\u2139\uFE0F', sync: '\uD83D\uDD04' };
    var bgColors = {
      success: 'rgba(16,185,129,0.95)',
      error: 'rgba(239,68,68,0.95)',
      warning: 'rgba(245,158,11,0.95)',
      info: 'rgba(59,130,246,0.95)',
      sync: 'rgba(99,102,241,0.95)'
    };

    toast.style.cssText = 'background:' + (bgColors[type] || bgColors.info) + ';color:#fff;padding:12px 16px;border-radius:10px;font-size:14px;font-family:system-ui,sans-serif;display:flex;align-items:center;gap:8px;pointer-events:auto;box-shadow:0 4px 12px rgba(0,0,0,0.3);backdrop-filter:blur(8px);opacity:0;transform:translateY(-20px);transition:all 0.3s ease;cursor:pointer;';

    var iconSpan = document.createElement('span');
    iconSpan.style.cssText = 'font-size:16px;flex-shrink:0;';
    iconSpan.textContent = icons[type] || icons.info;

    var textSpan = document.createElement('span');
    textSpan.style.cssText = 'flex:1;line-height:1.3;';
    textSpan.textContent = message;

    toast.appendChild(iconSpan);
    toast.appendChild(textSpan);

    // Optional action button
    if (options.action && options.actionLabel) {
      var btn = document.createElement('button');
      btn.textContent = options.actionLabel;
      btn.style.cssText = 'background:rgba(255,255,255,0.25);border:none;color:#fff;padding:4px 10px;border-radius:6px;font-size:12px;cursor:pointer;flex-shrink:0;font-weight:600;';
      btn.onclick = function(e) {
        e.stopPropagation();
        options.action();
        self.dismiss(toast);
      };
      toast.appendChild(btn);
    }

    this.container.appendChild(toast);
    this.toasts.push(toast);

    // Trim excess toasts
    while (this.toasts.length > this.maxVisible) {
      this.dismiss(this.toasts[0]);
    }

    // Animate in
    requestAnimationFrame(function() {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });

    // Click to dismiss
    var self = this;
    toast.onclick = function() { self.dismiss(toast); };

    // Auto dismiss
    var timer = setTimeout(function() { self.dismiss(toast); }, duration);
    toast._timer = timer;

    return toast;
  },

  dismiss: function(toast) {
    if (!toast || !toast.parentNode) return;
    clearTimeout(toast._timer);
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-20px)';
    var self = this;
    setTimeout(function() {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
      self.toasts = self.toasts.filter(function(t) { return t !== toast; });
    }, 300);
  },

  // Convenience methods
  success: function(msg, opts) { return this.show('success', msg, opts); },
  error: function(msg, opts) { return this.show('error', msg, opts); },
  warning: function(msg, opts) { return this.show('warning', msg, opts); },
  info: function(msg, opts) { return this.show('info', msg, opts); },
  sync: function(msg, opts) { return this.show('sync', msg, opts); },

  // Wire up to FirebaseSync for automatic notifications
  wireFirebaseSync: function() {
    if (typeof FirebaseSync === 'undefined') return;
    var self = this;
    FirebaseSync.onSyncStatusChange(function(status, details) {
      switch (status) {
        case 'synced':
          if (details && details.pending === 0) {
            self.success('All forms synced');
          }
          break;
        case 'error':
          self.error('Sync failed — will retry automatically');
          break;
        case 'failed':
          self.error('Sync failed after max retries. Check connection.', {
            actionLabel: 'Retry',
            action: function() { FirebaseSync.retryAll(); }
          });
          break;
        case 'circuit_open':
          self.warning('Sync paused — storage issue detected. Retrying in 5 min.', {
            duration: 8000,
            actionLabel: 'Reset',
            action: function() { FirebaseSync.resetCircuitBreaker(); }
          });
          break;
        case 'circuit_reset':
          self.info('Sync resumed');
          break;
      }
    });
  },

  // Wire up to StorageQuotaManager
  wireStorageQuota: function() {
    if (typeof StorageQuotaManager === 'undefined') return;
    var self = this;
    var warned = false;
    StorageQuotaManager.onStorageChange(function(usage) {
      if (usage.error === 'quota_exceeded') {
        self.error('Storage full! Connect Google Drive to back up forms.', { duration: 10000 });
      } else if (usage.isCritical && !warned) {
        warned = true;
        self.warning('Storage almost full (' + usage.percentUsed + '%). Back up to Google Drive soon.', { duration: 8000 });
      } else if (usage.isWarning && !warned) {
        warned = true;
        self.info('Storage at ' + usage.percentUsed + '% capacity');
      }
    });
  },

  // Wire up to NetworkStatus
  wireNetworkStatus: function() {
    if (typeof NetworkStatus === 'undefined') return;
    var self = this;
    var wasOffline = false;
    NetworkStatus.subscribe(function(isOnline) {
      if (!isOnline) {
        wasOffline = true;
        self.warning('Offline — forms will save locally and sync when connected');
      } else if (wasOffline) {
        wasOffline = false;
        self.success('Back online — syncing forms');
      }
    });
  },

  // Connect all systems
  wireAll: function() {
    this.wireFirebaseSync();
    this.wireStorageQuota();
    this.wireNetworkStatus();
  }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() { ToastNotifier.init(); });
} else {
  ToastNotifier.init();
}

// Wire up after a short delay to let other modules load
setTimeout(function() { ToastNotifier.wireAll(); }, 2000);
