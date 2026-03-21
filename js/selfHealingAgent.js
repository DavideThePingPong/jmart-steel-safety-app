// SelfHealingAgent — Automatically diagnoses and fixes common runtime errors
// Runs on app startup and when errors are caught by ErrorBoundary / window.onerror
// Fixes are applied to localStorage data and app state, then the app is reloaded if needed.

const SelfHealingAgent = {
  _fixesApplied: [],
  _initialized: false,
  _maxAutoReloads: 3,
  _reloadCooldownMs: 30000, // 30 seconds between auto-reloads

  // =========================================================================
  // Known error patterns and their automatic fixes
  // =========================================================================
  _fixPatterns: [
    {
      id: 'corrupted-forms-json',
      match: function(err) {
        return (err.message && (
          err.message.includes('JSON.parse') ||
          err.message.includes('Unexpected token') ||
          err.message.includes('Unexpected end of JSON')
        ) && err.context !== 'non-json');
      },
      fix: function() {
        var keys = ['jmart-safety-forms', 'jmart-forms', 'jmart-backed-up-forms'];
        var fixed = [];
        for (var i = 0; i < keys.length; i++) {
          try {
            var raw = localStorage.getItem(keys[i]);
            if (raw) {
              JSON.parse(raw); // test parse
            }
          } catch (e) {
            localStorage.removeItem(keys[i]);
            fixed.push(keys[i]);
          }
        }
        return fixed.length > 0 ? 'Removed corrupted JSON from: ' + fixed.join(', ') : null;
      }
    },
    {
      id: 'corrupted-sites',
      match: function(err) {
        return err.message && (
          err.message.includes('spread') ||
          err.message.includes('is not iterable') ||
          err.message.includes('Cannot read properties of undefined')
        ) && err.stack && err.stack.includes('sites');
      },
      fix: function() {
        try {
          var raw = localStorage.getItem('jmart-safety-sites');
          if (!raw) return null;
          var parsed = JSON.parse(raw);
          if (!Array.isArray(parsed)) {
            // Sites should be an array of strings
            if (typeof parsed === 'object' && parsed !== null) {
              var recovered = Object.values(parsed).filter(function(v) { return typeof v === 'string'; });
              localStorage.setItem('jmart-safety-sites', JSON.stringify(recovered));
              return 'Recovered ' + recovered.length + ' sites from corrupted object format';
            }
            localStorage.removeItem('jmart-safety-sites');
            return 'Removed corrupted sites data (was not an array)';
          }
          // Check for spread-string corruption: sites like {0:"a",1:"b",...}
          var cleaned = parsed.map(function(site) {
            if (typeof site === 'string') return site;
            if (typeof site === 'object' && site !== null) {
              var keys = Object.keys(site);
              if (keys.every(function(k) { return !isNaN(k); })) {
                return keys.map(function(k) { return site[k]; }).join('');
              }
            }
            return null;
          }).filter(Boolean);
          if (cleaned.length !== parsed.length) {
            localStorage.setItem('jmart-safety-sites', JSON.stringify(cleaned));
            return 'Fixed ' + (parsed.length - cleaned.length) + ' corrupted site entries';
          }
        } catch (e) {
          localStorage.removeItem('jmart-safety-sites');
          return 'Removed corrupted sites data';
        }
        return null;
      }
    },
    {
      id: 'null-device-id',
      match: function(err) {
        return err.message && (
          err.message.includes('device') || err.message.includes('Device')
        ) && (
          err.message.includes('null') || err.message.includes('undefined')
        );
      },
      fix: function() {
        try {
          var deviceId = localStorage.getItem('jmart-device-id');
          if (!deviceId || deviceId === 'null' || deviceId === 'undefined' || deviceId.length < 5) {
            localStorage.removeItem('jmart-device-id');
            return 'Cleared corrupted device ID — will regenerate on next load';
          }
        } catch (e) { }
        return null;
      }
    },
    {
      id: 'stale-service-worker',
      match: function(err) {
        return err.message && (
          err.message.includes('is not defined') ||
          err.message.includes('is not a function') ||
          err.message.includes('Cannot read properties of undefined (reading')
        ) && err.source && err.source.includes('app');
      },
      fix: function() {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then(function(registrations) {
            registrations.forEach(function(reg) { reg.unregister(); });
          });
          if (caches && caches.keys) {
            caches.keys().then(function(names) {
              names.forEach(function(name) { caches.delete(name); });
            });
          }
          return 'Cleared stale service worker and caches — will reinstall on reload';
        }
        return null;
      }
    },
    {
      id: 'corrupted-signatures',
      match: function(err) {
        return err.message && err.stack && (
          err.stack.includes('signature') || err.stack.includes('Signature')
        );
      },
      fix: function() {
        try {
          var raw = localStorage.getItem('jmart-saved-signatures');
          if (raw) {
            var parsed = JSON.parse(raw);
            if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
              localStorage.removeItem('jmart-saved-signatures');
              return 'Removed corrupted signatures data';
            }
          }
        } catch (e) {
          localStorage.removeItem('jmart-saved-signatures');
          return 'Removed corrupted signatures JSON';
        }
        return null;
      }
    },
    {
      id: 'form-data-null',
      match: function(err) {
        return err.message && (
          err.message.includes("Cannot read properties of null (reading 'date')") ||
          err.message.includes("Cannot read properties of null (reading 'type')") ||
          err.message.includes("Cannot read properties of null (reading 'site')")
        );
      },
      fix: function() {
        try {
          var raw = localStorage.getItem('jmart-safety-forms');
          if (!raw) return null;
          var forms = JSON.parse(raw);
          if (!Array.isArray(forms)) return null;
          var before = forms.length;
          var fixed = forms.filter(function(f) {
            return f && f.data && typeof f.data === 'object';
          });
          if (fixed.length < before) {
            localStorage.setItem('jmart-safety-forms', JSON.stringify(fixed));
            return 'Removed ' + (before - fixed.length) + ' forms with missing data fields';
          }
        } catch (e) { }
        return null;
      }
    },
    {
      id: 'firebase-loop',
      match: function(err) {
        return err.message && (
          err.message.includes('Maximum call stack') ||
          err.message.includes('too much recursion')
        );
      },
      fix: function() {
        // Clear sync flags to break feedback loops
        try {
          localStorage.removeItem('jmart-sync-in-progress');
          localStorage.removeItem('jmart-firebase-listener-active');
          return 'Cleared sync loop flags — will restart cleanly on reload';
        } catch (e) { }
        return null;
      }
    }
  ],

  // =========================================================================
  // Init — run startup health check
  // =========================================================================
  init: function() {
    if (this._initialized) return;
    this._initialized = true;

    // Load fix history
    try {
      var history = localStorage.getItem('jmart-selfheal-history');
      if (history) this._fixesApplied = JSON.parse(history);
    } catch (e) { this._fixesApplied = []; }

    // Run startup health check (proactive — fix known issues before they crash)
    this._startupHealthCheck();

    console.log('[SelfHealingAgent] Initialized');
  },

  // =========================================================================
  // Startup health check — proactively fix known data issues
  // =========================================================================
  _startupHealthCheck: function() {
    var fixes = [];

    // Check all localStorage JSON keys for corruption
    var jsonKeys = [
      'jmart-safety-forms', 'jmart-forms', 'jmart-backed-up-forms',
      'jmart-safety-sites', 'jmart-saved-signatures', 'jmart-error-log',
      'jmart-saved-recordings'
    ];

    for (var i = 0; i < jsonKeys.length; i++) {
      try {
        var raw = localStorage.getItem(jsonKeys[i]);
        if (raw) JSON.parse(raw);
      } catch (e) {
        localStorage.removeItem(jsonKeys[i]);
        fixes.push('Removed corrupted ' + jsonKeys[i]);
      }
    }

    // Check device ID
    try {
      var deviceId = localStorage.getItem('jmart-device-id');
      if (deviceId === 'null' || deviceId === 'undefined') {
        localStorage.removeItem('jmart-device-id');
        fixes.push('Cleared invalid device ID');
      }
    } catch (e) { }

    // Check forms have valid data
    try {
      var formsRaw = localStorage.getItem('jmart-safety-forms');
      if (formsRaw) {
        var forms = JSON.parse(formsRaw);
        if (Array.isArray(forms)) {
          var validForms = forms.filter(function(f) {
            return f && typeof f === 'object' && f.data && typeof f.data === 'object';
          });
          if (validForms.length < forms.length) {
            localStorage.setItem('jmart-safety-forms', JSON.stringify(validForms));
            fixes.push('Removed ' + (forms.length - validForms.length) + ' invalid forms');
          }
        }
      }
    } catch (e) { }

    if (fixes.length > 0) {
      this._recordFixes('startup-health-check', fixes);
      console.log('[SelfHealingAgent] Startup fixes:', fixes);
    }
  },

  // =========================================================================
  // diagnoseAndFix — called when an error is caught
  // Returns { fixed: boolean, fixes: string[], needsReload: boolean }
  // =========================================================================
  diagnoseAndFix: function(error) {
    if (!error) return { fixed: false, fixes: [], needsReload: false };

    var errorObj = {
      message: error.message || String(error),
      stack: error.stack || '',
      source: error.source || error.filename || '',
      context: error.context || ''
    };

    var fixes = [];
    var needsReload = false;

    for (var i = 0; i < this._fixPatterns.length; i++) {
      var pattern = this._fixPatterns[i];
      try {
        if (pattern.match(errorObj)) {
          var result = pattern.fix();
          if (result) {
            fixes.push({ id: pattern.id, description: result });
            needsReload = true;
          }
        }
      } catch (fixError) {
        console.warn('[SelfHealingAgent] Fix pattern "' + pattern.id + '" threw:', fixError.message);
      }
    }

    if (fixes.length > 0) {
      this._recordFixes(errorObj.message, fixes);

      // Auto-reload if safe (not too many recent reloads)
      if (needsReload && this._canAutoReload()) {
        this._scheduleReload(fixes);
      }
    }

    return {
      fixed: fixes.length > 0,
      fixes: fixes.map(function(f) { return f.description; }),
      needsReload: needsReload
    };
  },

  // =========================================================================
  // Reload safety — prevent infinite reload loops
  // =========================================================================
  _canAutoReload: function() {
    try {
      var reloadLog = JSON.parse(localStorage.getItem('jmart-selfheal-reloads') || '[]');
      var now = Date.now();

      // Remove entries older than cooldown
      reloadLog = reloadLog.filter(function(ts) {
        return (now - ts) < 60000; // last 60 seconds
      });

      if (reloadLog.length >= this._maxAutoReloads) {
        console.warn('[SelfHealingAgent] Too many recent reloads (' + reloadLog.length + ') — skipping auto-reload');
        return false;
      }

      // Check cooldown since last reload
      if (reloadLog.length > 0 && (now - reloadLog[reloadLog.length - 1]) < this._reloadCooldownMs) {
        return false;
      }

      return true;
    } catch (e) {
      return false;
    }
  },

  _scheduleReload: function(fixes) {
    try {
      var reloadLog = JSON.parse(localStorage.getItem('jmart-selfheal-reloads') || '[]');
      reloadLog.push(Date.now());
      localStorage.setItem('jmart-selfheal-reloads', JSON.stringify(reloadLog));

      // Store what was fixed so we can show the user after reload
      localStorage.setItem('jmart-selfheal-last-fix', JSON.stringify({
        fixes: fixes,
        timestamp: Date.now()
      }));
    } catch (e) { }

    // Reload after a short delay (let error UI flash briefly)
    setTimeout(function() {
      window.location.reload();
    }, 1500);
  },

  // =========================================================================
  // Record fixes to history
  // =========================================================================
  _recordFixes: function(trigger, fixes) {
    var entry = {
      trigger: (trigger || '').substring(0, 200),
      fixes: fixes,
      timestamp: Date.now()
    };

    this._fixesApplied.push(entry);

    // Keep last 50
    if (this._fixesApplied.length > 50) {
      this._fixesApplied = this._fixesApplied.slice(-50);
    }

    try {
      localStorage.setItem('jmart-selfheal-history', JSON.stringify(this._fixesApplied));
    } catch (e) { }

    // Log to audit trail
    if (typeof AuditLogManager !== 'undefined') {
      try {
        AuditLogManager.log('self_heal', entry);
      } catch (e) { }
    }
  },

  // =========================================================================
  // Show post-reload fix notification
  // =========================================================================
  showFixNotification: function() {
    try {
      var lastFix = localStorage.getItem('jmart-selfheal-last-fix');
      if (!lastFix) return;

      var data = JSON.parse(lastFix);
      // Only show if fix was recent (last 10 seconds)
      if (Date.now() - data.timestamp > 10000) {
        localStorage.removeItem('jmart-selfheal-last-fix');
        return;
      }

      localStorage.removeItem('jmart-selfheal-last-fix');

      var messages = data.fixes.map(function(f) { return f.description || f; });
      var msg = 'Auto-fixed: ' + messages.join('; ');

      if (typeof ToastNotifier !== 'undefined' && ToastNotifier.success) {
        ToastNotifier.success(msg);
      }
      console.log('[SelfHealingAgent] Post-reload notification:', msg);
    } catch (e) { }
  },

  // =========================================================================
  // Public API
  // =========================================================================
  getFixHistory: function() {
    return this._fixesApplied.slice().reverse();
  },

  getFixCount: function() {
    return this._fixesApplied.length;
  }
};

// Auto-init
SelfHealingAgent.init();
