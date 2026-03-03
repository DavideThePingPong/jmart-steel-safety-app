// Storage Quota Manager
// Extracted from index.html for maintainability
// ========================================
// STORAGE QUOTA MANAGER
// ========================================
// Monitors localStorage usage and warns users before quota is exceeded
const StorageQuotaManager = {
  MAX_STORAGE_MB: 5, // localStorage limit is typically 5-10MB
  WARNING_THRESHOLD: 0.8, // Warn at 80% usage
  listeners: [],

  // Calculate current storage usage
  getUsage: function() {
    let totalBytes = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        totalBytes += localStorage[key].length * 2; // UTF-16 = 2 bytes per char
      }
    }
    const totalMB = totalBytes / (1024 * 1024);
    const percentUsed = (totalMB / this.MAX_STORAGE_MB) * 100;
    return {
      bytes: totalBytes,
      megabytes: totalMB.toFixed(2),
      percentUsed: percentUsed.toFixed(1),
      isWarning: percentUsed >= (this.WARNING_THRESHOLD * 100),
      isCritical: percentUsed >= 95
    };
  },

  // Check if we can safely store data of given size
  canStore: function(dataString) {
    const dataBytes = dataString.length * 2;
    const usage = this.getUsage();
    const projectedMB = (usage.bytes + dataBytes) / (1024 * 1024);
    return projectedMB < this.MAX_STORAGE_MB;
  },

  // Notify listeners of storage changes
  notifyListeners: function(usage) {
    this.listeners.forEach(cb => cb(usage));
  },

  // Add listener for storage updates
  onStorageChange: function(callback) {
    this.listeners.push(callback);
    // Immediately call with current usage
    callback(this.getUsage());
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  },

  // Recursively strip base64 data from any object (photos, attachments, etc.)
  _stripDeep: function(obj, depth) {
    if (!obj || typeof obj !== 'object' || depth > 10) return 0;
    var stripped = 0;
    var keys = Array.isArray(obj) ? obj.map(function(_, i) { return i; }) : Object.keys(obj);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var val = obj[key];
      if (typeof val === 'string' && val.length > 1000 &&
          (val.indexOf('data:image') === 0 || val.indexOf('data:application') === 0 || val.indexOf('/9j/') === 0 || val.indexOf('iVBOR') === 0)) {
        obj[key] = '[stripped]';
        stripped++;
      } else if (val && typeof val === 'object') {
        stripped += this._stripDeep(val, depth + 1);
      }
    }
    return stripped;
  },

  // Strip base64 photo data from forms to free space (keeps form metadata)
  stripPhotosFromForms: function() {
    var stripped = 0;
    try {
      var formsRaw = localStorage.getItem('jmart-safety-forms');
      if (!formsRaw || formsRaw.length < 50000) return stripped; // Only if forms are big
      var forms = JSON.parse(formsRaw);
      stripped = this._stripDeep(forms, 0);
      if (stripped > 0) {
        localStorage.setItem('jmart-safety-forms', JSON.stringify(forms));
        console.log('Stripped ' + stripped + ' base64 items from forms to free space');
      }
    } catch (e) {
      console.error('Error stripping photos:', e);
    }
    return stripped;
  },

  // Clean up old/unnecessary data to free space (prioritized)
  cleanup: function() {
    const keysToRemove = [];
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);

    // Priority 1: temp/cache keys (lowest value)
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('temp') || key.includes('cache'))) {
        keysToRemove.push(key);
      }
    }

    // Priority 2: backup keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes('backup') && keysToRemove.indexOf(key) === -1) {
        keysToRemove.push(key);
      }
    }

    // Priority 3: trim old backed-up form tracking (> 30 days)
    try {
      const backedUp = JSON.parse(localStorage.getItem('jmart-backed-up-forms') || '{}');
      const recentBackups = {};
      Object.entries(backedUp).forEach(([id, timestamp]) => {
        if (new Date(timestamp).getTime() > thirtyDaysAgo) {
          recentBackups[id] = timestamp;
        }
      });
      localStorage.setItem('jmart-backed-up-forms', JSON.stringify(recentBackups));
    } catch (e) {
      console.error('Error cleaning backup records:', e);
    }

    // Priority 4: trim old sync queue entries (> 7 days)
    try {
      const queue = JSON.parse(localStorage.getItem('jmart-sync-queue') || '[]');
      const recent = queue.filter(function(item) {
        return item.timestamp && (new Date(item.timestamp).getTime() > sevenDaysAgo);
      });
      if (recent.length < queue.length) {
        localStorage.setItem('jmart-sync-queue', JSON.stringify(recent));
        console.log('Trimmed sync queue: ' + (queue.length - recent.length) + ' old entries removed');
      }
    } catch (e) { /* non-fatal */ }

    // Priority 5: trim local audit log (keep last 200)
    try {
      const audit = JSON.parse(localStorage.getItem('jmart-audit-log') || '[]');
      if (audit.length > 200) {
        localStorage.setItem('jmart-audit-log', JSON.stringify(audit.slice(-200)));
        console.log('Trimmed audit log: ' + (audit.length - 200) + ' old entries removed');
      }
    } catch (e) { /* non-fatal */ }

    // Remove identified keys
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
        console.log('Cleaned up storage key:', key);
      } catch (e) {
        console.error('Error removing key:', key, e);
      }
    });

    // Priority 6: If still over 90%, strip base64 photos from forms
    var usageAfter = this.getUsage();
    if (parseFloat(usageAfter.percentUsed) > 90) {
      console.warn('Storage still at ' + usageAfter.percentUsed + '% after basic cleanup — stripping photos');
      this.stripPhotosFromForms();
    }

    const freed = keysToRemove.length;
    console.log('Storage cleanup complete: removed ' + freed + ' items');
    this.notifyListeners(this.getUsage());
    return { cleaned: freed, usage: this.getUsage() };
  },

  // Safe save with quota handling
  safeSave: function(key, data) {
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);

    if (!this.canStore(dataString)) {
      // Try cleanup first
      this.cleanup();

      if (!this.canStore(dataString)) {
        // Still can't fit - notify user
        const usage = this.getUsage();
        console.error('Storage quota exceeded! Usage:', usage.megabytes, 'MB');
        this.notifyListeners({ ...usage, error: 'quota_exceeded' });
        throw new Error('Storage quota exceeded. Please delete old forms or backup to Google Drive.');
      }
    }

    try {
      // Use _origSetItem if available to avoid re-entering the patched setItem
      const setter = this._origSetItem ? this._origSetItem.bind(this, key, dataString) : () => localStorage.setItem(key, dataString);
      setter();
      const usage = this.getUsage();
      if (usage.isWarning) {
        this.notifyListeners(usage);
      }
      return true;
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        this.cleanup();
        // One more try after cleanup
        const setter = this._origSetItem ? this._origSetItem.bind(this, key, dataString) : () => localStorage.setItem(key, dataString);
        setter();
        return true;
      }
      throw e;
    }
  }
};

