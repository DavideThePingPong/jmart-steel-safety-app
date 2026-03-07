/**
 * Google Drive Sync Runtime Tests
 * Tests the actual googleDriveSync.js file loaded into global scope.
 *
 * Covers 5 regression bugs:
 * 1. uploadDailyForms - PDFGenerator/jsPDF availability check
 * 2. searchFiles - null folderId guard
 * 3. getOrCreateNestedFolder - null parent handling
 * 4. apiCall - token refresh 30s timeout
 * 5. uploadJobPhoto - data URI validation
 */

const fs = require('fs');
const path = require('path');

const SCRIPT_PATH = path.resolve(__dirname, '..', '..', '..', 'js', 'googleDriveSync.js');

/**
 * Load googleDriveSync.js into global scope.
 * The file declares `const GoogleDriveSync = { ... }` at top level.
 * We replace that with `global.GoogleDriveSync =` so it's accessible in tests.
 * We also strip the window.addEventListener auto-init block.
 */
function loadGoogleDriveSync() {
  let code = fs.readFileSync(SCRIPT_PATH, 'utf-8');

  // Make the const a global assignment
  code = code.replace(/^const GoogleDriveSync\s*=/m, 'global.GoogleDriveSync =');

  // Strip the window.addEventListener('load', ...) auto-init block
  code = code.replace(/window\.addEventListener\('load'[\s\S]*?\}\);[\s]*$/m, '// [stripped auto-init]');

  eval(code);
}

// --- Globals expected by googleDriveSync.js ---
beforeAll(() => {
  global.isGoogleDriveConfigured = true;
  global.GOOGLE_CLIENT_ID = 'test-client-id';
  global.DRIVE_SCOPES = 'https://www.googleapis.com/auth/drive.file';
  global.DRIVE_FOLDER_NAME = 'JMart Steel Test';
  global.DRIVE_FOLDERS = {
    forms: {
      prestart: '01_Safety_Compliance/Pre-Start_Checklists',
      incident: '01_Safety_Compliance/Incident_Reports'
    },
    photos: '02_Projects'
  };

  loadGoogleDriveSync();
});

// Helper: set up GoogleDriveSync in a "connected" state
function connectSync(folderId) {
  GoogleDriveSync.accessToken = 'test-token';
  GoogleDriveSync.folderId = folderId || 'root-folder-id';
  GoogleDriveSync.isInitialized = true;
  GoogleDriveSync.tokenClient = {
    requestAccessToken: jest.fn(),
    callback: null
  };
}

afterEach(() => {
  // Reset GoogleDriveSync state
  GoogleDriveSync.accessToken = null;
  GoogleDriveSync.folderId = null;
  GoogleDriveSync.isInitialized = false;
  GoogleDriveSync.tokenClient = null;
  GoogleDriveSync._onConnectCallbacks = [];
  GoogleDriveSync._lastError = null;
  jest.restoreAllMocks();
});

// =============================================================
// REGRESSION BUG 1: uploadDailyForms PDFGenerator/jsPDF check
// =============================================================
describe('REGRESSION: uploadDailyForms checks PDFGenerator/jsPDF availability', () => {
  const todayForms = [
    { id: 'form-1', type: 'prestart', createdAt: new Date().toISOString(), data: {} }
  ];

  test('returns error when PDFGenerator is undefined', async () => {
    connectSync();
    // Ensure PDFGenerator is not defined
    delete global.PDFGenerator;

    const result = await GoogleDriveSync.uploadDailyForms(todayForms);

    expect(result.success).toBe(false);
    expect(result.error).toBe('PDF generation not available');
  });

  test('returns error when jspdf is undefined', async () => {
    connectSync();
    // Set PDFGenerator but remove jspdf
    global.PDFGenerator = { generate: jest.fn() };
    const originalJspdf = global.jspdf;
    delete global.jspdf;

    const result = await GoogleDriveSync.uploadDailyForms(todayForms);

    expect(result.success).toBe(false);
    expect(result.error).toBe('PDF generation not available');

    // Restore
    global.jspdf = originalJspdf;
  });

  test('proceeds when both PDFGenerator and jspdf are available', async () => {
    connectSync();
    global.PDFGenerator = {
      generate: jest.fn(() => ({
        doc: { output: jest.fn(() => new Blob(['pdf-content'])) },
        filename: 'test.pdf'
      }))
    };

    // Mock the uploadPDF method to avoid real API calls
    const uploadSpy = jest.spyOn(GoogleDriveSync, 'uploadPDF').mockResolvedValue({ id: 'file-1' });

    const result = await GoogleDriveSync.uploadDailyForms(todayForms);

    expect(result.success).toBe(true);
    expect(result.uploaded).toBe(1);
    expect(global.PDFGenerator.generate).toHaveBeenCalledWith(todayForms[0]);

    uploadSpy.mockRestore();
  });

  test('returns uploaded: 0 when no forms match today', async () => {
    connectSync();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const oldForms = [
      { id: 'old-1', type: 'prestart', createdAt: yesterday.toISOString(), data: {} }
    ];

    const result = await GoogleDriveSync.uploadDailyForms(oldForms);

    expect(result.success).toBe(true);
    expect(result.uploaded).toBe(0);
  });

  test('returns not connected when no accessToken', async () => {
    GoogleDriveSync.accessToken = null;

    const result = await GoogleDriveSync.uploadDailyForms(todayForms);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Not connected');
  });
});

