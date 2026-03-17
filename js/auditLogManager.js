// Audit Log Manager
// Extracted from index.html for maintainability
// ========================================
// AUDIT LOG MANAGER
// ========================================
// Tracks all form operations for compliance
const AuditLogManager = {
  // Log an action
  log: async function(action, details) {
    const logEntry = {
      id: Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9),
      action: action, // 'create', 'update', 'delete', 'view', 'export'
      deviceId: (typeof DeviceAuthManager !== 'undefined' ? DeviceAuthManager.deviceId : null) || 'unknown',
      userName: localStorage.getItem('jmart-user-name') || 'Unknown User',
      timestamp: Date.now(), // Must be number for Firebase validation rules
      timestampISO: new Date().toISOString(), // Human-readable version
      details: details ? Object.fromEntries(
        Object.entries(details).map(([k, v]) => [k, v === undefined ? null : v])
      ) : {}
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

    // Sync to Firebase if connected
    if (typeof firebaseDb !== 'undefined' && firebaseDb && typeof isFirebaseConfigured !== 'undefined' && isFirebaseConfigured) {
      try {
        await firebaseDb.ref('jmart-safety/auditLog/' + logEntry.id).set(logEntry);
      } catch (e) {
        console.error('Error syncing audit log to Firebase:', e);
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