// Wire up StorageQuotaManager: patch localStorage.setItem for global quota protection
(function() {
  const _origSetItem = Storage.prototype.setItem;
  // Update safeSave to use original method (avoids recursion after patch)
  StorageQuotaManager._origSetItem = function(key, value) {
    _origSetItem.call(localStorage, key, value);
  };
  // Patch localStorage.setItem globally for quota awareness
  Storage.prototype.setItem = function(key, value) {
    try {
      _origSetItem.call(this, key, value);
      // After write, check if we're getting close to the limit
      if (this === localStorage) {
        var usage = StorageQuotaManager.getUsage();
        if (usage.isWarning) {
          StorageQuotaManager.notifyListeners(usage);
        }
      }
    } catch (e) {
      // Only handle genuine QuotaExceededError on localStorage
      if (this === localStorage && (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014)) {
        var currentUsage = StorageQuotaManager.getUsage();
        console.error('[StorageQuotaManager] Quota error on key:', key,
          '| Usage:', currentUsage.megabytes, 'MB (' + currentUsage.percentUsed + '%)',
          '| Error:', e.name, e.message);

        // Only attempt cleanup if storage is actually getting full (>50%)
        if (parseFloat(currentUsage.percentUsed) > 50) {
          StorageQuotaManager.cleanup();
          try {
            _origSetItem.call(this, key, value);
            return; // Success after cleanup
          } catch (e2) {
            if (e2.name === 'QuotaExceededError' || e2.code === 22 || e2.code === 1014) {
              StorageQuotaManager.notifyListeners({ error: 'quota_exceeded', ...StorageQuotaManager.getUsage() });
              throw new Error('Storage full! Please connect Google Drive to back up forms, then clear old data in Settings.');
            }
            // Non-quota error on retry — re-throw original error, not a misleading "Storage full!" message
            console.error('[StorageQuotaManager] Non-quota error on retry:', e2.name, e2.message);
            throw e2;
          }
        } else {
          // Storage is NOT full but browser threw QuotaExceededError (e.g., private browsing, security restriction)
          console.warn('[StorageQuotaManager] QuotaExceededError at only ' + currentUsage.percentUsed + '% usage — likely browser restriction, not actual quota. Key:', key);
          // Re-throw with a more accurate message
          throw e;
        }
      } else {
        // Non-quota error — re-throw as-is (do NOT wrap in "Storage full!")
        throw e;
      }
    }
  };
})();

// EMERGENCY AUTO-CLEANUP ON BOOT
// If storage is over 90%, run cleanup immediately before auth or anything else tries to write
(function() {
  try {
    var usage = StorageQuotaManager.getUsage();
    if (parseFloat(usage.percentUsed) > 90) {
      console.warn('[BOOT] Storage at ' + usage.percentUsed + '% — running emergency cleanup before app init');
      StorageQuotaManager.cleanup();
      var after = StorageQuotaManager.getUsage();
      console.log('[BOOT] Post-cleanup storage: ' + after.percentUsed + '% (' + after.megabytes + ' MB)');
    }
  } catch (e) {
    console.error('[BOOT] Emergency cleanup failed:', e);
  }
})();
