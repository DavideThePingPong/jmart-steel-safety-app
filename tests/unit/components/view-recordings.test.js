/**
 * view-recordings.test.js — Code-structure tests for RecordingsView (view-recordings.jsx)
 *
 * Verifies smart job detection, photo management, Drive upload gates,
 * StorageQuotaManager integration, and component exports.
 */

const fs = require('fs');
const path = require('path');

const recordingsPath = path.resolve(__dirname, '../../../js/components/view-recordings.jsx');
let code;

beforeAll(() => {
  code = fs.readFileSync(recordingsPath, 'utf-8');
});

// ==========================================================================
// Smart Job Detection
// ==========================================================================
describe('RecordingsView — smart job detection', () => {

  it('should auto-detect today\'s prestart for job selection', () => {
    expect(code).toMatch(/new\s+Date\(\)\.toDateString\(\)/);
    expect(code).toMatch(/f\.type\s*===\s*['"]prestart['"]/);
  });

  it('should sort prestarts to get most recent', () => {
    expect(code).toMatch(/\.sort\(\(a,\s*b\)\s*=>/);
  });

  it('should extract siteConducted from prestart data', () => {
    expect(code).toMatch(/latestPrestart\.data\?\.siteConducted/);
  });
});

// ==========================================================================
// Job History
// ==========================================================================
describe('RecordingsView — job history', () => {

  it('should show jobs from last 7 days', () => {
    expect(code).toMatch(/setDate\(.*\.getDate\(\)\s*-\s*7\)/);
  });

  it('should include available sites for manual selection', () => {
    expect(code).toMatch(/defaultSites/);
  });

  it('should use getAvailableJobs function', () => {
    expect(code).toMatch(/const\s+getAvailableJobs\s*=/);
  });

  it('should differentiate prestart jobs from manual site selections', () => {
    expect(code).toMatch(/type:\s*['"]prestart['"]/);
    expect(code).toMatch(/type:\s*['"]site['"]/);
  });
});

// ==========================================================================
// Photo Management
// ==========================================================================
describe('RecordingsView — photo management', () => {

  it('should have camera and gallery inputs', () => {
    expect(code).toMatch(/cameraInputRef/);
    expect(code).toMatch(/galleryInputRef/);
  });

  it('should compress images before storage', () => {
    expect(code).toMatch(/compressImage/);
    expect(code).toMatch(/toDataURL\(['"]image\/jpeg['"]/);
  });

  it('should handle image compression fallback on error', () => {
    expect(code).toMatch(/img\.onerror/);
  });

  it('should remove individual photos', () => {
    expect(code).toMatch(/removePhoto/);
  });

  it('should support clearing all photos', () => {
    expect(code).toMatch(/Clear all/);
    expect(code).toMatch(/setPhotos\(\[\]\)/);
  });
});

// ==========================================================================
// Save & Upload
// ==========================================================================
describe('RecordingsView — save and upload', () => {

  it('should save recordings locally via saveRecordingLocally', () => {
    expect(code).toMatch(/saveRecordingLocally/);
  });

  it('should use StorageQuotaManager.safeRecordingsWrite when available', () => {
    expect(code).toMatch(/StorageQuotaManager\.safeRecordingsWrite/);
  });

  it('should fall back to localStorage when StorageQuotaManager not available', () => {
    expect(code).toMatch(/localStorage\.setItem\(['"]jmart-job-recordings['"]/);
  });

  it('should gate Google Drive upload on GoogleDriveSync.isConnected', () => {
    expect(code).toMatch(/GoogleDriveSync\.isConnected\(\)/);
  });

  it('should call GoogleDriveSync.uploadJobPhotos for Drive upload', () => {
    expect(code).toMatch(/GoogleDriveSync\.uploadJobPhotos/);
  });

  it('should track driveUploaded status on recordings', () => {
    expect(code).toMatch(/driveUploaded:\s*true/);
    expect(code).toMatch(/driveUploaded:\s*false/);
  });
});

// ==========================================================================
// Download & Delete
// ==========================================================================
describe('RecordingsView — download and delete', () => {

  it('should support downloading photos', () => {
    expect(code).toMatch(/downloadPhotos/);
    expect(code).toMatch(/Download to Phone/);
  });

  it('should support deleting saved recordings', () => {
    expect(code).toMatch(/deleteRecording/);
    expect(code).toMatch(/Delete Recording/);
  });
});

// ==========================================================================
// UI Elements
// ==========================================================================
describe('RecordingsView — UI', () => {

  it('should have Job Recordings header', () => {
    expect(code).toMatch(/Job Recordings/);
  });

  it('should show viewing recording modal', () => {
    expect(code).toMatch(/viewingRecording/);
  });

  it('should handle cloud-only photos in viewer', () => {
    expect(code).toMatch(/\[in-firebase\]/);
    expect(code).toMatch(/In cloud/);
  });

  it('should show Storage Info box', () => {
    expect(code).toMatch(/Storage Info/);
  });
});

// ==========================================================================
// Export
// ==========================================================================
describe('RecordingsView — exports', () => {
  it('should export to window.RecordingsView', () => {
    expect(code).toMatch(/window\.RecordingsView\s*=\s*RecordingsView/);
  });
});
