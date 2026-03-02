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
      deviceId: DeviceAuthManager.deviceId || 'unknown',
      userName: localStorage.getItem('jmart-user-name') || 'Unknown User',
      timestamp: new Date().toISOString(),
      details: details
    };

    // Save to local audit log
    try {
      const localLog = JSON.parse(localStorage.getItem('jmart-audit-log') || '[]');
      localLog.push(logEntry);
      // Keep last 1000 entries locally
      if (localLog.length > 1000) {
        localLog.splice(0, localLog.length - 1000);
      }
      localStorage.setItem('jmart-audit-log', JSON.stringify(localLog));
    } catch (e) {
      console.error('Error saving audit log locally:', e);
    }

    // Sync to Firebase if connected
    if (firebaseDb && isFirebaseConfigured) {
      try {
        await firebaseDb.ref('jmart-safety/auditLog/' + logEntry.id).set(logEntry);
      } catch (e) {
        console.error('Error syncing audit log to Firebase:', e);
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
