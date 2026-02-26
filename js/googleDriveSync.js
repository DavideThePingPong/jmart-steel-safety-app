// Google Drive Sync
// Uses googleDriveConfig.js for constants (GOOGLE_CLIENT_ID, DRIVE_FOLDERS, etc.)
// ========================================

// Google Drive Helper
const GoogleDriveSync = {
  tokenClient: null,
  accessToken: null,
  folderId: null,
  isInitialized: false,

  // Initialize Google Identity Services
  init: function() {
    if (!isGoogleDriveConfigured) {
      console.log('Google Drive not configured - add your Client ID');
      return;
    }

    try {
      this.tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: DRIVE_SCOPES,
        callback: (response) => {
          if (response.error) {
            console.error('Google Auth error:', response.error);
            return;
          }
          this.accessToken = response.access_token;
          sessionStorage.setItem('google-drive-token', response.access_token);
          console.log('Google Drive connected!');
          this.getOrCreateFolder();
        },
      });
      this.isInitialized = true;
      console.log('Google Drive initialized');

      // Check for stored token
      const storedToken = sessionStorage.getItem('google-drive-token');
      if (storedToken) {
        this.accessToken = storedToken;
        this.getOrCreateFolder();
      }
    } catch (error) {
      console.error('Google Drive init error:', error);
    }
  },

  // Request user authorization
  authorize: function() {
    if (!this.isInitialized) {
      // Lazy init — try again in case Google API loaded late
      if (isGoogleDriveConfigured && typeof google !== 'undefined' && google.accounts && google.accounts.oauth2) {
        console.log('Google Drive lazy-init on authorize click');
        this.init();
      }
      if (!this.isInitialized) {
        alert('Google Drive is still loading. Please wait a moment and try again.');
        return;
      }
    }
    this.tokenClient.requestAccessToken({ prompt: 'consent' });
  },

  // Check if connected
  isConnected: function() {
    return this.accessToken !== null;
  },

  // Wrapper for API calls with automatic token refresh on 401
  apiCall: async function(url, options = {}) {
    if (!this.accessToken) {
      throw new Error('Not connected to Google Drive');
    }

    // Add auth header
    options.headers = {
      ...options.headers,
      'Authorization': `Bearer ${this.accessToken}`
    };

    let response = await fetch(url, options);

    // If token expired (401), try to refresh silently
    if (response.status === 401) {
      console.log('Google Drive token expired, attempting refresh...');
      sessionStorage.removeItem('google-drive-token');
      this.accessToken = null;

      // Request new token (will trigger callback)
      return new Promise((resolve, reject) => {
        const originalCallback = this.tokenClient.callback;
        this.tokenClient.callback = async (tokenResponse) => {
          if (tokenResponse.error) {
            this.tokenClient.callback = originalCallback;
            reject(new Error('Token refresh failed'));
            return;
          }
          this.accessToken = tokenResponse.access_token;
          sessionStorage.setItem('google-drive-token', tokenResponse.access_token);
          this.tokenClient.callback = originalCallback;

          // Retry the original request
          options.headers['Authorization'] = `Bearer ${this.accessToken}`;
          try {
            const retryResponse = await fetch(url, options);
            resolve(retryResponse);
          } catch (e) {
            reject(e);
          }
        };
        this.tokenClient.requestAccessToken({ prompt: '' }); // Silent refresh
      });
    }

    return response;
  },

  // Get or create the JMart Safety folder
  getOrCreateFolder: async function() {
    if (!this.accessToken) return null;

    try {
      // Search for existing folder
      const searchResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='${DRIVE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        { headers: { 'Authorization': `Bearer ${this.accessToken}` } }
      );
      const searchData = await searchResponse.json();

      if (searchData.files && searchData.files.length > 0) {
        this.folderId = searchData.files[0].id;
        console.log('Found existing Drive folder:', this.folderId);
        return this.folderId;
      }

      // Create new folder
      const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: DRIVE_FOLDER_NAME,
          mimeType: 'application/vnd.google-apps.folder',
        }),
      });
      const createData = await createResponse.json();
      this.folderId = createData.id;
      console.log('Created Drive folder:', this.folderId);
      return this.folderId;
    } catch (error) {
      console.error('Error getting/creating folder:', error);
      return null;
    }
  },

  // Helper: Get or create nested folder path (e.g., "01_Safety_Compliance/Pre-Start_Checklists")
  getOrCreateNestedFolder: async function(folderPath, parentId = null) {
    if (!this.accessToken) return null;

    const parent = parentId || this.folderId;
    if (!parent) {
      await this.getOrCreateFolder();
    }

    const parts = folderPath.split('/').filter(p => p.trim());
    let currentParent = parent || this.folderId;

    for (const folderName of parts) {
      try {
        // Search for folder
        const searchResponse = await fetch(
          `https://www.googleapis.com/drive/v3/files?q=name='${folderName}' and '${currentParent}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
          { headers: { 'Authorization': `Bearer ${this.accessToken}` } }
        );
        const searchData = await searchResponse.json();

        if (searchData.files && searchData.files.length > 0) {
          currentParent = searchData.files[0].id;
        } else {
          // Create folder
          const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: folderName,
              mimeType: 'application/vnd.google-apps.folder',
              parents: [currentParent],
            }),
          });
          const createData = await createResponse.json();
          currentParent = createData.id;
          console.log(`Created folder: ${folderName}`, currentParent);
        }
      } catch (error) {
        console.error(`Error creating folder ${folderName}:`, error);
        return null;
      }
    }

    return currentParent;
  },

  // Upload a PDF to Google Drive (with optional subfolder)
  uploadPDF: async function(pdfBlob, filename, formType = null) {
    if (!this.accessToken) {
      console.error('Not connected to Google Drive');
      return null;
    }

    if (!this.folderId) {
      await this.getOrCreateFolder();
    }

    try {
      // Determine target folder based on form type
      let targetFolderId = this.folderId;

      if (formType && DRIVE_FOLDERS.forms[formType]) {
        const subfolderPath = DRIVE_FOLDERS.forms[formType];
        targetFolderId = await this.getOrCreateNestedFolder(subfolderPath);
        if (!targetFolderId) {
          console.warn(`Could not create subfolder for ${formType}, using root folder`);
          targetFolderId = this.folderId;
        }
      }

      const metadata = {
        name: filename,
        mimeType: 'application/pdf',
        parents: [targetFolderId],
      };

      const formData = new FormData();
      formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      formData.append('file', pdfBlob);

      const response = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${this.accessToken}` },
          body: formData,
        }
      );

      const data = await response.json();
      console.log('Uploaded to Drive:', filename, 'in folder:', formType || 'root', data.id);
      return data;
    } catch (error) {
      console.error('Upload error:', error);
      return null;
    }
  },

  // Upload all forms from today as PDFs
  uploadDailyForms: async function(forms) {
    if (!this.accessToken) {
      console.error('Not connected to Google Drive');
      return { success: false, error: 'Not connected' };
    }

    const today = new Date().toDateString();
    const todaysForms = forms.filter(f => new Date(f.createdAt).toDateString() === today);

    if (todaysForms.length === 0) {
      console.log('No forms to upload today');
      return { success: true, uploaded: 0 };
    }

    const results = [];
    for (const form of todaysForms) {
      try {
        const { doc, filename } = PDFGenerator.generate(form);
        const pdfBlob = doc.output('blob');
        const result = await this.uploadPDF(pdfBlob, filename, form.type);
        if (result) {
          results.push({ form: form.id, filename, driveId: result.id });
        }
      } catch (error) {
        console.error('Error uploading form:', form.id, error);
      }
    }

    console.log(`Uploaded ${results.length}/${todaysForms.length} forms to Drive`);
    return { success: true, uploaded: results.length, total: todaysForms.length, results };
  },

  // Search for files by name pattern
  searchFiles: async function(namePattern) {
    if (!this.accessToken) return [];

    try {
      const query = `name contains '${namePattern}' and '${this.folderId}' in parents and trashed=false`;
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,createdTime)`,
        { headers: { 'Authorization': `Bearer ${this.accessToken}` } }
      );
      const data = await response.json();
      return data.files || [];
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  },

  // Delete a file by ID
  deleteFile: async function(fileId) {
    if (!this.accessToken) return false;

    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${this.accessToken}` }
        }
      );
      if (response.ok || response.status === 204) {
        console.log('Deleted file from Drive:', fileId);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Delete error:', error);
      return false;
    }
  },

  // Delete old versions of a form PDF
  deleteOldFormPDFs: async function(formId, siteName) {
    if (!this.accessToken || !this.folderId) return { deleted: 0 };

    try {
      // Search for files matching this form's pattern
      const files = await this.searchFiles(siteName);
      let deleted = 0;

      for (const file of files) {
        const result = await this.deleteFile(file.id);
        if (result) deleted++;
      }

      console.log(`Deleted ${deleted} old PDF(s) for form ${formId}`);
      return { deleted, files };
    } catch (error) {
      console.error('Error deleting old PDFs:', error);
      return { deleted: 0, error };
    }
  },

  // Disconnect
  disconnect: function() {
    this.accessToken = null;
    this.folderId = null;
    sessionStorage.removeItem('google-drive-token');
    console.log('Disconnected from Google Drive');
  },

  // Get or create a subfolder for job recordings
  getOrCreateRecordingsFolder: async function(siteName, date) {
    if (!this.accessToken) return null;

    try {
      // First ensure main folder exists
      if (!this.folderId) {
        await this.getOrCreateFolder();
      }

      // Create/get "Job Recordings" subfolder
      const recordingsFolderName = 'Job Recordings';
      let recordingsFolderId = null;

      // Search for Job Recordings folder
      const recordingsSearch = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='${recordingsFolderName}' and '${this.folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        { headers: { 'Authorization': `Bearer ${this.accessToken}` } }
      );
      const recordingsData = await recordingsSearch.json();

      if (recordingsData.files && recordingsData.files.length > 0) {
        recordingsFolderId = recordingsData.files[0].id;
      } else {
        // Create Job Recordings folder
        const createRecordings = await fetch('https://www.googleapis.com/drive/v3/files', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: recordingsFolderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [this.folderId],
          }),
        });
        const newRecordingsFolder = await createRecordings.json();
        recordingsFolderId = newRecordingsFolder.id;
      }

      // Create/get site subfolder
      const safeSiteName = siteName.replace(/[<>:"/\\|?*]/g, '-');
      let siteFolderId = null;

      const siteSearch = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='${safeSiteName}' and '${recordingsFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        { headers: { 'Authorization': `Bearer ${this.accessToken}` } }
      );
      const siteData = await siteSearch.json();

      if (siteData.files && siteData.files.length > 0) {
        siteFolderId = siteData.files[0].id;
      } else {
        const createSite = await fetch('https://www.googleapis.com/drive/v3/files', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: safeSiteName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [recordingsFolderId],
          }),
        });
        const newSiteFolder = await createSite.json();
        siteFolderId = newSiteFolder.id;
      }

      // Create/get date subfolder
      const dateStr = new Date(date).toLocaleDateString('en-AU').replace(/\//g, '-');
      let dateFolderId = null;

      const dateSearch = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='${dateStr}' and '${siteFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        { headers: { 'Authorization': `Bearer ${this.accessToken}` } }
      );
      const dateData = await dateSearch.json();

      if (dateData.files && dateData.files.length > 0) {
        dateFolderId = dateData.files[0].id;
      } else {
        const createDate = await fetch('https://www.googleapis.com/drive/v3/files', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: dateStr,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [siteFolderId],
          }),
        });
        const newDateFolder = await createDate.json();
        dateFolderId = newDateFolder.id;
      }

      console.log('Created/found recordings folder structure:', siteName, dateStr, dateFolderId);
      return dateFolderId;
    } catch (error) {
      console.error('Error creating recordings folder structure:', error);
      return null;
    }
  },

  // Upload a photo to job recordings folder
  uploadJobPhoto: async function(photoData, filename, siteName, date) {
    if (!this.accessToken) {
      console.error('Not connected to Google Drive');
      return null;
    }

    try {
      const folderId = await this.getOrCreateRecordingsFolder(siteName, date);
      if (!folderId) {
        console.error('Could not create recordings folder');
        return null;
      }

      // Convert base64 to blob
      const base64Data = photoData.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/jpeg' });

      const metadata = {
        name: filename,
        mimeType: 'image/jpeg',
        parents: [folderId],
      };

      const formData = new FormData();
      formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      formData.append('file', blob);

      const response = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${this.accessToken}` },
          body: formData,
        }
      );

      const data = await response.json();
      console.log('Uploaded photo to Drive:', filename, data.id);
      return data;
    } catch (error) {
      console.error('Upload photo error:', error);
      return null;
    }
  },

  // Upload multiple photos for a job
  uploadJobPhotos: async function(photos, siteName, date) {
    if (!this.accessToken) {
      return { success: false, error: 'Not connected to Google Drive' };
    }

    const results = [];
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `photo-${i + 1}-${timestamp}.jpg`;
      const result = await this.uploadJobPhoto(photo.data, filename, siteName, date);
      if (result) {
        results.push({ filename, driveId: result.id });
      }
    }

    console.log(`Uploaded ${results.length}/${photos.length} photos to Drive`);
    return { success: true, uploaded: results.length, total: photos.length, results };
  }
};

// Initialize Google Drive when API loads (with robust retry)
window.onload = function() {
  if (isGoogleDriveConfigured) {
    const tryInit = (attempt) => {
      if (typeof google !== 'undefined' && google.accounts && google.accounts.oauth2) {
        GoogleDriveSync.init();
        console.log('Google Drive init succeeded on attempt', attempt);
      } else if (attempt < 10) {
        // Retry with increasing delay: 500ms, 1s, 1.5s, 2s...
        const delay = Math.min(500 * attempt, 3000);
        console.log('Google API not ready, retrying in', delay, 'ms (attempt', attempt, ')');
        setTimeout(() => tryInit(attempt + 1), delay);
      } else {
        console.error('Google API failed to load after 10 attempts');
      }
    };
    tryInit(1);
  }
};
