/**
 * Google Drive Sync Service for JMart Steel Safety App
 * Handles PDF backup to Google Drive
 */

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';

/**
 * Creates a Google Drive sync service instance
 * @param {Object} options - Configuration options
 * @returns {Object} - GoogleDriveSync service
 */
export function createGoogleDriveSync(options = {}) {
  const {
    clientId,
    folderName = 'JMart Steel',
    scopes = 'https://www.googleapis.com/auth/drive.file',
    localStorage = window?.localStorage,
    fetch = window?.fetch
  } = options;

  let accessToken = null;
  let folderId = null;
  let isInitialized = false;

  /**
   * Initialize the service
   */
  function init() {
    // Load stored token
    if (localStorage) {
      accessToken = localStorage.getItem('google-drive-token');
    }
    isInitialized = true;
    return { isInitialized: true };
  }

  /**
   * Check if connected to Google Drive
   */
  function isConnected() {
    return accessToken !== null;
  }

  /**
   * Set access token (after OAuth flow)
   */
  function setAccessToken(token) {
    accessToken = token;
    if (localStorage) {
      localStorage.setItem('google-drive-token', token);
    }
  }

  /**
   * Clear access token (disconnect)
   */
  function disconnect() {
    accessToken = null;
    folderId = null;
    if (localStorage) {
      localStorage.removeItem('google-drive-token');
    }
  }

  /**
   * Make authenticated API call
   */
  async function apiCall(url, options = {}) {
    if (!accessToken) {
      throw new Error('Not connected to Google Drive');
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (response.status === 401) {
      // Token expired
      disconnect();
      throw new Error('Token expired - please reconnect');
    }

    return response;
  }

  /**
   * Search for a folder by name
   */
  async function findFolder(name, parentId = null) {
    let query = `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    if (parentId) {
      query += ` and '${parentId}' in parents`;
    }

    const response = await apiCall(
      `${DRIVE_API_BASE}/files?q=${encodeURIComponent(query)}`
    );
    const data = await response.json();

    return data.files && data.files.length > 0 ? data.files[0] : null;
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

    return response.json();
  }

  /**
   * Get or create the main folder
   */
  async function getOrCreateMainFolder() {
    if (folderId) return folderId;

    // Search for existing folder
    const existing = await findFolder(folderName);
    if (existing) {
      folderId = existing.id;
      return folderId;
    }

    // Create new folder
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
    for (const folderName of parts) {
      const existing = await findFolder(folderName, currentParent);
      if (existing) {
        currentParent = existing.id;
      } else {
        const created = await createFolder(folderName, currentParent);
        currentParent = created.id;
      }
    }

    return currentParent;
  }

  /**
   * Upload a file to Google Drive
   */
  async function uploadFile(blob, filename, folderId, mimeType = 'application/pdf') {
    const metadata = {
      name: filename,
      mimeType,
      parents: [folderId]
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
   * Upload a PDF to the appropriate folder
   */
  async function uploadPDF(pdfBlob, filename, formType = null) {
    const mainFolderId = await getOrCreateMainFolder();

    let targetFolderId = mainFolderId;
    if (formType) {
      const folderPaths = {
        'prestart': '01_Safety_Compliance/Pre-Start_Checklists',
        'inspection': '01_Safety_Compliance/Site_Inspections',
        'incident': '01_Safety_Compliance/Incident_Reports',
        'toolbox': '01_Safety_Compliance/Toolbox_Talks',
        'itp': '03_ITPs/General',
        'steel-itp': '03_ITPs/Structural_Steel'
      };

      const folderPath = folderPaths[formType];
      if (folderPath) {
        targetFolderId = await getOrCreateNestedFolder(folderPath);
      }
    }

    return uploadFile(pdfBlob, filename, targetFolderId);
  }

  /**
   * Search for files in the main folder
   */
  async function searchFiles(namePattern) {
    const mainFolderId = await getOrCreateMainFolder();

    const query = `name contains '${namePattern}' and '${mainFolderId}' in parents and trashed=false`;
    const response = await apiCall(
      `${DRIVE_API_BASE}/files?q=${encodeURIComponent(query)}&fields=files(id,name,createdTime)`
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
        'itp': '03_ITPs/General',
        'steel-itp': '03_ITPs/Structural_Steel'
      }
    };
  }

  return {
    init,
    isConnected,
    setAccessToken,
    disconnect,
    getOrCreateMainFolder,
    getOrCreateNestedFolder,
    uploadPDF,
    uploadFile,
    searchFiles,
    deleteFile,
    getFolderStructure
  };
}

export default createGoogleDriveSync;
