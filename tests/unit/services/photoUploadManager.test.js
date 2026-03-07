/**
 * Tests for js/photoUploadManager.js — PhotoUploadManager
 */

const loadScript = require('../../helpers/loadScript');

describe('PhotoUploadManager', () => {
  let store;

  beforeEach(() => {
    store = {};
    localStorage.getItem.mockImplementation(key => store[key] !== undefined ? store[key] : null);
    localStorage.setItem.mockImplementation((key, value) => { store[key] = String(value); });

    global.GoogleDriveSync = {
      isConnected: jest.fn(() => true),
      folderId: 'root-folder-id',
      getOrCreateFolder: jest.fn().mockResolvedValue('root-folder-id'),
      getOrCreateNestedFolder: jest.fn().mockResolvedValue('photos-folder-id'),
      apiCall: jest.fn().mockResolvedValue({
        json: jest.fn().mockResolvedValue({ files: [], id: 'new-folder-id' })
      }),
      _escapeQuery: jest.fn(s => s)
    };

    global.DRIVE_FOLDERS = { photos: '02_Projects' };

    global.OfflinePhotoQueue = {
      addToQueue: jest.fn().mockResolvedValue()
    };

    global.DeviceAuthManager = { deviceId: 'device-123' };

    global.firebaseDb = {
      ref: jest.fn(() => ({
        push: jest.fn().mockResolvedValue()
      }))
    };

    global.FormData = class {
      constructor() { this._data = {}; }
      append(key, value) { this._data[key] = value; }
    };

    global.Blob = class {
      constructor(parts, opts) { this.parts = parts; this.type = opts?.type; }
    };

    navigator.onLine = true;

    loadScript('js/photoUploadManager.js', {
      globalizeConst: ['PhotoUploadManager'],
      stripAutoInit: ['PhotoUploadManager.init()'],
      quiet: true
    });
  });

  afterEach(() => {
    delete global.PhotoUploadManager;
    delete global.GoogleDriveSync;
    delete global.DRIVE_FOLDERS;
    delete global.OfflinePhotoQueue;
    delete global.DeviceAuthManager;
    delete global.firebaseDb;
    delete global.FormData;
    delete global.Blob;
  });

  describe('init()', () => {
    it('runs without error', () => {
      expect(() => PhotoUploadManager.init()).not.toThrow();
    });
  });

  describe('getOrCreateJobFolder()', () => {
    it('returns folder ID when Drive connected', async () => {
      const id = await PhotoUploadManager.getOrCreateJobFolder('TestJob');
      expect(GoogleDriveSync.getOrCreateNestedFolder).toHaveBeenCalledWith('02_Projects/TestJob/Photos');
      expect(id).toBe('photos-folder-id');
    });

    it('sanitizes job name', async () => {
      await PhotoUploadManager.getOrCreateJobFolder('Job<>:"/\\|?*Name');
      expect(GoogleDriveSync.getOrCreateNestedFolder).toHaveBeenCalledWith(
        expect.stringContaining('Job_________Name')
      );
    });

    it('returns null when Drive not connected', async () => {
      GoogleDriveSync.isConnected.mockReturnValue(false);
      const id = await PhotoUploadManager.getOrCreateJobFolder('Test');
      expect(id).toBeNull();
    });

    it('creates main folder if folderId missing', async () => {
      GoogleDriveSync.folderId = null;
      await PhotoUploadManager.getOrCreateJobFolder('Test');
      expect(GoogleDriveSync.getOrCreateFolder).toHaveBeenCalled();
    });

    it('falls back to root on nested folder failure', async () => {
      GoogleDriveSync.getOrCreateNestedFolder.mockResolvedValue(null);
      GoogleDriveSync.folderId = 'root-id';
      const id = await PhotoUploadManager.getOrCreateJobFolder('Test');
      expect(id).toBe('root-id');
    });

    it('returns null on error', async () => {
      GoogleDriveSync.getOrCreateNestedFolder.mockRejectedValue(new Error('fail'));
      const id = await PhotoUploadManager.getOrCreateJobFolder('Test');
      expect(id).toBeNull();
    });
  });

  describe('getOrCreateDateFolder()', () => {
    it('returns existing date folder', async () => {
      GoogleDriveSync.apiCall.mockResolvedValue({
        json: jest.fn().mockResolvedValue({ files: [{ id: 'existing-date-folder' }] })
      });
      const id = await PhotoUploadManager.getOrCreateDateFolder('parent-id');
      expect(id).toBe('existing-date-folder');
    });

    it('creates new date folder when none exists', async () => {
      // First call: search returns empty
      // Second call: create returns new folder
      GoogleDriveSync.apiCall
        .mockResolvedValueOnce({ json: jest.fn().mockResolvedValue({ files: [] }) })
        .mockResolvedValueOnce({ json: jest.fn().mockResolvedValue({ id: 'new-date-id' }) });
      const id = await PhotoUploadManager.getOrCreateDateFolder('parent-id');
      expect(id).toBe('new-date-id');
    });

    it('returns parent folder when not connected', async () => {
      GoogleDriveSync.isConnected.mockReturnValue(false);
      const id = await PhotoUploadManager.getOrCreateDateFolder('parent-id');
      expect(id).toBe('parent-id');
    });

    it('returns parent folder on null input', async () => {
      const id = await PhotoUploadManager.getOrCreateDateFolder(null);
      expect(id).toBeNull();
    });

    it('falls back to parent on error', async () => {
      GoogleDriveSync.apiCall.mockRejectedValue(new Error('api fail'));
      const id = await PhotoUploadManager.getOrCreateDateFolder('parent-id');
      expect(id).toBe('parent-id');
    });
  });

  describe('uploadToDrive()', () => {
    it('uploads file and returns result', async () => {
      GoogleDriveSync.getOrCreateNestedFolder.mockResolvedValue('photos-folder');
      GoogleDriveSync.apiCall
        .mockResolvedValueOnce({ json: jest.fn().mockResolvedValue({ files: [{ id: 'date-folder' }] }) })
        .mockResolvedValueOnce({ json: jest.fn().mockResolvedValue({ id: 'file-id-123' }) });

      const file = { name: 'photo.jpg', type: 'image/jpeg' };
      const result = await PhotoUploadManager.uploadToDrive(file, 'TestJob');
      expect(result).toEqual(expect.objectContaining({ fileId: 'file-id-123' }));
    });

    it('returns null when Drive not connected', async () => {
      GoogleDriveSync.isConnected.mockReturnValue(false);
      const result = await PhotoUploadManager.uploadToDrive({ name: 'a.jpg' }, 'Job');
      expect(result).toBeNull();
    });

    it('returns null on error', async () => {
      GoogleDriveSync.getOrCreateNestedFolder.mockRejectedValue(new Error('fail'));
      const result = await PhotoUploadManager.uploadToDrive({ name: 'a.jpg' }, 'Job');
      expect(result).toBeNull();
    });
  });

  describe('uploadPhoto()', () => {
    it('queues photo when offline', async () => {
      navigator.onLine = false;
      const file = { name: 'photo.jpg', size: 1000, type: 'image/jpeg' };
      const progress = jest.fn();
      const result = await PhotoUploadManager.uploadPhoto(file, 'Job', progress);
      expect(result.queued).toBe(true);
      expect(result.success).toBe(true);
      expect(OfflinePhotoQueue.addToQueue).toHaveBeenCalledWith(file, 'Job');
    });

    it('queues photo when Drive not connected', async () => {
      GoogleDriveSync.isConnected.mockReturnValue(false);
      const file = { name: 'photo.jpg', size: 1000, type: 'image/jpeg' };
      const result = await PhotoUploadManager.uploadPhoto(file, 'Job');
      expect(result.queued).toBe(true);
    });

    it('uploads online and logs to Firebase', async () => {
      // Mock the full upload chain
      jest.spyOn(PhotoUploadManager, 'uploadToDrive').mockResolvedValue({ fileId: 'f1', filename: 'photo.jpg' });
      const file = { name: 'photo.jpg', size: 1000, type: 'image/jpeg' };
      const progress = jest.fn();
      const result = await PhotoUploadManager.uploadPhoto(file, 'Job', progress);
      expect(result.success).toBe(true);
      expect(result.drive).toEqual({ fileId: 'f1', filename: 'photo.jpg' });
      expect(firebaseDb.ref).toHaveBeenCalledWith('jmart-safety/photoUploads');
    });

    it('returns failure when upload fails', async () => {
      jest.spyOn(PhotoUploadManager, 'uploadToDrive').mockResolvedValue(null);
      const file = { name: 'photo.jpg', size: 1000, type: 'image/jpeg' };
      const result = await PhotoUploadManager.uploadPhoto(file, 'Job');
      expect(result.success).toBe(false);
      expect(result.drive).toBeNull();
    });

    it('handles offline queue error gracefully', async () => {
      navigator.onLine = false;
      OfflinePhotoQueue.addToQueue.mockRejectedValue(new Error('queue full'));
      const file = { name: 'photo.jpg', size: 1000, type: 'image/jpeg' };
      const result = await PhotoUploadManager.uploadPhoto(file, 'Job');
      expect(result.success).toBe(false);
      expect(result.queued).toBe(false);
    });
  });
});
