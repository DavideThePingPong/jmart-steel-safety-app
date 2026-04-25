// Audit Log Manager
// Extracted from index.html for maintainability
// ========================================
// AUDIT LOG MANAGER
// ========================================
// Tracks all form operations for compliance
const AuditLogManager = {
  // Deep sanitizer: recursively replace undefined with null for Firebase
  _sanitize: function(obj) {
    if (obj === undefined) return null;
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(function(v) { return AuditLogManager._sanitize(v); });
    var clean = {};
    Object.keys(obj).forEach(function(k) {
      clean[k] = AuditLogManager._sanitize(obj[k]);
    });
    return clean;
  },

  // Log an action
  log: async function(action, details) {
    var logEntry = {
      id: Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9),
      action: action || 'unknown',
      deviceId: (typeof DeviceAuthManager !== 'undefined' && DeviceAuthManager.deviceId) ? DeviceAuthManager.deviceId : 'unknown',
      userName: localStorage.getItem('jmart-user-name') || 'Unknown User',
      timestamp: Date.now(), // Must be number for Firebase validation rules
      timestampISO: new Date().toISOString(), // Human-readable version
      details: this._sanitize(details || {})
    };

    // Save to local audit log — capped at 200 entries AND 200KB
    // The audit log is a compliance trail, NOT a primary data store.
    // Full history lives in Firebase. Local copy is just for quick offline viewing.
    try {
      var localLog = JSON.parse(localStorage.getItem('jmart-audit-log') || '[]');
      localLog.push(logEntry);
      // Cap by count (was 1000 — way too many, caused ~500KB of localStorage usage)
      if (localLog.length > 200) {
        localLog = localLog.slice(-200);
      }
      // Cap by byte size (200KB max — shares 5MB localStorage with forms, photos, etc.)
      var json = JSON.stringify(localLog);
      while (json.length > 200000 && localLog.length > 10) {
        localLog = localLog.slice(-Math.floor(localLog.length * 0.7));
        json = JSON.stringify(localLog);
      }
      localStorage.setItem('jmart-audit-log', json);
    } catch (e) {
      console.error('Error saving audit log locally:', e);
      if (typeof ErrorTelemetry !== 'undefined') ErrorTelemetry.captureError(e, 'audit-local');
    }

    // Sync to Firebase via the retry queue so offline / auth-not-yet-ready
    // entries don't silently disappear (local cap is 200 entries, so a stuck
    // direct-write entry would eventually rotate out without ever syncing).
    // FirebaseSync.syncAuditEntry handles auth-wait, queueing, and retry.
    if (typeof FirebaseSync !== 'undefined' && typeof FirebaseSync.syncAuditEntry === 'function') {
      try {
        FirebaseSync.syncAuditEntry(this._sanitize(logEntry)).catch(function(e) {
          console.warn('Audit entry queued for retry:', e && e.message);
        });
      } catch (e) {
        console.error('Audit sync setup failed:', e);
        if (typeof ErrorTelemetry !== 'undefined') ErrorTelemetry.captureError(e, 'audit-firebase');
      }
    } else if (typeof firebaseDb !== 'undefined' && firebaseDb && typeof isFirebaseConfigured !== 'undefined' && isFirebaseConfigured) {
      // Fallback for very early audit writes before FirebaseSync loads — best
      // effort direct write. The retry queue takes over once FirebaseSync is up.
      try {
        await firebaseDb.ref('jmart-safety/auditLog/' + logEntry.id).set(this._sanitize(logEntry));
      } catch (e) {
        console.error('Error syncing audit log to Firebase (fallback path):', e);
        if (typeof ErrorTelemetry !== 'undefined') ErrorTelemetry.captureError(e, 'audit-firebase');
      }
    }

    return logEntry;
  },

  // Get recent audit log entries
  getRecent: function(limit = 50) {
    try {
      const localLog = JSON.parse(localStorage.getItem('jmart-audit-log') || '[]');
      return localLog.slice(-limit).reverse();
    } catch (e) {
      console.error('Error reading audit log:', e);
      return [];
    }
  },

  // Get audit history for a specific form
  getFormHistory: function(formId) {
    try {
      const localLog = JSON.parse(localStorage.getItem('jmart-audit-log') || '[]');
      return localLog.filter(entry => entry.details && entry.details.formId === formId);
    } catch (e) {
      console.error('Error reading form history:', e);
      return [];
    }
  }
};

// Firebase sync helper functions with retry queue
