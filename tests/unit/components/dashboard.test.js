/**
 * dashboard.test.js — Code-structure tests for Dashboard (dashboard.jsx)
 *
 * Verifies form type labels, default sites fallback, recent forms limit,
 * photo upload flow, and component structure.
 */

const fs = require('fs');
const path = require('path');

const dashboardPath = path.resolve(__dirname, '../../../js/components/dashboard.jsx');
let code;

beforeAll(() => {
  code = fs.readFileSync(dashboardPath, 'utf-8');
});

// ==========================================================================
// Form Type Labels
// ==========================================================================
describe('Dashboard — form type labels', () => {
  const expectedFormTypes = ['prestart', 'inspection', 'itp', 'incident', 'toolbox', 'steel-itp'];

  expectedFormTypes.forEach(type => {
    it(`should define label for "${type}" form type`, () => {
      expect(code).toContain(`'${type}'`);
    });
  });

  it('should define formTypeLabels object', () => {
    expect(code).toMatch(/const\s+formTypeLabels\s*=/);
  });
});

// ==========================================================================
// Default Sites Fallback
// ==========================================================================
describe('Dashboard — default sites', () => {
  it('should define defaultSites array', () => {
    expect(code).toMatch(/const\s+defaultSites\s*=/);
  });

  it('should use sites prop when available, fallback to defaults', () => {
    expect(code).toMatch(/sites\.length\s*>\s*0\s*\?\s*sites\s*:\s*defaultSites/);
  });
});

// ==========================================================================
// Recent Forms
// ==========================================================================
describe('Dashboard — recent forms', () => {
  it('should limit recent forms to 10', () => {
    expect(code).toMatch(/forms\.slice\(\s*0\s*,\s*10\s*\)/);
  });

  it('should display form site/location in recent forms list', () => {
    expect(code).toMatch(/siteConducted/);
  });

  it('should show backup status indicator', () => {
    expect(code).toMatch(/isFormBackedUp/);
  });
});

// ==========================================================================
// Photo Upload Flow
// ==========================================================================
describe('Dashboard — photo upload', () => {
  it('should have camera and gallery input refs', () => {
    expect(code).toMatch(/cameraInputRef/);
    expect(code).toMatch(/galleryInputRef/);
  });

  it('should use PhotoUploadManager.uploadPhoto', () => {
    expect(code).toMatch(/PhotoUploadManager\.uploadPhoto/);
  });

  it('should track upload success and fail counts', () => {
    expect(code).toMatch(/successCount/);
    expect(code).toMatch(/failCount/);
  });

  it('should handle job selection with handleJobSelect', () => {
    expect(code).toMatch(/handleJobSelect/);
  });

  it('should have camera and gallery buttons in menu', () => {
    expect(code).toMatch(/Take Photo/);
    expect(code).toMatch(/Choose from Gallery/);
  });

  it('should auto-hide upload status after 8 seconds', () => {
    expect(code).toMatch(/setTimeout\(\s*\(\)\s*=>\s*setUploadStatus\(null\)\s*,\s*8000\s*\)/);
  });
});

// ==========================================================================
// Quick Actions
// ==========================================================================
describe('Dashboard — quick actions', () => {
  it('should have Quick Actions section', () => {
    expect(code).toMatch(/Quick Actions/);
  });

  it('should include Pre-Start in quick actions', () => {
    expect(code).toMatch(/Pre-Start/);
  });

  it('should include Recordings in quick actions', () => {
    expect(code).toMatch(/Recordings/);
  });
});

// ==========================================================================
// Safety Reminder
// ==========================================================================
describe('Dashboard — safety reminder', () => {
  it('should display daily safety reminder about PPE', () => {
    expect(code).toMatch(/Daily Safety Reminder/);
    expect(code).toMatch(/PPE/);
  });
});

// ==========================================================================
// Export
// ==========================================================================
describe('Dashboard — exports', () => {
  it('should export to window.Dashboard', () => {
    expect(code).toMatch(/window\.Dashboard\s*=\s*Dashboard/);
  });
});
