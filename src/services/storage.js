/**
 * Storage Service for JMart Steel Safety App
 * Handles localStorage operations with error handling and quota management
 */

const STORAGE_KEYS = {
  FORMS: 'jmart-safety-forms',
  SITES: 'jmart-safety-sites',
  TRAINING: 'jmart-training',
  SIGNATURES: 'jmart-signatures',
  SYNC_QUEUE: 'jmart-sync-queue',
  GOOGLE_DRIVE_TOKEN: 'google-drive-token',
  LAST_BACKUP_DATE: 'last-drive-backup-date'
};

// Estimated localStorage limit (5MB for most browsers)
const STORAGE_LIMIT_BYTES = 5 * 1024 * 1024;

/**
 * Creates a storage service instance
 * @param {Object} storage - localStorage interface (allows mocking)
 * @returns {Object} - Storage service
 */
export function createStorageService(storage = localStorage) {
  /**
   * Safely get item from storage
   * @param {string} key - Storage key
   * @param {*} defaultValue - Default value if not found
   * @returns {*} - Parsed value or default
   */
  function getItem(key, defaultValue = null) {
    try {
      const item = storage.getItem(key);
      if (item === null) return defaultValue;
      return JSON.parse(item);
    } catch (e) {
      console.error(`Error reading ${key} from storage:`, e);
      return defaultValue;
    }
  }

  /**
   * Safely set item in storage
   * @param {string} key - Storage key
   * @param {*} value - Value to store
   * @returns {Object} - { success: boolean, error?: string }
   */
  function setItem(key, value) {
    try {
      const serialized = JSON.stringify(value);
      storage.setItem(key, serialized);
      return { success: true };
    } catch (e) {
      if (e.name === 'QuotaExceededError' || e.code === 22) {
        return { success: false, error: 'Storage quota exceeded' };
      }
      return { success: false, error: e.message };
    }
  }

  /**
   * Remove item from storage
   * @param {string} key - Storage key
   */
  function removeItem(key) {
    try {
      storage.removeItem(key);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  /**
   * Get estimated storage usage
   * @returns {Object} - { used: number, limit: number, percentage: number }
   */
  function getStorageUsage() {
    let totalSize = 0;
    try {
      for (let key in storage) {
        if (storage.hasOwnProperty(key)) {
          totalSize += storage[key].length * 2; // UTF-16 characters = 2 bytes each
        }
      }
    } catch (e) {
      console.error('Error calculating storage usage:', e);
    }

    return {
      used: totalSize,
      limit: STORAGE_LIMIT_BYTES,
      percentage: Math.round((totalSize / STORAGE_LIMIT_BYTES) * 100)
    };
  }

  /**
   * Check if storage has enough space
   * @param {number} bytesNeeded - Bytes needed
   * @returns {boolean}
   */
  function hasSpace(bytesNeeded) {
    const usage = getStorageUsage();
    return (usage.limit - usage.used) >= bytesNeeded;
  }

  // Form-specific methods
  function getForms() {
    return getItem(STORAGE_KEYS.FORMS, []);
  }

  function saveForms(forms) {
    return setItem(STORAGE_KEYS.FORMS, forms);
  }

  function addForm(form) {
    const forms = getForms();
    forms.push(form);
    return saveForms(forms);
  }

  function updateForm(formId, updates) {
    const forms = getForms();
    const index = forms.findIndex(f => f.id === formId);
    if (index === -1) {
      return { success: false, error: 'Form not found' };
    }
    forms[index] = { ...forms[index], ...updates };
    return saveForms(forms);
  }

  function deleteForm(formId) {
    const forms = getForms();
    const filtered = forms.filter(f => f.id !== formId);
    if (filtered.length === forms.length) {
      return { success: false, error: 'Form not found' };
    }
    return saveForms(filtered);
  }

  function getFormById(formId) {
    const forms = getForms();
    return forms.find(f => f.id === formId) || null;
  }

  // Site-specific methods
  function getSites() {
    return getItem(STORAGE_KEYS.SITES, []);
  }

  function saveSites(sites) {
    return setItem(STORAGE_KEYS.SITES, sites);
  }

  // Signature methods
  function getSignatures() {
    return getItem(STORAGE_KEYS.SIGNATURES, {});
  }

  function saveSignature(name, signatureData) {
    const signatures = getSignatures();
    signatures[name] = signatureData;
    return setItem(STORAGE_KEYS.SIGNATURES, signatures);
  }

  function getSignatureByName(name) {
    const signatures = getSignatures();
    return signatures[name] || null;
  }

  // Clear all app data
  function clearAllData() {
    Object.values(STORAGE_KEYS).forEach(key => {
      storage.removeItem(key);
    });
    return { success: true };
  }

  return {
    getItem,
    setItem,
    removeItem,
    getStorageUsage,
    hasSpace,
    getForms,
    saveForms,
    addForm,
    updateForm,
    deleteForm,
    getFormById,
    getSites,
    saveSites,
    getSignatures,
    saveSignature,
    getSignatureByName,
    clearAllData,
    STORAGE_KEYS
  };
}

export default createStorageService;
export { STORAGE_KEYS };
