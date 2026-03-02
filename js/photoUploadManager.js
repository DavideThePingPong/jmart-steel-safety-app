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
    if (!GoogleDriveSync.isConnected()) return null;

    try {
      // Ensure main folder exists
      if (!GoogleDriveSync.folderId) {
        await GoogleDriveSync.getOrCreateFolder();
      }

      const safeJobName = jobName.replace(/[<>:"/\\|?*]/g, '_');

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
      return null;
    }
  },

  // Get or create date subfolder within Photos folder
  getOrCreateDateFolder: async function(photosFolderId) {
    if (!GoogleDriveSync.isConnected() || !photosFolderId) return photosFolderId;

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    try {
      // Search for today's folder
      const dateSearch = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='${today}' and '${photosFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        { headers: { 'Authorization': `Bearer ${GoogleDriveSync.accessToken}` } }
      );
      const dateData = await dateSearch.json();

      if (dateData.files && dateData.files.length > 0) {
        return dateData.files[0].id;
      }

      // Create date folder
      const createDate = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GoogleDriveSync.accessToken}`,
          'Content-Type': 'application/json',
        },
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

      const response = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${GoogleDriveSync.accessToken}` },
          body: formData,
        }
      );

      const data = await response.json();
      console.log('Uploaded to Drive:', filename, data.id);
      return { fileId: data.id, filename };
    } catch (error) {
      console.error('Drive upload error:', error);
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
    if (firebaseDb && results.success) {
      try {
        const uploadLog = {
          jobName,
          filename: file.name,
          size: file.size,
          type: file.type,
          uploadedAt: new Date().toISOString(),
          driveFileId: results.drive ? results.drive.fileId : null,
          deviceId: DeviceAuthManager.deviceId
        };
        await firebaseDb.ref('jmart-safety/photoUploads').push(uploadLog);
      } catch (e) {
        console.error('Error logging upload:', e);
      }
    }

    return results;
  }
};

// Initialize Photo Upload Manager
PhotoUploadManager.init();
