// Google Drive Sync
// Uses googleDriveConfig.js for constants (GOOGLE_CLIENT_ID, DRIVE_FOLDERS, etc.)
// ========================================

// Google Drive Helper
const GoogleDriveSync = {
  tokenClient: null,
  accessToken: null,
  folderId: null,
  isInitialized: false,
  _onConnectCallbacks: [],   // Listeners for connection state changes
  _lastError: null,          // Last error message for UI display

  // Register a callback for when connection status changes
  // Returns an unsubscribe function
  onConnectionChange: function(callback) {
    this._onConnectCallbacks.push(callback);
    return () => {
      this._onConnectCallbacks = this._onConnectCallbacks.filter(cb => cb !== callback);
    };
  },

  // Fire all connection-change callbacks
  _notifyConnectionChange: function(connected, error) {
    this._lastError = error || null;
    this._onConnectCallbacks.forEach(function(cb) {
      try { cb(connected, error); } catch (e) { console.error('Drive callback error:', e); if (typeof ErrorTelemetry !== 'undefined') ErrorTelemetry.captureError(e, 'drive-callback'); }
    });
  },

  // Get last error message (for UI display)
  getLastError: function() {
    return this._lastError;
  },

  // Initialize Google Identity Services
  init: function() {
    if (!isGoogleDriveConfigured) {
      console.log('Google Drive not configured - add your Client ID');
      return;
    }

    try {
      var self = this;
      this.tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: DRIVE_SCOPES,
        callback: (response) => {
          if (response.error) {
            console.error('Google Auth error:', response.error);
            self._notifyConnectionChange(false, 'Google sign-in failed: ' + response.error);
            return;
          }
          self.accessToken = response.access_token;
          // Store token with timestamp so we know when it expires (~1hr)
          localStorage.setItem('google-drive-token', JSON.stringify({
            token: response.access_token,
            savedAt: Date.now()
          }));
          // Remember that user has connected — enables auto-reconnect on next app load
          localStorage.setItem('google-drive-auto-connect', 'true');
          console.log('Google Drive connected!');
          self._notifyConnectionChange(true, null);
          self.getOrCreateFolder();
        },
        error_callback: (error) => {
          console.error('Google OAuth error:', error);
          var msg = 'Google sign-in failed';
          if (error && error.type === 'popup_failed_to_open') {
            msg = 'Popup blocked. Allow popups for this site, or open in your browser (not the app icon).';
          } else if (error && error.type === 'popup_closed') {
            msg = 'Sign-in window was closed. Tap Connect again to retry.';
          } else if (error && error.message) {
            msg = error.message;
          }
          self._notifyConnectionChange(false, msg);
        }
      });
      this.isInitialized = true;
      console.log('Google Drive initialized');

      // Check for stored token (localStorage survives page close)
      try {
        const stored = localStorage.getItem('google-drive-token');
        if (stored) {
          const parsed = JSON.parse(stored);
          // Tokens expire after ~1hr. Only reuse if < 50 minutes old.
          const age = Date.now() - (parsed.savedAt || 0);
          if (parsed.token && age < 50 * 60 * 1000) {
            this.accessToken = parsed.token;
            this._notifyConnectionChange(true, null);
            this.getOrCreateFolder();
          } else {
            // Token expired — clear it and try silent reconnect
            localStorage.removeItem('google-drive-token');
            console.log('Google Drive token expired, attempting silent reconnect...');
            this._silentReconnect();
          }
        } else {
          // No token stored — attempt silent reconnect on EVERY app load.
          // If the user has never authorized, this fails silently with no popup.
          // If they've authorized in this browser before, Google reconnects without prompting.
          console.log('No stored Drive token, attempting silent reconnect...');
          this._silentReconnect();
        }
      } catch (e) {
        // Handle old format (raw string, not JSON)
        localStorage.removeItem('google-drive-token');
      }
    } catch (error) {
      console.error('Google Drive init error:', error);
      if (typeof ErrorTelemetry !== 'undefined') ErrorTelemetry.captureError(error, 'drive-init');
    }
  },

  // Silent reconnect — requests a new token without showing consent popup
  // Only works if the user has previously granted access in this browser session
  _silentReconnect: function() {
    if (!this.tokenClient) return;
    try {
      this.tokenClient.requestAccessToken({ prompt: '' });
    } catch (e) {
      console.log('Silent reconnect failed (expected if no prior session):', e.message);
    }
  },

  // Request user authorization — waits for GSI to load if needed
  authorize: function() {
    var self = this;

    // Helper: attempt init and open consent
    var doAuthorize = function() {
      if (!self.isInitialized) {
        if (isGoogleDriveConfigured && typeof google !== 'undefined' && google.accounts && google.accounts.oauth2) {
          console.log('Google Drive lazy-init on authorize click');
          self.init();
        }
      }
      if (!self.isInitialized) return false;
      try {
        self.tokenClient.requestAccessToken({ prompt: 'consent' });
        return true;
      } catch (e) {
        console.error('Drive authorize error:', e);
        self._notifyConnectionChange(false, 'Could not open Google sign-in. Check your popup blocker.');
        return true; // Don't keep retrying on this error
      }
    };

    // Try immediately
    if (doAuthorize()) return;

    // GSI not loaded yet — poll every 500ms for up to 15 seconds
    this._notifyConnectionChange(false, 'Loading Google Drive... please wait');
    var attempts = 0;
    var maxAttempts = 30; // 30 × 500ms = 15 seconds
    var pollTimer = setInterval(function() {
      attempts++;
      if (doAuthorize()) {
        clearInterval(pollTimer);
      } else if (attempts >= maxAttempts) {
        clearInterval(pollTimer);
        self._notifyConnectionChange(false, 'Google Drive failed to load. Check your internet connection and try again.');
      }
    }, 500);
  },

  // Check if connected
  isConnected: function() {
    return this.accessToken !== null;
  },

  // Promise-wrapped silent reconnect — resolves with the new token, rejects on
  // failure. Used to AWAIT a refresh before the next API call instead of
  // fire-and-forget. Without this, proactive refresh kicks off async and the
  // current call still hits the API with the stale token.
  _refreshTokenAsync: function() {
    var self = this;
    return new Promise(function(resolve, reject) {
      if (!self.tokenClient) { reject(new Error('Drive not initialized')); return; }
      var done = false;
      var prev = self.tokenClient.callback;
      var timeout = setTimeout(function() {
        if (done) return; done = true;
        self.tokenClient.callback = prev;
        reject(new Error('Token refresh timed out'));
      }, 15000);
      self.tokenClient.callback = function(resp) {
        if (done) return; done = true;
        clearTimeout(timeout);
        self.tokenClient.callback = prev;
        if (resp && resp.error) { reject(new Error(resp.error)); return; }
        if (resp && resp.access_token) {
          self.accessToken = resp.access_token;
          try {
            localStorage.setItem('google-drive-token', JSON.stringify({ token: resp.access_token, savedAt: Date.now() }));
          } catch (_) {}
          resolve(resp.access_token);
        } else {
          reject(new Error('No token in refresh response'));
        }
      };
      try { self.tokenClient.requestAccessToken({ prompt: '' }); }
      catch (e) { if (done) return; done = true; clearTimeout(timeout); self.tokenClient.callback = prev; reject(e); }
    });
  },

  // Wrapper for API calls with automatic token refresh + retry on 429/5xx
  apiCall: async function(url, options = {}) {
    if (!this.accessToken) {
      throw new Error('Not connected to Google Drive');
    }

    // Proactive token freshness — AWAIT the refresh so the call uses fresh token
    // (previously fire-and-forget meant the call still hit with stale token).
    try {
      var stored = localStorage.getItem('google-drive-token');
      if (stored) {
        var parsed = JSON.parse(stored);
        var age = Date.now() - (parsed.savedAt || 0);
        if (age > 55 * 60 * 1000) {
          console.log('Drive token >55min old, awaiting proactive refresh');
          try { await this._refreshTokenAsync(); }
          catch (e) { console.warn('Proactive refresh failed (will fall back to 401-retry):', e.message); }
        }
      }
    } catch (_) { /* parse failure shouldn't block the call */ }

    // Add auth header
    options.headers = {
      ...options.headers,
      'Authorization': `Bearer ${this.accessToken}`
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    let response;
    try {
      response = await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }

    // Retry transient Drive failures (429 rate limit, 500/502/503/504 server)
    // with exponential backoff. Honors Retry-After if present. Without this,
    // a brief Drive blip silently lost the upload — caller just got null.
    if ([429, 500, 502, 503, 504].indexOf(response.status) >= 0) {
      var attempt = options.__retryAttempt || 0;
      if (attempt < 3) {
        var retryAfter = response.headers && response.headers.get && response.headers.get('Retry-After');
        var backoffMs = retryAfter ? Math.min(parseInt(retryAfter, 10) * 1000, 10000) : (Math.pow(2, attempt) * 1000);
        console.warn('[Drive] Transient ' + response.status + ' — retrying in ' + backoffMs + 'ms (attempt ' + (attempt + 1) + '/3)');
        await new Promise(function(r) { setTimeout(r, backoffMs); });
        return this.apiCall(url, Object.assign({}, options, { __retryAttempt: attempt + 1 }));
      }
      console.error('[Drive] Transient failure persisted after 3 retries:', response.status, url);
    }

    // If token expired (401), try to refresh silently
    if (response.status === 401) {
      console.log('Google Drive token expired, attempting refresh...');
      localStorage.removeItem('google-drive-token');
      this.accessToken = null;
      this._notifyConnectionChange(false, null);

      // Request new token (will trigger callback)
      return new Promise((resolve, reject) => {
        const originalCallback = this.tokenClient.callback;
        const refreshTimeout = setTimeout(() => {
          this.tokenClient.callback = originalCallback;
          this._notifyConnectionChange(false, 'Token refresh timed out');
          reject(new Error('Token refresh timed out after 30s'));
        }, 30000);

        this.tokenClient.callback = async (tokenResponse) => {
          clearTimeout(refreshTimeout);
          if (tokenResponse.error) {
            this.tokenClient.callback = originalCallback;
            this._notifyConnectionChange(false, 'Token refresh failed');
            reject(new Error('Token refresh failed'));
            return;
          }
          this.accessToken = tokenResponse.access_token;
          localStorage.setItem('google-drive-token', JSON.stringify({
            token: tokenResponse.access_token,
            savedAt: Date.now()
          }));
          this._notifyConnectionChange(true, null);
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

  // Helper: escape single quotes in GDrive query strings
  // e.g. "O'Brien Site" → "O\'Brien Site"
  _escapeQuery: function(str) {
    return String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  },

  // Get or create the JMart Safety folder
  getOrCreateFolder: async function() {
    if (!this.accessToken) return null;

    try {
      // Search for existing folder
      const searchResponse = await this.apiCall(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent("name='" + this._escapeQuery(DRIVE_FOLDER_NAME) + "' and mimeType='application/vnd.google-apps.folder' and trashed=false")}`
      );
      if (!searchResponse.ok) {
        throw new Error('Drive API error: ' + searchResponse.status);
      }
      const searchData = await searchResponse.json();

      if (searchData.files && searchData.files.length > 0) {
        this.folderId = searchData.files[0].id;
        console.log('Found existing Drive folder:', this.folderId);
        return this.folderId;
      }

      // Create new folder
      const createResponse = await this.apiCall('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: DRIVE_FOLDER_NAME,
          mimeType: 'application/vnd.google-apps.folder',
        }),
      });
      if (!createResponse.ok) {
        throw new Error('Drive API error: ' + createResponse.status);
      }
      const createData = await createResponse.json();
      this.folderId = createData.id;
      console.log('Created Drive folder:', this.folderId);
      return this.folderId;
    } catch (error) {
      console.error('Error getting/creating folder:', error);
      if (typeof ToastNotifier !== 'undefined') ToastNotifier.warning('Could not access Google Drive folder');
      return null;
    }
  },

  // Helper: Get or create nested folder path (e.g., "01_Safety_Compliance/Pre-Start_Checklists")
  // Caches in-flight and resolved folder IDs by full path so two concurrent
  // archive uploads for the same site don't race to create duplicate folders.
  _folderPromiseCache: {},
  getOrCreateNestedFolder: async function(folderPath, parentId = null) {
    if (!this.accessToken) return null;

    // Cache key includes parent so the same path under different parents stays distinct.
    const cacheKey = (parentId || this.folderId || 'root') + '::' + folderPath;
    if (this._folderPromiseCache[cacheKey]) {
      return this._folderPromiseCache[cacheKey];
    }

    const promise = (async () => {
      let parent = parentId || this.folderId;
      if (!parent) {
        parent = await this.getOrCreateFolder();
        if (!parent) {
          console.error('getOrCreateNestedFolder: Could not resolve parent folder');
          return null;
        }
      }

      const parts = folderPath.split('/').filter(p => p.trim());
      let currentParent = parent;

      for (const folderName of parts) {
      try {
        // Search for folder
        const searchResponse = await this.apiCall(
          `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent("name='" + this._escapeQuery(folderName) + "' and '" + currentParent + "' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false")}`
        );
        if (!searchResponse.ok) {
          throw new Error('Drive API error: ' + searchResponse.status);
        }
        const searchData = await searchResponse.json();

        if (searchData.files && searchData.files.length > 0) {
          currentParent = searchData.files[0].id;
        } else {
          // Create folder
          const createResponse = await this.apiCall('https://www.googleapis.com/drive/v3/files', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: folderName,
              mimeType: 'application/vnd.google-apps.folder',
              parents: [currentParent],
            }),
          });
          if (!createResponse.ok) {
            throw new Error('Drive API error: ' + createResponse.status);
          }
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
    })();

    // Store the promise so concurrent callers await the same in-flight create.
    // Drop from cache on rejection so a future retry can succeed.
    this._folderPromiseCache[cacheKey] = promise;
    promise.catch(() => { delete this._folderPromiseCache[cacheKey]; });
    promise.then((id) => { if (!id) delete this._folderPromiseCache[cacheKey]; });
    return promise;
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

      const response = await this.apiCall(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error('Drive API error: ' + response.status);
      }
      const data = await response.json();
      console.log('Uploaded to Drive:', filename, 'in folder:', formType || 'root', data.id);
      return data;
    } catch (error) {
      console.error('Upload error:', error);
      if (typeof ToastNotifier !== 'undefined') ToastNotifier.error('Failed to upload PDF to Google Drive');
      return null;
    }
  },

  // Upload an archived PDF to the rotated-forms archive folder.
  // Path: 00_Archive/{site}/{filename}. Used when auto-rotating forms past the
  // per-site cap. Returns the upload result on success, null on failure.
  // The caller MUST treat null as "do not mark archived locally".
  uploadArchivedPDF: async function(pdfBlob, filename, site) {
    if (!this.accessToken) {
      console.error('Not connected to Google Drive — refusing archive upload');
      return null;
    }
    if (!this.folderId) {
      await this.getOrCreateFolder();
    }
    try {
      const safeSite = (site || 'Unsorted').replace(/[\\/:*?"<>|]/g, '_').trim() || 'Unsorted';
      const path = '00_Archive/' + safeSite;
      const targetFolderId = await this.getOrCreateNestedFolder(path);
      if (!targetFolderId) {
        console.error('Could not create archive folder', path);
        return null;
      }
      const metadata = {
        name: filename,
        mimeType: 'application/pdf',
        parents: [targetFolderId],
      };
      const formData = new FormData();
      formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      formData.append('file', pdfBlob);
      const response = await this.apiCall(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        { method: 'POST', body: formData }
      );
      if (!response.ok) {
        console.error('Archive upload failed:', response.status);
        return null;
      }
      const data = await response.json();
      console.log('Archived PDF to Drive:', filename, 'in', path, data.id);
      return data;
    } catch (error) {
      console.error('Archive upload error:', error);
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

    // Check if PDF generation is available
    if (typeof PDFGenerator === 'undefined' || typeof jspdf === 'undefined') {
      console.warn('PDFGenerator or jsPDF not loaded - cannot upload daily forms');
      return { success: false, error: 'PDF generation not available' };
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
        if (typeof ErrorTelemetry !== 'undefined') ErrorTelemetry.captureError(error, 'drive-form-upload');
      }
    }

    console.log(`Uploaded ${results.length}/${todaysForms.length} forms to Drive`);
    return { success: true, uploaded: results.length, total: todaysForms.length, results };
  },

  // Search for files by name pattern
  searchFiles: async function(namePattern) {
    if (!this.accessToken || !this.folderId) return [];

    try {
      const query = `name contains '${this._escapeQuery(namePattern)}' and '${this.folderId}' in parents and trashed=false`;
      const response = await this.apiCall(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,createdTime)`
      );
      if (!response.ok) {
        throw new Error('Drive API error: ' + response.status);
      }
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
      const response = await this.apiCall(
        `https://www.googleapis.com/drive/v3/files/${fileId}`,
        { method: 'DELETE' }
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

      // Only delete files that match this specific form ID to avoid deleting
      // unrelated PDFs (searchFiles uses substring matching on siteName)
      for (const file of files) {
        if (file.name && file.name.indexOf(formId) !== -1) {
          const result = await this.deleteFile(file.id);
          if (result) deleted++;
        }
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
    localStorage.removeItem('google-drive-token');
    localStorage.removeItem('google-drive-auto-connect');
    this._notifyConnectionChange(false, null);
    console.log('Disconnected from Google Drive');
  },

  // Get or create a subfolder for job recordings.
  // Delegates to getOrCreateNestedFolder so concurrent photo uploads for the
  // same site/date share the same folder ID via _folderPromiseCache, instead
  // of racing to create duplicate Job Recordings/SiteA/Date folders.
  getOrCreateRecordingsFolder: async function(siteName, date) {
    if (!this.accessToken) return null;
    try {
      if (!this.folderId) {
        await this.getOrCreateFolder();
      }
      var safeSiteName = (siteName || 'Unsorted').replace(/[<>:"/\\|?*]/g, '-').trim() || 'Unsorted';
      var dateStr = new Date(date).toLocaleDateString('en-AU').replace(/\//g, '-');
      var path = 'Job Recordings/' + safeSiteName + '/' + dateStr;
      var folderId = await this.getOrCreateNestedFolder(path);
      if (!folderId) {
        if (typeof ToastNotifier !== 'undefined') ToastNotifier.warning('Could not create Drive folder for recordings');
        return null;
      }
      console.log('Recordings folder ready:', path, folderId);
      return folderId;
    } catch (error) {
      console.error('Error creating recordings folder structure:', error);
      if (typeof ToastNotifier !== 'undefined') ToastNotifier.warning('Could not create Drive folder for recordings');
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
      // Guard: only process data URIs (base64-encoded images)
      if (!photoData || !photoData.startsWith('data:')) {
        console.error('uploadJobPhoto: expected a data URI but received:', typeof photoData === 'string' ? photoData.substring(0, 30) + '...' : typeof photoData);
        return null;
      }

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

      const response = await this.apiCall(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error('Drive API error: ' + response.status);
      }
      const data = await response.json();
      console.log('Uploaded photo to Drive:', filename, data.id);
      return data;
    } catch (error) {
      console.error('Upload photo error:', error);
      if (typeof ToastNotifier !== 'undefined') ToastNotifier.error('Photo upload to Drive failed');
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
// Handles both: script loaded before window.load, and after window.load already fired
(function() {
  if (!isGoogleDriveConfigured) return;

  var tryInit = function(attempt) {
    if (GoogleDriveSync.isInitialized) return; // Already done
    if (typeof google !== 'undefined' && google.accounts && google.accounts.oauth2) {
      GoogleDriveSync.init();
      console.log('Google Drive init succeeded on attempt', attempt);
    } else if (attempt < 30) {
      if (attempt % 5 === 0) {
        console.log('Google API not ready, retrying... (attempt', attempt, ')');
      }
      setTimeout(function() { tryInit(attempt + 1); }, 1000);
    } else {
      console.error('Google API failed to load after 30 attempts');
    }
  };

  if (document.readyState === 'complete') {
    // Page already loaded — start trying immediately
    tryInit(1);
  } else {
    window.addEventListener('load', function() { tryInit(1); });
  }
})();
