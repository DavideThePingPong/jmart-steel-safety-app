/**
 * dashboard.test.js - Code-structure tests for Dashboard (dashboard.jsx)
 *
 * Guards the simplified pre-start UX:
 * - camera job list comes from saved job templates
 * - dashboard shows one template list plus one recent history list
 * - recent history supports archive and delete actions
 */

const fs = require('fs');
const path = require('path');

const dashboardPath = path.resolve(__dirname, '../../../js/components/dashboard.jsx');
let code;

beforeAll(() => {
  code = fs.readFileSync(dashboardPath, 'utf-8');
});

describe('Dashboard - pre-start dashboard layout', () => {
  it('should derive camera jobs from templateJobNames', () => {
    expect(code).toMatch(/const\s+allJobs\s*=\s*templateJobNames/);
  });

  it('should show a template-specific empty state for the camera menu', () => {
    expect(code).toMatch(/No pre-start templates yet\. Complete a Pre-Start first\./);
  });

  it('should render one template list and one recent history list', () => {
    expect(code).toMatch(/Job Templates/);
    expect(code).toMatch(/Recent Pre-Starts/);
    expect(code).not.toMatch(/Recent Reusable Pre-Starts/);
    expect(code).not.toMatch(/Previous Pre-Starts/);
  });

  it('should cap recent history from recentPrestartForms rather than templates', () => {
    expect(code).toMatch(/const\s+sortedRecentPrestartForms\s*=\s*recentPrestartForms/);
    expect(code).not.toMatch(/recentTemplateItems/);
  });

  it('should exclude archived pre-starts from the stat tile', () => {
    expect(code).toMatch(/form\.type === 'prestart' && form\.status !== 'archived'/);
  });
});

describe('Dashboard - recent pre-start actions', () => {
  it('should expose an archive handler for recent forms', () => {
    expect(code).toMatch(/const\s+handleArchivePrestart\s*=\s*async/);
    expect(code).toMatch(/onArchivePrestart\(form\.id\)/);
  });

  it('should expose a delete handler for recent forms', () => {
    expect(code).toMatch(/const\s+handleDeleteRecentPrestart\s*=\s*async/);
    expect(code).toMatch(/onDeleteRecentPrestart\(form\)/);
  });

  it('should render archive and delete actions for recent forms', () => {
    expect(code).toMatch(/Archive to Firebase and Google Drive/);
    expect(code).toMatch(/Delete recent pre-start/);
  });

  it('should keep template delete actions separate from recent archive actions', () => {
    expect(code).toMatch(/title="Delete template"/);
    expect(code).toMatch(/handleArchivePrestart\(form,\s*siteName\)/);
  });

  it('should delete recent pre-starts without deleting their job templates', () => {
    expect(code).not.toMatch(/This also removes its reusable job template/);
  });
});

describe('Dashboard - photo upload', () => {
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

  it('should have camera and gallery buttons in menu', () => {
    expect(code).toMatch(/Take Photo/);
    expect(code).toMatch(/Choose from Gallery/);
  });

  it('should auto-hide upload status after 8 seconds', () => {
    expect(code).toMatch(/setTimeout\(\s*\(\)\s*=>\s*setUploadStatus\(null\)\s*,\s*8000\s*\)/);
  });
});

describe('Dashboard - quick actions and exports', () => {
  it('should have Quick Actions section', () => {
    expect(code).toMatch(/Quick Actions/);
  });

  it('should include Pre-Start and Recordings quick actions', () => {
    expect(code).toMatch(/Pre-Start/);
    expect(code).toMatch(/Recordings/);
  });

  it('should display the daily safety reminder', () => {
    expect(code).toMatch(/Daily Safety Reminder/);
    expect(code).toMatch(/PPE/);
  });

  it('should export to window.Dashboard', () => {
    expect(code).toMatch(/window\.Dashboard\s*=\s*Dashboard/);
  });
});
