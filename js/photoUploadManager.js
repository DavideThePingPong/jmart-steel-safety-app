// Photo Upload Manager
// Extracted from index.html for maintainability
// ========================================
// PHOTO UPLOAD MANAGER (Google Drive Only)
// Uses project-based folder structure:
// JMart Steel/02_Projects/{JobName}/Photos/{YYYY-MM-DD}/
// ========================================
const PhotoUploadManager = {
  // Initialize - just log that we're using Google Drive
  init: function() {
    console.log('PhotoUploadManager initialized - using Google Drive for photo storage');
    console.log('Photo structure: JMart Steel/02_Projects/{Job}/Photos/{Date}/');
  },

  // Get or create project folder with Photos subfolder
  // Structure: 02_Projects/{JobName}/Photos/{Date}/
  getOrCreateJobFolder: async function(jobName) {
    if (typeof GoogleDriveSync === 'undefined' || !GoogleDriveSync.isConnected()) return null;

    try {
      // Ensure main folder exists
      if (!GoogleDriveSync.folderId) {
        await GoogleDriveSync.getOrCreateFolder();
      }

      const safeJobName = (jobName || 'unknown-job').replace(/[<>:"/\\|?*]/g, '_');

      // Create nested path: 02_Projects/{JobName}/Photos
      const folderPath = `${DRIVE_FOLDERS.photos}/${safeJobName}/Photos`;
      const photosFolderId = await GoogleDriveSync.getOrCreateNestedFolder(folderPath);

      if (photosFolderId) {
        console.log(`Photo folder ready: 02_Projects/${safeJobName}/Photos`);
        return photosFolderId;
      }

      // Fallback: create in root if nested creation fails
      console.warn('Could not create project photo folder, using root');
      return GoogleDriveSync.folderId;
    } catch (error) {
      console.error('Error creating job folder:', error);
      if (typeof ToastNotifier !== 'undefined') ToastNotifier.warning('Could not create photo folder on Drive');
      return null;
    }
  },

  // Get or create date subfolder within Photos folder
  getOrCreateDateFolder: async function(photosFolderId) {
    if (!GoogleDriveSync.isConnected() || !photosFolderId) return photosFolderId;

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    try {
      // Search for today's folder
      const dateSearch = await GoogleDriveSync.apiCall(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent("name='" + GoogleDriveSync._escapeQuery(today) + "' and '" + photosFolderId + "' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false")}`
      );
      const dateData = await dateSearch.json();

      if (dateData.files && dateData.files.length > 0) {
        return dateData.files[0].id;
      }

      // Create date folder
      const createDate = await GoogleDriveSync.apiCall('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: today,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [photosFolderId],
        }),
      });
      const dateResult = await createDate.json();
      console.log(`Created date folder: ${today}`);
      return dateResult.id;
    } catch (error) {
      console.error('Error creating date folder:', error);
      return photosFolderId; // Fallback to Photos folder
    }
  },

  // Upload photo to Google Drive
  uploadToDrive: async function(file, jobName) {
    if (!GoogleDriveSync.isConnected()) {
      console.error('Google Drive not connected');
      return null;
    }

    try {
      const jobFolderId = await this.getOrCreateJobFolder(jobName);
      if (!jobFolderId) return null;

      const dateFolderId = await this.getOrCreateDateFolder(jobFolderId);

      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filename = `${timestamp}_${safeName}`;

      const metadata = {
        name: filename,
        mimeType: file.type,
        parents: [dateFolderId],
      };

      const formData = new FormData();
      formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      formData.append('file', file);

      const response = await GoogleDriveSync.apiCall(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
          method: 'POST',
          body: formData,
        }
      );

      const data = await response.json();
      console.log('Uploaded to Drive:', filename, data.id);
      return { fileId: data.id, filename };
    } catch (error) {
      console.error('Drive upload error:', error);
      if (typeof ToastNotifier !== 'undefined') ToastNotifier.error('Photo upload to Drive failed');
      return null;
    }
  },

  // Upload photo to Google Drive (with offline queue support)
  uploadPhoto: async function(file, jobName, onProgress) {
    const results = {
      drive: null,
      success: false,
      queued: false
    };

    // Check if offline or not connected - queue for later
    if (!navigator.onLine || !GoogleDriveSync.isConnected()) {
      if (onProgress) onProgress('Offline - queueing photo...', 50);
      try {
        await OfflinePhotoQueue.addToQueue(file, jobName);
        results.queued = true;
        results.success = true; // Consider it a success since it's queued
        if (onProgress) onProgress('Photo queued for upload when online', 100);
        console.log(`Photo queued for offline upload: ${file.name}`);
      } catch (e) {
        console.error('Error queueing photo:', e);
        if (typeof ToastNotifier !== 'undefined') ToastNotifier.error('Failed to save photo for later upload');
        if (onProgress) onProgress('Failed to queue photo', 100);
      }
      return results;
    }

    // Upload to Google Drive
    if (onProgress) onProgress('Uploading to Google Drive...', 30);
    results.drive = await this.uploadToDrive(file, jobName);

    if (onProgress) onProgress('Complete!', 100);

    results.success = results.drive !== null;

    // Log to Firebase for tracking
    if (typeof firebaseDb !== 'undefined' && firebaseDb && results.success) {
      try {
        const uploadLog = {
          jobName,
          filename: file.name,
          size: file.size,
          type: file.type,
          uploadedAt: new Date().toISOString(),
          driveFileId: results.drive ? results.drive.fileId : null,
          deviceId: (typeof DeviceAuthManager !== 'undefined' && DeviceAuthManager.deviceId) ? DeviceAuthManager.deviceId : 'unknown'
        };
        await firebaseDb.ref('jmart-safety/photoUploads').push(uploadLog);
      } catch (e) {
        console.error('Error logging upload:', e);
        if (typeof ErrorTelemetry !== 'undefined') ErrorTelemetry.captureError(e, 'photo-upload-log');
      }
    }

    return results;
  }
};

// ========================================
// PHOTO DOWNLOAD HELPER
// Handles data: URLs, HTTP URLs (Firebase Storage), and [in-firebase] stubs
// ========================================
function downloadPhotoFile(photoData, filename) {
  if (!photoData || photoData === '[in-firebase]') {
    if (typeof ToastNotifier !== 'undefined') ToastNotifier.info('Photo is in the cloud — not available for local download');
    return;
  }

  // data: URL — use <a download> (works same-origin)
  if (photoData.startsWith('data:')) {
    var link = document.createElement('a');
    link.href = photoData;
    link.download = filename || 'photo.jpg';
    link.click();
    return;
  }

  // HTTP/HTTPS URL (e.g. Firebase Storage) — fetch as blob then download
  // TASK-004: Added timeout, user feedback, error telemetry, retry with no-cors
  if (photoData.startsWith('http')) {
    if (typeof ToastNotifier !== 'undefined') ToastNotifier.info('Downloading photo...');

    // AbortController for 8s timeout
    var controller = new AbortController();
    var timeoutId = setTimeout(function() { controller.abort(); }, 8000);

    fetch(photoData, { mode: 'cors', signal: controller.signal })
      .then(function(resp) {
        clearTimeout(timeoutId);
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        return resp.blob();
      })
      .then(function(blob) {
        var url = URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href = url;
        link.download = filename || 'photo.jpg';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(function() { URL.revokeObjectURL(url); }, 5000);
        if (typeof ToastNotifier !== 'undefined') ToastNotifier.success('Photo downloaded');
      })
      .catch(function(err) {
        clearTimeout(timeoutId);
        console.error('Photo download failed:', err);
        if (typeof ErrorTelemetry !== 'undefined') {
          ErrorTelemetry.captureError(err, 'photo-download-fail');
        }
        // Fallback: open in new tab so user can right-click save
        window.open(photoData, '_blank');
        if (typeof ToastNotifier !== 'undefined') {
          ToastNotifier.warning('Direct download blocked by server. Opened in new tab - right-click to save.');
        }
      });
    return;
  }

  // Unknown format — try opening directly
  if (typeof ToastNotifier !== 'undefined') ToastNotifier.warning('Unrecognised photo format');
}

// Initialize Photo Upload Manager
PhotoUploadManager.init();
