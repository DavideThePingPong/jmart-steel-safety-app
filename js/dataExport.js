// Data Export/Import — Portable backup of all app data
// ========================================
// Exports all localStorage data as a JSON file for backup/transfer.
// Imports previously exported data back into the app.

/**
 * @module DataExport
 * @description Provides full data export (download as JSON file) and import
 * (restore from JSON file) for the JMart Steel Safety App. Exports all
 * storage keys except sensitive credentials. Import validates structure
 * before writing and skips sensitive keys.
 */
var DataExport = {
  /**
   * Collects all app data from localStorage into a portable object.
   * Excludes sensitive keys (PASSWORD_HASH, DRIVE_TOKEN).
   * @returns {Object} Export object with metadata and data payload.
   */
  exportAll: function() {
    const data = {
      exportedAt: new Date().toISOString(),
      appVersion: '2.0.0',
      schemaVersion: typeof DataVersioning !== 'undefined' ? DataVersioning.getCurrentVersion() : 0,
      deviceName: localStorage.getItem(STORAGE_KEYS.DEVICE_NAME) || 'unknown',
      data: {}
    };

    // Sensitive keys to exclude from export
    const excludeKeys = ['PASSWORD_HASH', 'DRIVE_TOKEN', 'DRAFT_PREFIX'];

    const keys = Object.keys(STORAGE_KEYS);
    for (let i = 0; i < keys.length; i++) {
      const name = keys[i];
      const storageKey = STORAGE_KEYS[name];
      if (excludeKeys.indexOf(name) !== -1) continue;

      try {
        const raw = localStorage.getItem(storageKey);
        if (raw !== null) {
          try { data.data[name] = JSON.parse(raw); }
          catch (e) { data.data[name] = raw; }
        }
      } catch (e) { /* skip unreadable */ }
    }

    return data;
  },

  /**
   * Downloads the full export as a JSON file.
   * Creates a Blob, generates a download link, and triggers it.
   * @returns {{size: number, keys: number}} Export size in bytes and number of keys exported.
   */
  downloadExport: function() {
    const data = this.exportAll();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'jmart-safety-export-' + new Date().toISOString().split('T')[0] + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return { size: json.length, keys: Object.keys(data.data).length };
  },

  /**
   * Imports data from a previously exported JSON string.
   * Validates the structure before writing. Skips sensitive and unknown keys.
   * @param {string} jsonString - The raw JSON string from an export file.
   * @returns {{success: boolean, restored: number, errors: string[], exportedAt: string|undefined, error: string|undefined}}
   */
  importData: function(jsonString) {
    let imported;
    try {
      imported = JSON.parse(jsonString);
    } catch (e) {
      return { success: false, error: 'Invalid JSON file', restored: 0, errors: [] };
    }

    if (!imported.data || typeof imported.data !== 'object') {
      return { success: false, error: 'Invalid export format — missing data property', restored: 0, errors: [] };
    }

    // Keys that must not be imported
    const skipKeys = ['PASSWORD_HASH', 'DRIVE_TOKEN', 'DRAFT_PREFIX'];
    let restored = 0;
    const errors = [];

    const dataKeys = Object.keys(imported.data);
    for (let i = 0; i < dataKeys.length; i++) {
      const name = dataKeys[i];
      const value = imported.data[name];
      const storageKey = STORAGE_KEYS[name];

      // Skip unknown or sensitive keys
      if (!storageKey || skipKeys.indexOf(name) !== -1) continue;

      try {
        const serialized = typeof value === 'string' ? value : JSON.stringify(value);
        if (typeof StorageQuotaManager !== 'undefined' && StorageQuotaManager.safeSave) {
          StorageQuotaManager.safeSave(storageKey, serialized);
        } else {
          localStorage.setItem(storageKey, serialized);
        }
        restored++;
      } catch (e) {
        errors.push(name + ': ' + e.message);
      }
    }

    return {
      success: true,
      restored: restored,
      errors: errors,
      exportedAt: imported.exportedAt
    };
  }
};