// =============================================================
// REGRESSION BUG 2: searchFiles null folderId guard
// =============================================================
describe('REGRESSION: searchFiles returns [] when folderId is null', () => {
  test('returns empty array when folderId is null', async () => {
    GoogleDriveSync.accessToken = 'test-token';
    GoogleDriveSync.folderId = null;

    const result = await GoogleDriveSync.searchFiles('test-pattern');

    expect(result).toEqual([]);
    // fetch should NOT have been called
    expect(fetch).not.toHaveBeenCalled();
  });

  test('returns empty array when accessToken is null', async () => {
    GoogleDriveSync.accessToken = null;
    GoogleDriveSync.folderId = 'folder-id';

    const result = await GoogleDriveSync.searchFiles('test-pattern');

    expect(result).toEqual([]);
  });

  test('returns files when both accessToken and folderId are set', async () => {
    connectSync();
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        files: [{ id: 'f1', name: 'prestart-2026.pdf', createdTime: '2026-01-01' }]
      })
    });

    const result = await GoogleDriveSync.searchFiles('prestart');

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('f1');
  });

  test('returns empty array on API error', async () => {
    connectSync();
    fetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await GoogleDriveSync.searchFiles('test');

    expect(result).toEqual([]);
  });
});

// =============================================================
// REGRESSION BUG 3: getOrCreateNestedFolder null parent handling
// =============================================================
describe('REGRESSION: getOrCreateNestedFolder null parent handling', () => {
  test('returns null when accessToken is null', async () => {
    GoogleDriveSync.accessToken = null;

    const result = await GoogleDriveSync.getOrCreateNestedFolder('Safety/PreStart');

    expect(result).toBeNull();
  });

  test('uses parentId when explicitly provided', async () => {
    connectSync();
    // Search for "Safety" subfolder inside parentId
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ files: [{ id: 'safety-folder' }] })
    });

    const result = await GoogleDriveSync.getOrCreateNestedFolder('Safety', 'explicit-parent');

    expect(result).toBe('safety-folder');
    // Verify the query included explicit-parent
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('explicit-parent'),
      expect.any(Object)
    );
  });

  test('falls back to this.folderId when parentId is not given', async () => {
    connectSync('my-root-folder');
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ files: [{ id: 'sub-1' }] })
    });

    const result = await GoogleDriveSync.getOrCreateNestedFolder('SubFolder');

    expect(result).toBe('sub-1');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('my-root-folder'),
      expect.any(Object)
    );
  });

  test('calls getOrCreateFolder when both parentId and folderId are null', async () => {
    GoogleDriveSync.accessToken = 'test-token';
    GoogleDriveSync.folderId = null;
    GoogleDriveSync.isInitialized = true;

    // getOrCreateFolder will search for the root folder
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ files: [{ id: 'resolved-root' }] })
    });
    // Then the nested folder search
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ files: [{ id: 'nested-result' }] })
    });

    const result = await GoogleDriveSync.getOrCreateNestedFolder('SubFolder');

    expect(result).toBe('nested-result');
  });

  test('returns null when getOrCreateFolder fails to resolve parent', async () => {
    GoogleDriveSync.accessToken = 'test-token';
    GoogleDriveSync.folderId = null;
    GoogleDriveSync.isInitialized = true;

    // getOrCreateFolder fails
    fetch.mockRejectedValueOnce(new Error('API error'));

    const result = await GoogleDriveSync.getOrCreateNestedFolder('SubFolder');

    expect(result).toBeNull();
  });
});

