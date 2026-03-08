/**
 * modals.test.js — Code-structure tests for modals.jsx
 *
 * Verifies null guards, key logic patterns, and window exports for all
 * 9 modal/banner components extracted from app.jsx.
 */

const fs = require('fs');
const path = require('path');

const modalsPath = path.resolve(__dirname, '../../../js/components/modals.jsx');
let code;

beforeAll(() => {
  code = fs.readFileSync(modalsPath, 'utf-8');
});

// ==========================================================================
// SuccessModal
// ==========================================================================
describe('SuccessModal', () => {
  it('should return null when successModal is falsy', () => {
    expect(code).toMatch(/if\s*\(\s*!successModal\s*\)\s*return\s+null/);
  });

  it('should reference PDFGenerator.folderMap for form type display', () => {
    expect(code).toMatch(/PDFGenerator\.folderMap/);
  });

  it('should check FirebaseSync.isConnected for sync message', () => {
    expect(code).toMatch(/FirebaseSync\.isConnected\(\)/);
  });

  it('should have Download PDF and Back to Dashboard buttons', () => {
    expect(code).toMatch(/Download PDF/);
    expect(code).toMatch(/Back to Dashboard/);
  });
});

// ==========================================================================
// ViewFormModal
// ==========================================================================
describe('ViewFormModal', () => {
  it('should return null when viewFormModal is falsy', () => {
    expect(code).toMatch(/if\s*\(\s*!viewFormModal\s*\)\s*return\s+null/);
  });

  it('should have Edit, Download, and Delete buttons', () => {
    expect(code).toMatch(/Modify Form/);
    expect(code).toMatch(/Download PDF/);
    expect(code).toMatch(/Delete Form/);
  });

  it('should display form date in Australian locale', () => {
    expect(code).toMatch(/en-AU/);
  });
});

// ==========================================================================
// DeleteConfirmModal
// ==========================================================================
describe('DeleteConfirmModal', () => {
  it('should return null when deleteConfirmModal is falsy', () => {
    expect(code).toMatch(/if\s*\(\s*!deleteConfirmModal\s*\)\s*return\s+null/);
  });

  it('should check isFormBackedUp before showing backup warning', () => {
    expect(code).toMatch(/isFormBackedUp\(deleteConfirmModal\.id\)/);
  });

  it('should warn when form has NOT been backed up', () => {
    expect(code).toMatch(/NOT been backed up/);
  });

  it('should show "Download PDF First" option for unbacked-up forms', () => {
    expect(code).toMatch(/Download PDF First/);
  });

  it('should have Delete Permanently and Cancel buttons', () => {
    expect(code).toMatch(/Delete Permanently/);
    expect(code).toMatch(/Cancel/);
  });
});

// ==========================================================================
// UpdateConfirmModal
// ==========================================================================
describe('UpdateConfirmModal', () => {
  it('should return null when updateConfirmModal is falsy', () => {
    expect(code).toMatch(/if\s*\(\s*!updateConfirmModal\s*\)\s*return\s+null/);
  });

  it('should disable buttons during isUpdating', () => {
    expect(code).toMatch(/disabled=\{isUpdating\}/);
  });

  it('should check GoogleDriveSync.isConnected for update message', () => {
    expect(code).toMatch(/GoogleDriveSync\.isConnected\(\)/);
  });

  it('should have Confirm, Keep Editing, and Cancel buttons', () => {
    expect(code).toMatch(/Yes, Replace Old Version/);
    expect(code).toMatch(/Keep Editing/);
  });
});

// ==========================================================================
// NewDeviceNotification
// ==========================================================================
describe('NewDeviceNotification', () => {
  it('should return null when notification is falsy or not admin', () => {
    expect(code).toMatch(/if\s*\(\s*!notification\s*\|\|\s*!isDeviceAdmin\s*\)\s*return\s+null/);
  });

  it('should have Approve and Deny buttons', () => {
    expect(code).toMatch(/Approve/);
    expect(code).toMatch(/Deny/);
  });

  it('should display device type and browser', () => {
    expect(code).toMatch(/notification\.type/);
    expect(code).toMatch(/notification\.browser/);
  });
});

// ==========================================================================
// PendingDevicesBanner
// ==========================================================================
describe('PendingDevicesBanner', () => {
  it('should return null when no pending devices or not admin or has notification', () => {
    expect(code).toMatch(/pendingDevices\.length\s*===\s*0\s*\|\|\s*!isDeviceAdmin\s*\|\|\s*hasNotification/);
  });

  it('should show count of pending devices', () => {
    expect(code).toMatch(/pendingDevices\.length/);
  });
});

// ==========================================================================
// SyncStatusBanner
// ==========================================================================
describe('SyncStatusBanner', () => {
  it('should only show on error or pending with count > 0', () => {
    expect(code).toMatch(/syncStatus\s*!==\s*'error'/);
    expect(code).toMatch(/pendingSyncCount\s*>\s*0/);
  });

  it('should have a Retry Now button', () => {
    expect(code).toMatch(/Retry Now/);
  });
});

// ==========================================================================
// FirebaseSetupBanner
// ==========================================================================
describe('FirebaseSetupBanner', () => {
  it('should return null when showSyncBanner is false or Firebase is connected', () => {
    expect(code).toMatch(/!showSyncBanner\s*\|\|\s*FirebaseSync\.isConnected\(\)/);
  });

  it('should have Setup and Later options', () => {
    expect(code).toMatch(/Later/);
    expect(code).toMatch(/Setup/);
  });
});

// ==========================================================================
// InstallPromptBanner
// ==========================================================================
describe('InstallPromptBanner', () => {
  it('should return null when showInstallPrompt is false', () => {
    expect(code).toMatch(/if\s*\(\s*!showInstallPrompt\s*\)\s*return\s+null/);
  });

  it('should have Install and Later options', () => {
    expect(code).toMatch(/Install J&M/);
    expect(code).toMatch(/Later/);
  });
});

// ==========================================================================
// Window Exports
// ==========================================================================
describe('modals.jsx — window exports', () => {
  const expectedExports = [
    'SuccessModal', 'ViewFormModal', 'DeleteConfirmModal', 'UpdateConfirmModal',
    'NewDeviceNotification', 'PendingDevicesBanner', 'SyncStatusBanner',
    'FirebaseSetupBanner', 'InstallPromptBanner'
  ];

  expectedExports.forEach(name => {
    it(`should export window.${name}`, () => {
      expect(code).toMatch(new RegExp(`window\\.${name}\\s*=\\s*${name}`));
    });
  });
});
