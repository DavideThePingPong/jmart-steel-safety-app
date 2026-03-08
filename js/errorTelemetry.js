// ErrorTelemetry — Central error capture, persistence, and health monitoring
// Captures window.onerror + onunhandledrejection, persists to localStorage + Firebase,
// rate-limits toast notifications, and exposes system health status.

const ErrorTelemetry = {
  // Ring buffer (in-memory)
  _errors: [],
  MAX_MEMORY: 50,
  MAX_LOCAL: 20,

  // Toast rate limiting
  _lastToastTime: 0,
  TOAST_COOLDOWN_MS: 10000,  // max 1 error toast per 10 seconds

  // Firebase sync rate limiting
  _lastSyncTime: 0,
  _pendingSyncBatch: [],
  SYNC_COOLDOWN_MS: 30000,   // max 1 Firebase write per 30 seconds
  _syncTimer: null,

  // Error rate tracking
  _hourlyBuckets: [],  // array of {minute, count} for rolling 60-minute window

  // Initialization flag
  _initialized: false,

  // =========================================================================
  // Init — install global handlers, import bootstrap errors
  // =========================================================================
  init: function() {
    if (this._initialized) return;
    this._initialized = true;

    // Load any persisted errors from localStorage
    try {
      var saved = localStorage.getItem('jmart-error-log');
      if (saved) {
        var parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          this._errors = parsed.slice(-this.MAX_MEMORY);
        }
      }
    } catch (e) { /* ignore corrupt data */ }

    // Import pre-existing bootstrap errors (collected before this script loaded)
    if (Array.isArray(window.__appErrors) && window.__appErrors.length > 0) {
      for (var i = 0; i < window.__appErrors.length; i++) {
        var be = window.__appErrors[i];
        this._addToBuffer({
          message: be.msg || 'Unknown error',
          source: be.src || 'bootstrap',
          context: 'global',
          stack: be.stack || '',
          timestamp: be.ts || Date.now()
        });
      }
      window.__appErrors = [];  // Clear — ErrorTelemetry owns them now
    }

    // Install global handlers
    this._installGlobalHandlers();

    console.log('[ErrorTelemetry] Initialized —', this._errors.length, 'errors in buffer');
  },

  // =========================================================================
  // Install window.onerror and window.onunhandledrejection
  // =========================================================================
  _installGlobalHandlers: function() {
    var self = this;

    window.onerror = function(msg, src, line, col, err) {
      self.captureError({
        message: msg || 'Unknown error',
        source: src ? (src + ':' + line + ':' + col) : 'unknown',
        stack: err && err.stack ? err.stack.substring(0, 500) : '',
        context: 'global'
      });
      return false;  // Let browser also log it
    };

    window.onunhandledrejection = function(event) {
      var reason = event.reason;
      var msg = reason instanceof Error ? reason.message : String(reason || 'Unknown rejection');
      var stack = reason && reason.stack ? reason.stack.substring(0, 500) : '';
      self.captureError({
        message: 'Unhandled rejection: ' + msg,
        source: 'promise',
        stack: stack,
        context: 'unhandled-rejection'
      });
    };
  },

  // =========================================================================
  // captureError — Core: record error from any source
  // =========================================================================
  captureError: function(errorOrMessage, context) {
    var entry;

    if (typeof errorOrMessage === 'string') {
      entry = { message: errorOrMessage, source: '', stack: '', context: context || 'unknown', timestamp: Date.now() };
    } else if (errorOrMessage instanceof Error) {
      entry = {
        message: errorOrMessage.message,
        source: '',
        stack: errorOrMessage.stack ? errorOrMessage.stack.substring(0, 500) : '',
        context: context || 'unknown',
        timestamp: Date.now()
      };
    } else if (errorOrMessage && typeof errorOrMessage === 'object') {
      entry = {
        message: errorOrMessage.message || 'Unknown error',
        source: errorOrMessage.source || '',
        stack: errorOrMessage.stack || '',
        context: errorOrMessage.context || context || 'unknown',
        timestamp: errorOrMessage.timestamp || Date.now()
      };
    } else {
      entry = { message: String(errorOrMessage), source: '', stack: '', context: context || 'unknown', timestamp: Date.now() };
    }

    // Add to ring buffer
    this._addToBuffer(entry);

    // Bump rate counters
    this._bumpRateCounters();

    // Persist to localStorage
    this._persistToLocal();

    // Rate-limited toast
    this._maybeToast(entry.message);

    // Queue for Firebase sync
    this._scheduleSyncToFirebase(entry);

    console.error('[ErrorTelemetry]', entry.context + ':', entry.message);
  },

  // =========================================================================
  // Ring buffer management
  // =========================================================================
  _addToBuffer: function(entry) {
    this._errors.push(entry);
    if (this._errors.length > this.MAX_MEMORY) {
      this._errors = this._errors.slice(-this.MAX_MEMORY);
    }
  },

  // =========================================================================
  // Toast rate limiting
  // =========================================================================
  _maybeToast: function(message) {
    var now = Date.now();
    if (now - this._lastToastTime < this.TOAST_COOLDOWN_MS) return;
    this._lastToastTime = now;

    if (typeof ToastNotifier !== 'undefined' && ToastNotifier.error) {
      ToastNotifier.error(message);
    }
  },

  // =========================================================================
  // localStorage persistence
  // =========================================================================
  _persistToLocal: function() {
    try {
      var toSave = this._errors.slice(-this.MAX_LOCAL);
      localStorage.setItem('jmart-error-log', JSON.stringify(toSave));
    } catch (e) {
      // localStorage full — drop silently, errors are still in memory
    }
  },

  // =========================================================================
  // Firebase sync (rate-limited, batched)
  // =========================================================================
  _scheduleSyncToFirebase: function(entry) {
    this._pendingSyncBatch.push({
      msg: (entry.message || '').substring(0, 200),
      ctx: entry.context || '',
      ts: entry.timestamp || Date.now()
    });

    // If we already have a pending timer, let it handle the batch
    if (this._syncTimer) return;

    var self = this;
    var delay = Math.max(0, this.SYNC_COOLDOWN_MS - (Date.now() - this._lastSyncTime));

    if (typeof IntervalRegistry !== 'undefined' && IntervalRegistry.setTimeout) {
      this._syncTimer = IntervalRegistry.setTimeout(function() { self._syncToFirebase(); }, delay);
    } else {
      this._syncTimer = setTimeout(function() { self._syncToFirebase(); }, delay);
    }
  },

  _syncToFirebase: function() {
    this._syncTimer = null;
    this._lastSyncTime = Date.now();

    // Guard: need Firebase
    if (typeof isFirebaseConfigured === 'undefined' || !isFirebaseConfigured) return;
    if (typeof firebaseDb === 'undefined' || !firebaseDb) return;

    var batch = this._pendingSyncBatch.splice(0);
    if (batch.length === 0) return;

    var deviceId = 'unknown';
    if (typeof DeviceAuthManager !== 'undefined' && DeviceAuthManager.deviceId) {
      deviceId = DeviceAuthManager.deviceId;
    }

    var key = Date.now().toString(36);
    var payload = {
      device: deviceId,
      errors: batch,
      count: batch.length,
      timestamp: Date.now()
    };

    try {
      firebaseDb.ref('jmart-safety/errors/' + deviceId + '/' + key).set(payload);
    } catch (e) {
      // Firebase write failed — drop silently, errors are still in localStorage
      console.warn('[ErrorTelemetry] Firebase sync failed:', e.message);
    }
  },

  // =========================================================================
  // Error rate tracking
  // =========================================================================
  _bumpRateCounters: function() {
    var now = Date.now();
    var currentMinute = Math.floor(now / 60000);

    // Find or create bucket for this minute
    var lastBucket = this._hourlyBuckets.length > 0 ? this._hourlyBuckets[this._hourlyBuckets.length - 1] : null;
    if (lastBucket && lastBucket.minute === currentMinute) {
      lastBucket.count++;
    } else {
      this._hourlyBuckets.push({ minute: currentMinute, count: 1 });
    }

    // Trim to last 60 minutes
    var cutoff = currentMinute - 60;
    while (this._hourlyBuckets.length > 0 && this._hourlyBuckets[0].minute < cutoff) {
      this._hourlyBuckets.shift();
    }
  },

  _getErrorsLastHour: function() {
    var total = 0;
    for (var i = 0; i < this._hourlyBuckets.length; i++) {
      total += this._hourlyBuckets[i].count;
    }
    return total;
  },

  // =========================================================================
  // Public API
  // =========================================================================

  getRecentErrors: function(limit) {
    var n = limit || 20;
    return this._errors.slice(-n).reverse();
  },

  getHealth: function() {
    var errorsLastHour = this._getErrorsLastHour();

    var circuitBreakerState = 'closed';
    if (typeof FirebaseSync !== 'undefined') {
      circuitBreakerState = FirebaseSync.circuitOpen ? 'open' : 'closed';
    }

    var syncQueueSize = 0;
    if (typeof FirebaseSync !== 'undefined' && FirebaseSync.getPendingCount) {
      syncQueueSize = FirebaseSync.getPendingCount();
    }

    var lastSyncTime = null;
    try {
      var ls = localStorage.getItem('jmart-last-sync');
      if (ls) lastSyncTime = parseInt(ls, 10) || null;
    } catch (e) { /* ignore */ }

    var status = 'healthy';
    if (errorsLastHour > 20 || circuitBreakerState === 'open') {
      status = 'critical';
    } else if (errorsLastHour >= 5) {
      status = 'degraded';
    }

    return {
      status: status,
      errorsLastHour: errorsLastHour,
      totalErrors: this._errors.length,
      circuitBreakerState: circuitBreakerState,
      syncQueueSize: syncQueueSize,
      lastSyncTime: lastSyncTime
    };
  },

  getErrorCount: function() {
    return this._errors.length;
  }
};

// Auto-init
ErrorTelemetry.init();
