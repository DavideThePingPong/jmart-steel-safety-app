/**
 * Offline Photo Queue Tests
 * Tests the actual offlinePhotoQueue.js file loaded into global scope.
 *
 * REGRESSION BUG: processQueue had infinite retry - no max retries.
 * Fix added a 3-attempt limit where items failing 3 times are removed from queue.
 */

const fs = require('fs');
const path = require('path');

const SCRIPT_PATH = path.resolve(__dirname, '..', '..', '..', 'js', 'offlinePhotoQueue.js');

/**
 * Load offlinePhotoQueue.js into global scope.
 * The file declares `const OfflinePhotoQueue = { ... }` at top level.
 * We replace that with `global.OfflinePhotoQueue =` so it's accessible in tests.
 * We also strip the auto-init call at the bottom of the file.
 */
function loadOfflinePhotoQueue() {
  let code = fs.readFileSync(SCRIPT_PATH, 'utf-8');

  // Make the const a global assignment
  code = code.replace(/^const OfflinePhotoQueue\s*=/m, 'global.OfflinePhotoQueue =');

  // Strip auto-init at the bottom
  code = code.replace(/^OfflinePhotoQueue\.init\(\);/m, '// [stripped auto-init]');

  eval(code);
}

beforeAll(() => {
  // GoogleDriveSync stub (referenced in offlinePhotoQueue.js)
  global.GoogleDriveSync = {
    isConnected: jest.fn(() => true)
  };

  // PhotoUploadManager stub (used by processQueue to upload)
  global.PhotoUploadManager = {
    uploadToDrive: jest.fn()
  };

  // StorageQuotaManager is optional - leave undefined to skip quota checks

  loadOfflinePhotoQueue();
});

afterEach(() => {
  // Reset queue state
  OfflinePhotoQueue.queue = [];
  OfflinePhotoQueue.isProcessing = false;
  OfflinePhotoQueue.listeners = [];
  jest.clearAllMocks();
  // Restore navigator.onLine to true
  Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
});

// =============================================================
// REGRESSION: processQueue max retry logic
// =============================================================
describe('REGRESSION: processQueue enforces 3-retry limit', () => {
  function makeQueueItem(id, retries) {
    return {
      id: id || 'item-1',
      jobName: 'Test Job',
      filename: 'photo.jpg',
      type: 'image/jpeg',
      size: 1024,
      data: 'data:image/jpeg;base64,/9j/test',
      queuedAt: new Date().toISOString(),
      retries: retries || 0
    };
  }

  test('removes item from queue after 3 failed upload attempts (null result)', async () => {
    const item = makeQueueItem('retry-item', 2); // already failed twice
    OfflinePhotoQueue.queue = [item];

    // fetch succeeds for base64 conversion but upload returns null
    fetch.mockResolvedValue({
      blob: () => Promise.resolve(new Blob(['photo'], { type: 'image/jpeg' }))
    });
    PhotoUploadManager.uploadToDrive.mockResolvedValue(null);

    await OfflinePhotoQueue.processQueue();

    // Item should be removed (3rd failure = removal)
    expect(OfflinePhotoQueue.queue).toHaveLength(0);
  });

  test('removes item from queue after 3 failed attempts (exception)', async () => {
    const item = makeQueueItem('error-item', 2); // already failed twice
    OfflinePhotoQueue.queue = [item];

    // fetch for base64-to-blob conversion throws
    fetch.mockRejectedValue(new Error('Network error'));

    await OfflinePhotoQueue.processQueue();

    // Item should be removed (3rd failure via exception = removal)
    expect(OfflinePhotoQueue.queue).toHaveLength(0);
  });

  test('keeps item in queue when retries < 3 on failure', async () => {
    const item = makeQueueItem('keep-item', 0); // first failure
    OfflinePhotoQueue.queue = [item];

    fetch.mockResolvedValue({
      blob: () => Promise.resolve(new Blob(['photo'], { type: 'image/jpeg' }))
    });
    PhotoUploadManager.uploadToDrive.mockResolvedValue(null);

    await OfflinePhotoQueue.processQueue();

    // Item should still be in queue with retries incremented
    expect(OfflinePhotoQueue.queue).toHaveLength(1);
    expect(OfflinePhotoQueue.queue[0].retries).toBe(1);
  });

  test('increments retry counter on each failed upload', async () => {
    const item = makeQueueItem('counting-item', 1); // failed once already
    OfflinePhotoQueue.queue = [item];

    fetch.mockResolvedValue({
      blob: () => Promise.resolve(new Blob(['photo'], { type: 'image/jpeg' }))
    });
    PhotoUploadManager.uploadToDrive.mockResolvedValue(null);

    await OfflinePhotoQueue.processQueue();

    // Should now have retries = 2
    expect(OfflinePhotoQueue.queue).toHaveLength(1);
    expect(OfflinePhotoQueue.queue[0].retries).toBe(2);
  });

  test('successful upload removes item regardless of retry count', async () => {
    const item = makeQueueItem('success-item', 2); // failed twice, this is 3rd attempt
    OfflinePhotoQueue.queue = [item];

    fetch.mockResolvedValue({
      blob: () => Promise.resolve(new Blob(['photo'], { type: 'image/jpeg' }))
    });
    PhotoUploadManager.uploadToDrive.mockResolvedValue({ id: 'drive-file-1' });

    await OfflinePhotoQueue.processQueue();

    // Item should be removed (success)
    expect(OfflinePhotoQueue.queue).toHaveLength(0);
  });

  test('processes multiple items with mixed results', async () => {
    const successItem = makeQueueItem('success', 0);
    const failItem = makeQueueItem('fail-3rd', 2);
    const retryItem = makeQueueItem('retry', 0);
    OfflinePhotoQueue.queue = [successItem, failItem, retryItem];

    fetch.mockResolvedValue({
      blob: () => Promise.resolve(new Blob(['photo'], { type: 'image/jpeg' }))
    });

    PhotoUploadManager.uploadToDrive
      .mockResolvedValueOnce({ id: 'ok' })    // successItem succeeds
      .mockResolvedValueOnce(null)              // failItem fails (3rd time = removed)
      .mockResolvedValueOnce(null);             // retryItem fails (1st time = kept)

    await OfflinePhotoQueue.processQueue();

    // Only retryItem should remain
    expect(OfflinePhotoQueue.queue).toHaveLength(1);
    expect(OfflinePhotoQueue.queue[0].id).toBe('retry');
    expect(OfflinePhotoQueue.queue[0].retries).toBe(1);
  });
});