// =============================================================
// REGRESSION BUG 4: apiCall token refresh 30s timeout
// =============================================================
describe('REGRESSION: apiCall has 30s token refresh timeout', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('rejects with timeout error after 30s when token refresh stalls', async () => {
    connectSync();
    const tokenClient = GoogleDriveSync.tokenClient;

    // First fetch returns 401
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'unauthorized' })
    });

    // requestAccessToken does nothing (simulating stall)
    tokenClient.requestAccessToken = jest.fn();

    let caughtError = null;
    const apiPromise = GoogleDriveSync.apiCall(
      'https://www.googleapis.com/drive/v3/files', {}
    ).catch(err => { caughtError = err; });

    // Flush microtasks so the fetch resolves and the 401 path sets up the setTimeout
    await Promise.resolve();
    await Promise.resolve();

    // Advance past the 30s timeout
    jest.advanceTimersByTime(31000);

    // Let the rejection propagate
    await apiPromise;

    expect(caughtError).not.toBeNull();
    expect(caughtError.message).toBe('Token refresh timed out after 30s');
  });

  test('resolves when token refresh succeeds before timeout', async () => {
    connectSync();
    const tokenClient = GoogleDriveSync.tokenClient;

    // First fetch returns 401
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'unauthorized' })
    });

    // Retry fetch after token refresh succeeds
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ files: [] })
    });

    // When requestAccessToken is called, immediately invoke the callback
    tokenClient.requestAccessToken = jest.fn(() => {
      // Simulate the GIS callback with a new token
      if (tokenClient.callback) {
        tokenClient.callback({ access_token: 'new-token' });
      }
    });

    const response = await GoogleDriveSync.apiCall('https://www.googleapis.com/drive/v3/files', {});

    expect(response.ok).toBe(true);
    expect(GoogleDriveSync.accessToken).toBe('new-token');
  });

  test('rejects when token refresh callback returns an error', async () => {
    connectSync();
    const tokenClient = GoogleDriveSync.tokenClient;

    // First fetch returns 401
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 401
    });

    // requestAccessToken invokes callback with error
    tokenClient.requestAccessToken = jest.fn(() => {
      if (tokenClient.callback) {
        tokenClient.callback({ error: 'access_denied' });
      }
    });

    await expect(
      GoogleDriveSync.apiCall('https://www.googleapis.com/drive/v3/files', {})
    ).rejects.toThrow('Token refresh failed');
  });
});

// =============================================================
// REGRESSION BUG 5: uploadJobPhoto data URI validation
// =============================================================
describe('REGRESSION: uploadJobPhoto validates data URI', () => {
  test('returns null for non-string photoData', async () => {
    connectSync();

    const result = await GoogleDriveSync.uploadJobPhoto(12345, 'photo.jpg', 'Site A', new Date());

    expect(result).toBeNull();
  });

  test('returns null for string that does not start with data:', async () => {
    connectSync();

    const result = await GoogleDriveSync.uploadJobPhoto(
      'https://example.com/photo.jpg',
      'photo.jpg',
      'Site A',
      new Date()
    );

    expect(result).toBeNull();
  });

  test('returns null for null photoData', async () => {
    connectSync();

    const result = await GoogleDriveSync.uploadJobPhoto(null, 'photo.jpg', 'Site A', new Date());

    expect(result).toBeNull();
  });

  test('returns null for undefined photoData', async () => {
    connectSync();

    const result = await GoogleDriveSync.uploadJobPhoto(undefined, 'photo.jpg', 'Site A', new Date());

    expect(result).toBeNull();
  });

  test('returns null when not connected', async () => {
    GoogleDriveSync.accessToken = null;

    const result = await GoogleDriveSync.uploadJobPhoto(
      'data:image/jpeg;base64,/9j/4AAQ',
      'photo.jpg',
      'Site A',
      new Date()
    );

    expect(result).toBeNull();
  });
});

// =============================================================
// Additional edge case tests
// =============================================================
describe('GoogleDriveSync - additional edge cases', () => {
  test('isConnected returns false when accessToken is null', () => {
    GoogleDriveSync.accessToken = null;
    expect(GoogleDriveSync.isConnected()).toBe(false);
  });

  test('isConnected returns true when accessToken is set', () => {
    GoogleDriveSync.accessToken = 'some-token';
    expect(GoogleDriveSync.isConnected()).toBe(true);
  });

  test('disconnect clears token, folderId, and localStorage', () => {
    connectSync('folder-123');
    GoogleDriveSync.disconnect();

    expect(GoogleDriveSync.accessToken).toBeNull();
    expect(GoogleDriveSync.folderId).toBeNull();
    expect(localStorage.removeItem).toHaveBeenCalledWith('google-drive-token');
  });

  test('_escapeQuery escapes single quotes', () => {
    expect(GoogleDriveSync._escapeQuery("O'Brien")).toBe("O\\'Brien");
  });

  test('_escapeQuery escapes backslashes', () => {
    expect(GoogleDriveSync._escapeQuery('path\\to\\file')).toBe('path\\\\to\\\\file');
  });

  test('apiCall throws when not connected', async () => {
    GoogleDriveSync.accessToken = null;

    await expect(
      GoogleDriveSync.apiCall('https://example.com', {})
    ).rejects.toThrow('Not connected to Google Drive');
  });

  test('deleteFile returns true on 204 status', async () => {
    connectSync();
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 204
    });

    const result = await GoogleDriveSync.deleteFile('file-id');
    expect(result).toBe(true);
  });

  test('deleteFile returns false on error', async () => {
    connectSync();
    fetch.mockRejectedValueOnce(new Error('Network down'));

    const result = await GoogleDriveSync.deleteFile('file-id');
    expect(result).toBe(false);
  });
});
