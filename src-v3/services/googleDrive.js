/**
 * Google Drive Sync Service v3 for JMart Steel Safety App
 * IMPROVEMENTS:
 * - Retry mechanism with exponential backoff
 * - Progress callbacks for UI feedback
 * - Upload queue for offline resilience
 * - Better error classification
 * - Secure token handling
 */

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  retryableErrors: [408, 429, 500, 502, 503, 504]
};

/**
 * Creates a Google Drive sync service instance with enhanced reliability
 * @param {Object} options - Configuration options
 * @returns {Object} - GoogleDriveSync service
 */
export function createGoogleDriveSync(options = {}) {
  const {
    clientId,
    folderName = 'JMart Steel',
    scopes = 'https://www.googleapis.com/auth/drive.file',
    localStorage = window?.localStorage,
    sessionStorage = window?.sessionStorage,
    fetch = window?.fetch,
    onProgress = null,
    onStatusChange = null
  } = options;

  let accessToken = null;
  let tokenExpiry = null;
  let folderId = null;
  let folderCache = new Map();
  let isInitialized = false;
  let uploadQueue = [];
  let isProcessingQueue = false;

  // Status tracking
  const status = {
    connected: false,
    lastSync: null,
    pendingUploads: 0,
    failedUploads: 0
  };

  /**
   * Notify status change to listeners
   */
  function notifyStatusChange(update) {
    Object.assign(status, update);
    if (onStatusChange) {
      onStatusChange({ ...status });
    }
  }

  /**
   * Initialize the service
   */
  function init() {
    // Load stored token from sessionStorage (more secure than localStorage)
    if (sessionStorage) {
      const storedToken = sessionStorage.getItem('gdrive-token');
      const storedExpiry = sessionStorage.getItem('gdrive-token-expiry');
      if (storedToken && storedExpiry) {
        const expiry = parseInt(storedExpiry, 10);
        if (Date.now() < expiry) {
          accessToken = storedToken;
          tokenExpiry = expiry;
          notifyStatusChange({ connected: true });
        } else {
          // Token expired, clear it
          sessionStorage.removeItem('gdrive-token');
          sessionStorage.removeItem('gdrive-token-expiry');
        }
      }
    }

    // Load pending upload queue
    if (localStorage) {
      try {
        const savedQueue = localStorage.getItem('gdrive-upload-queue');
        if (savedQueue) {
          uploadQueue = JSON.parse(savedQueue);
          notifyStatusChange({ pendingUploads: uploadQueue.length });
        }
      } catch (e) {
        console.error('[GDrive] Error loading upload queue:', e);
      }
    }

    isInitialized = true;

    // Process any pending uploads
    if (uploadQueue.length > 0 && accessToken) {
      processUploadQueue();
    }

    return { isInitialized: true, pendingUploads: uploadQueue.length };
  }

  /**
   * Check if connected to Google Drive
   */
  function isConnected() {
    if (!accessToken) return false;
    if (tokenExpiry && Date.now() >= tokenExpiry) {
      disconnect();
      return false;
    }
    return true;
  }

  /**
   * Set access token (after OAuth flow)
   * @param {string} token - Access token
   * @param {number} expiresIn - Token expiry in seconds (default 1 hour)
   */
  function setAccessToken(token, expiresIn = 3600) {
    accessToken = token;
    tokenExpiry = Date.now() + (expiresIn * 1000);

    if (sessionStorage) {
      sessionStorage.setItem('gdrive-token', token);
      sessionStorage.setItem('gdrive-token-expiry', tokenExpiry.toString());
    }

    notifyStatusChange({ connected: true });

    // Process pending uploads
    if (uploadQueue.length > 0) {
      processUploadQueue();
    }
  }

  /**
   * Clear access token (disconnect)
   */
  function disconnect() {
    accessToken = null;
    tokenExpiry = null;
    folderId = null;
    folderCache.clear();

    if (sessionStorage) {
      sessionStorage.removeItem('gdrive-token');
      sessionStorage.removeItem('gdrive-token-expiry');
    }

    notifyStatusChange({ connected: false });
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  function getRetryDelay(attempt) {
    const delay = Math.min(
      RETRY_CONFIG.baseDelay * Math.pow(2, attempt),
      RETRY_CONFIG.maxDelay
    );
    // Add jitter (±25%)
    const jitter = delay * 0.25 * (Math.random() * 2 - 1);
    return Math.round(delay + jitter);
  }

  /**
   * Check if error is retryable
   */
  function isRetryableError(response) {
    return RETRY_CONFIG.retryableErrors.includes(response.status);
  }

  /**
   * Sleep for specified milliseconds
   */
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Make authenticated API call with retry support
   */
  async function apiCall(url, options = {}, retryCount = 0) {
    if (!accessToken) {
      throw new Error('Not connected to Google Drive');
    }

    // Check token expiry
    if (tokenExpiry && Date.now() >= tokenExpiry) {
      disconnect();
      throw new Error('Token expired - please reconnect');
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (response.status === 401) {
        disconnect();
        throw new Error('Token expired - please reconnect');
      }

      // Retry on transient errors
      if (!response.ok && isRetryableError(response) && retryCount < RETRY_CONFIG.maxRetries) {
        const delay = getRetryDelay(retryCount);
        console.log(`[GDrive] Retrying request in ${delay}ms (attempt ${retryCount + 1}/${RETRY_CONFIG.maxRetries})`);
        await sleep(delay);
        return apiCall(url, options, retryCount + 1);
      }

      return response;
    } catch (error) {
      // Network errors are retryable
      if (error.name === 'TypeError' && retryCount < RETRY_CONFIG.maxRetries) {
        const delay = getRetryDelay(retryCount);
        console.log(`[GDrive] Network error, retrying in ${delay}ms (attempt ${retryCount + 1}/${RETRY_CONFIG.maxRetries})`);
        await sleep(delay);
        return apiCall(url, options, retryCount + 1);
      }
      throw error;
    }
  }

  /**
   * Search for a folder by name (with caching)
   */
  async function findFolder(name, parentId = null) {
    const cacheKey = `${parentId || 'root'}:${name}`;
    if (folderCache.has(cacheKey)) {
      return folderCache.get(cacheKey);
    }

    let query = `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    if (parentId) {
      query += ` and '${parentId}' in parents`;
    }

    const response = await apiCall(
      `${DRIVE_API_BASE}/files?q=${encodeURIComponent(query)}`
    );
    const data = await response.json();

    const folder = data.files && data.files.length > 0 ? data.files[0] : null;
    if (folder) {
      folderCache.set(cacheKey, folder);
    }
    return folder;
  }

  /**
   * Create a folder
   */
  async function createFolder(name, parentId = null) {
    const metadata = {
      name,
      mimeType: 'application/vnd.google-apps.folder'
    };
    if (parentId) {
      metadata.parents = [parentId];
    }

    const response = await apiCall(`${DRIVE_API_BASE}/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metadata)
    });

    const folder = await response.json();

    // Cache the new folder
    const cacheKey = `${parentId || 'root'}:${name}`;
    folderCache.set(cacheKey, folder);

    return folder;
  }

  /**
   * Get or create the main folder
   */
  async function getOrCreateMainFolder() {
    if (folderId) return folderId;

    const existing = await findFolder(folderName);
    if (existing) {
      folderId = existing.id;
      return folderId;
    }

    const created = await createFolder(folderName);
    folderId = created.id;
    return folderId;
  }

  /**
   * Get or create nested folder path
   */
  async function getOrCreateNestedFolder(folderPath, parentId = null) {
    const parent = parentId || await getOrCreateMainFolder();
    const parts = folderPath.split('/').filter(p => p.trim());

    let currentParent = parent;
    for (const name of parts) {
      const existing = await findFolder(name, currentParent);
      if (existing) {
        currentParent = existing.id;
      } else {
        const created = await createFolder(name, currentParent);
        currentParent = created.id;
      }
    }

    return currentParent;
  }

  /**
   * Save upload queue to localStorage
   */
  function saveUploadQueue() {
    if (localStorage) {
      try {
        localStorage.setItem('gdrive-upload-queue', JSON.stringify(uploadQueue));
      } catch (e) {
        console.error('[GDrive] Error saving upload queue:', e);
      }
    }
  }

  /**
   * Add upload to queue (for offline support)
   */
  function queueUpload(blobData, filename, formType, metadata = {}) {
    const item = {
      id: `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      blobData: blobData, // Base64 encoded
      filename,
      formType,
      metadata,
      attempts: 0,
      createdAt: new Date().toISOString()
    };

    uploadQueue.push(item);
    saveUploadQueue();
    notifyStatusChange({ pendingUploads: uploadQueue.length });

    return item.id;
  }

  /**
   * Process upload queue
   */
  async function processUploadQueue() {
    if (isProcessingQueue || !isConnected() || uploadQueue.length === 0) {
      return { processed: 0, pending: uploadQueue.length };
    }

    isProcessingQueue = true;
    let processed = 0;
    let failed = 0;

    const itemsToProcess = [...uploadQueue];

    for (const item of itemsToProcess) {
      try {
        // Convert base64 back to blob
        const binaryString = atob(item.blobData);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/pdf' });

        await uploadFileInternal(blob, item.filename, item.formType);

        // Success - remove from queue
        uploadQueue = uploadQueue.filter(i => i.id !== item.id);
        saveUploadQueue();
        processed++;

        notifyStatusChange({
          pendingUploads: uploadQueue.length,
          lastSync: new Date().toISOString()
        });

      } catch (error) {
        item.attempts++;
        if (item.attempts >= RETRY_CONFIG.maxRetries) {
          // Move to failed
          uploadQueue = uploadQueue.filter(i => i.id !== item.id);
          failed++;
          console.error(`[GDrive] Upload permanently failed: ${item.filename}`, error);
        }
        saveUploadQueue();
      }
    }

    isProcessingQueue = false;
    notifyStatusChange({
      pendingUploads: uploadQueue.length,
      failedUploads: failed
    });

    return { processed, failed, pending: uploadQueue.length };
  }

  /**
   * Internal upload function
   */
  async function uploadFileInternal(blob, filename, formType = null) {
    const mainFolderId = await getOrCreateMainFolder();

    let targetFolderId = mainFolderId;
    if (formType) {
      const folderPaths = {
        'prestart': '01_Safety_Compliance/Pre-Start_Checklists',
        'inspection': '01_Safety_Compliance/Site_Inspections',
        'incident': '01_Safety_Compliance/Incident_Reports',
        'toolbox': '01_Safety_Compliance/Toolbox_Talks',
        'itp': '02_ITPs/General',
        'steel-itp': '02_ITPs/Structural_Steel'
      };

      const folderPath = folderPaths[formType];
      if (folderPath) {
        targetFolderId = await getOrCreateNestedFolder(folderPath);
      }
    }

    const metadata = {
      name: filename,
      mimeType: 'application/pdf',
      parents: [targetFolderId]
    };

    const formData = new FormData();
    formData.append(
      'metadata',
      new Blob([JSON.stringify(metadata)], { type: 'application/json' })
    );
    formData.append('file', blob);

    const response = await apiCall(
      `${DRIVE_UPLOAD_BASE}/files?uploadType=multipart`,
      {
        method: 'POST',
        body: formData
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Upload failed');
    }

    return response.json();
  }

  /**
   * Upload a PDF with progress tracking and retry support
   * @param {Blob} pdfBlob - PDF blob to upload
   * @param {string} filename - Target filename
   * @param {string} formType - Form type for folder routing
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} - Upload result
   */
  async function uploadPDF(pdfBlob, filename, formType = null, options = {}) {
    const { queueIfOffline = true } = options;

    // If not connected, queue for later
    if (!isConnected()) {
      if (queueIfOffline) {
        // Convert blob to base64 for storage
        const reader = new FileReader();
        const base64 = await new Promise((resolve) => {
          reader.onload = () => resolve(reader.result.split(',')[1]);
          reader.readAsDataURL(pdfBlob);
        });

        const queueId = queueUpload(base64, filename, formType);
        return {
          success: false,
          queued: true,
          queueId,
          message: 'Upload queued - will sync when connected'
        };
      }
      throw new Error('Not connected to Google Drive');
    }

    // Report progress
    if (onProgress) {
      onProgress({ stage: 'starting', filename, progress: 0 });
    }

    try {
      if (onProgress) {
        onProgress({ stage: 'uploading', filename, progress: 50 });
      }

      const result = await uploadFileInternal(pdfBlob, filename, formType);

      if (onProgress) {
        onProgress({ stage: 'complete', filename, progress: 100 });
      }

      notifyStatusChange({ lastSync: new Date().toISOString() });

      return { success: true, ...result };
    } catch (error) {
      if (onProgress) {
        onProgress({ stage: 'error', filename, error: error.message });
      }

      // Queue for retry if it's a network/transient error
      if (queueIfOffline && (error.message.includes('network') || error.message.includes('fetch'))) {
        const reader = new FileReader();
        const base64 = await new Promise((resolve) => {
          reader.onload = () => resolve(reader.result.split(',')[1]);
          reader.readAsDataURL(pdfBlob);
        });

        const queueId = queueUpload(base64, filename, formType);
        return {
          success: false,
          queued: true,
          queueId,
          message: 'Upload queued due to error - will retry'
        };
      }

      throw error;
    }
  }

  /**
   * Search for files in the main folder
   */
  async function searchFiles(namePattern) {
    const mainFolderId = await getOrCreateMainFolder();

    const query = `name contains '${namePattern}' and '${mainFolderId}' in parents and trashed=false`;
    const response = await apiCall(
      `${DRIVE_API_BASE}/files?q=${encodeURIComponent(query)}&fields=files(id,name,createdTime,size)`
    );
    const data = await response.json();

    return data.files || [];
  }

  /**
   * Delete a file by ID
   */
  async function deleteFile(fileId) {
    const response = await apiCall(`${DRIVE_API_BASE}/files/${fileId}`, {
      method: 'DELETE'
    });

    return response.ok || response.status === 204;
  }

  /**
   * Get folder structure info
   */
  function getFolderStructure() {
    return {
      main: folderName,
      subfolders: {
        'prestart': '01_Safety_Compliance/Pre-Start_Checklists',
        'inspection': '01_Safety_Compliance/Site_Inspections',
        'incident': '01_Safety_Compliance/Incident_Reports',
        'toolbox': '01_Safety_Compliance/Toolbox_Talks',
        'itp': '02_ITPs/General',
        'steel-itp': '02_ITPs/Structural_Steel'
      }
    };
  }

  /**
   * Get current status
   */
  function getStatus() {
    return { ...status };
  }

  /**
   * Get pending upload count
   */
  function getPendingCount() {
    return uploadQueue.length;
  }

  /**
   * Clear failed uploads from queue
   */
  function clearFailedUploads() {
    const initialLength = uploadQueue.length;
    uploadQueue = uploadQueue.filter(item => item.attempts < RETRY_CONFIG.maxRetries);
    saveUploadQueue();
    notifyStatusChange({
      pendingUploads: uploadQueue.length,
      failedUploads: 0
    });
    return initialLength - uploadQueue.length;
  }

  return {
    init,
    isConnected,
    setAccessToken,
    disconnect,
    getOrCreateMainFolder,
    getOrCreateNestedFolder,
    uploadPDF,
    searchFiles,
    deleteFile,
    getFolderStructure,
    getStatus,
    getPendingCount,
    processUploadQueue,
    clearFailedUploads
  };
}

export default createGoogleDriveSync;