// =============================================================
// processQueue guard conditions
// =============================================================
describe('processQueue guard conditions', () => {
  test('does nothing when queue is empty', async () => {
    OfflinePhotoQueue.queue = [];

    await OfflinePhotoQueue.processQueue();

    expect(PhotoUploadManager.uploadToDrive).not.toHaveBeenCalled();
  });

  test('does nothing when already processing', async () => {
    OfflinePhotoQueue.queue = [{ id: 'x' }];
    OfflinePhotoQueue.isProcessing = true;

    await OfflinePhotoQueue.processQueue();

    expect(PhotoUploadManager.uploadToDrive).not.toHaveBeenCalled();
  });

  test('does nothing when offline', async () => {
    OfflinePhotoQueue.queue = [{ id: 'x' }];
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true });

    await OfflinePhotoQueue.processQueue();

    expect(PhotoUploadManager.uploadToDrive).not.toHaveBeenCalled();
  });

  test('does nothing when GoogleDriveSync is not connected', async () => {
    OfflinePhotoQueue.queue = [{ id: 'x' }];
    GoogleDriveSync.isConnected.mockReturnValue(false);

    await OfflinePhotoQueue.processQueue();

    expect(PhotoUploadManager.uploadToDrive).not.toHaveBeenCalled();
  });

  test('resets isProcessing flag after completion', async () => {
    const item = {
      id: 'item-done',
      jobName: 'Job',
      filename: 'photo.jpg',
      type: 'image/jpeg',
      data: 'data:image/jpeg;base64,abc',
      queuedAt: new Date().toISOString()
    };
    OfflinePhotoQueue.queue = [item];

    fetch.mockResolvedValue({
      blob: () => Promise.resolve(new Blob(['photo'], { type: 'image/jpeg' }))
    });
    PhotoUploadManager.uploadToDrive.mockResolvedValue({ id: 'ok' });

    await OfflinePhotoQueue.processQueue();

    expect(OfflinePhotoQueue.isProcessing).toBe(false);
  });
});

// =============================================================
// Utility methods
// =============================================================
describe('OfflinePhotoQueue utility methods', () => {
  test('getCount returns queue length', () => {
    OfflinePhotoQueue.queue = [{ id: '1' }, { id: '2' }];
    expect(OfflinePhotoQueue.getCount()).toBe(2);
  });

  test('subscribe calls listener immediately and on changes', () => {
    const listener = jest.fn();
    OfflinePhotoQueue.queue = [{ id: '1' }];

    const unsubscribe = OfflinePhotoQueue.subscribe(listener);

    // Called immediately with current state
    expect(listener).toHaveBeenCalledWith(1, false);

    // Notify triggers again
    OfflinePhotoQueue.notifyListeners();
    expect(listener).toHaveBeenCalledTimes(2);

    // Unsubscribe works
    unsubscribe();
    OfflinePhotoQueue.notifyListeners();
    expect(listener).toHaveBeenCalledTimes(2); // no additional call
  });
});
