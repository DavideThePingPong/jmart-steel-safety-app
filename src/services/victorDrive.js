/**
 * VICTOR Google Drive Integration
 * Uses existing Safety App OAuth connection
 * Stores MSDS files in: JMart Steel/12_AI_Agents/VICTOR_MSDS/
 */

const VICTOR_DRIVE_FOLDER = 'VICTOR_MSDS';
const VICTOR_DRIVE_PATH = '12_AI_Agents/VICTOR_MSDS';

/**
 * Initialize Victor Drive integration
 * Uses Safety App's existing OAuth token
 */
export function createVictorDriveIntegration() {
  let driveService = null;
  let victorFolderId = null;

  /**
   * Get or create Victor MSDS folder
   */
  async function getVictorFolder(driveService) {
    if (victorFolderId) return victorFolderId;

    // First get or create the parent folder (12_AI_Agents)
    const aiAgentsFolder = await driveService.getOrCreateNestedFolder('12_AI_Agents');

    // Then get or create VICTOR_MSDS inside it
    const victorFolder = await driveService.findFolder(VICTOR_DRIVE_FOLDER, aiAgentsFolder);
    
    if (victorFolder) {
      victorFolderId = victorFolder.id;
      return victorFolderId;
    }

    // Create it if not exists
    const created = await driveService.createFolder(VICTOR_DRIVE_FOLDER, aiAgentsFolder);
    victorFolderId = created.id;
    return victorFolderId;
  }

  /**
   * Upload MSDS PDF to Victor's Drive folder
   */
  async function uploadMsds(pdfBlob, productName, msdsDate = null) {
    if (!driveService || !driveService.isConnected()) {
      throw new Error('Google Drive not connected. Please connect in Safety App first.');
    }

    try {
      // Get or create Victor folder
      const folderId = await getVictorFolder(driveService);

      // Generate filename
      const safeName = productName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filename = msdsDate 
        ? `${safeName}_msds_${msdsDate}.pdf`
        : `${safeName}_msds.pdf`;

      // Upload file
      const result = await driveService.uploadFile(pdfBlob, filename, folderId);

      console.log('✅ MSDS uploaded to Drive:', {
        filename,
        folder: VICTOR_DRIVE_PATH,
        url: result.webViewLink
      });

      return result;
    } catch (error) {
      console.error('❌ MSDS upload failed:', error);
      throw error;
    }
  }

  /**
   * Download MSDS from Victor's Drive folder
   */
  async function downloadMsds(filename) {
    if (!driveService || !driveService.isConnected()) {
      throw new Error('Google Drive not connected');
    }

    const folderId = await getVictorFolder(driveService);
    const files = await driveService.searchFiles(filename, folderId);

    if (files.length === 0) {
      throw new Error(`No file found: ${filename}`);
    }

    // Return first match
    const file = files[0];
    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;
    
    return {
      url: downloadUrl,
      filename: file.name,
      fileId: file.id,
      createdTime: file.createdTime
    };
  }

  /**
   * Check for newer MSDS version
   */
  async function checkForNewerVersion(currentFileName, currentMsdsDate) {
    if (!driveService || !driveService.isConnected()) {
      return null;
    }

    const folderId = await getVictorFolder(driveService);
    const files = await driveService.searchFiles('', folderId);

    // Filter for this product
    const productFiles = files.filter(f => 
      f.name.startsWith(currentFileName.split('_')[0]) && 
      f.name.includes('msds')
    );

    // Find file with newer date
    for (const file of productFiles) {
      if (file.createdTime > currentMsdsDate) {
        return file;
      }
    }

    return null;
  }

  /**
   * Delete old MSDS version
   */
  async function deleteOldMsds(fileId) {
    if (!driveService || !driveService.isConnected()) {
      throw new Error('Google Drive not connected');
    }

    await driveService.deleteFile(fileId);
    console.log('🗑️ Old MSDS deleted from Drive');
  }

  /**
   * Sync all Victor products to Drive
   */
  async function syncAllMsds(products) {
    const results = {
      uploaded: 0,
      failed: 0,
      skipped: 0
    };

    for (const product of products) {
      try {
        await uploadMsds(product.pdfBlob, product.name, product.msdsDate);
        results.uploaded++;
      } catch (error) {
        console.error(`Failed to upload ${product.name}:`, error);
        results.failed++;
      }
    }

    return results;
  }

  /**
   * Get Victor Drive folder structure
   */
  function getFolderStructure() {
    return {
      main: 'JMart Steel',
      path: VICTOR_DRIVE_PATH,
      folder: VICTOR_DRIVE_FOLDER,
      full: `${VICTOR_DRIVE_PATH}/${VICTOR_DRIVE_FOLDER}`
    };
  }

  return {
    setDriveService: (service) => { driveService = service; },
    isConnected: () => driveService?.isConnected(),
    getFolderStructure,
    uploadMsds,
    downloadMsds,
    checkForNewerVersion,
    deleteOldMsds,
    syncAllMsds
  };
}

export default createVictorDriveIntegration;
