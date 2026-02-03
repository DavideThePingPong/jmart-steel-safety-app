/**
 * Google Drive Sync Service Tests
 * HIGH PRIORITY - Backup Functionality
 *
 * Tests Google Drive integration including:
 * - Authentication
 * - Folder management
 * - File uploads
 * - Error handling
 */

import { createGoogleDriveSync } from '../../../src/services/googleDrive';

describe('GoogleDriveSync Service', () => {
  let mockFetch;
  let mockLocalStorage;
  let driveSync;
  let storageData;

  beforeEach(() => {
    storageData = {};

    mockLocalStorage = {
      getItem: jest.fn(key => storageData[key] || null),
      setItem: jest.fn((key, value) => { storageData[key] = value; }),
      removeItem: jest.fn(key => { delete storageData[key]; })
    };

    mockFetch = jest.fn();

    driveSync = createGoogleDriveSync({
      clientId: 'test-client-id',
      folderName: 'JMart Steel Test',
      localStorage: mockLocalStorage,
      fetch: mockFetch
    });
  });

  describe('Initialization', () => {
    test('should initialize successfully', () => {
      const result = driveSync.init();
      expect(result.isInitialized).toBe(true);
    });

    test('should load stored token on init', () => {
      storageData['google-drive-token'] = 'stored-token';

      driveSync.init();

      expect(driveSync.isConnected()).toBe(true);
    });

    test('should not be connected without token', () => {
      driveSync.init();
      expect(driveSync.isConnected()).toBe(false);
    });
  });

  describe('Connection Management', () => {
    test('should set access token', () => {
      driveSync.setAccessToken('new-token');

      expect(driveSync.isConnected()).toBe(true);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('google-drive-token', 'new-token');
    });

    test('should disconnect and clear token', () => {
      driveSync.setAccessToken('token');
      expect(driveSync.isConnected()).toBe(true);

      driveSync.disconnect();

      expect(driveSync.isConnected()).toBe(false);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('google-drive-token');
    });
  });

  describe('Folder Operations', () => {
    beforeEach(() => {
      driveSync.setAccessToken('valid-token');
    });

    test('should find existing folder', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          files: [{ id: 'folder-123', name: 'JMart Steel Test' }]
        })
      });

      const folderId = await driveSync.getOrCreateMainFolder();

      expect(folderId).toBe('folder-123');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('drive/v3/files'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer valid-token'
          })
        })
      );
    });

    test('should create folder if not exists', async () => {
      // First call - search returns empty
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ files: [] })
      });
      // Second call - create folder
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'new-folder-456' })
      });

      const folderId = await driveSync.getOrCreateMainFolder();

      expect(folderId).toBe('new-folder-456');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    test('should cache folder ID after first call', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          files: [{ id: 'cached-folder' }]
        })
      });

      await driveSync.getOrCreateMainFolder();
      await driveSync.getOrCreateMainFolder();

      // Should only call API once
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    test('should create nested folder path', async () => {
      // Main folder search
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ files: [{ id: 'main-folder' }] })
      });
      // First subfolder search - not found
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ files: [] })
      });
      // Create first subfolder
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'subfolder-1' })
      });
      // Second subfolder search - not found
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ files: [] })
      });
      // Create second subfolder
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'subfolder-2' })
      });

      const folderId = await driveSync.getOrCreateNestedFolder('Safety/Pre-Start');

      expect(folderId).toBe('subfolder-2');
    });
  });

  describe('File Upload', () => {
    beforeEach(() => {
      driveSync.setAccessToken('valid-token');
      // Mock main folder exists
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ files: [{ id: 'main-folder' }] })
      });
    });

    test('should upload PDF to main folder', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'file-123', name: 'test.pdf' })
      });

      const blob = new Blob(['test content'], { type: 'application/pdf' });
      const result = await driveSync.uploadPDF(blob, 'test.pdf');

      expect(result.id).toBe('file-123');
    });

    test('should upload PDF to form-specific folder', async () => {
      // Subfolder search and creation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ files: [{ id: 'safety-folder' }] })
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ files: [{ id: 'prestart-folder' }] })
      });
      // Upload
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'uploaded-file' })
      });

      const blob = new Blob(['test content'], { type: 'application/pdf' });
      const result = await driveSync.uploadPDF(blob, 'prestart-2026-02-01.pdf', 'prestart');

      expect(result.id).toBe('uploaded-file');
    });

    test('should handle upload failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({
          error: { message: 'Upload failed - quota exceeded' }
        })
      });

      const blob = new Blob(['test'], { type: 'application/pdf' });

      await expect(driveSync.uploadPDF(blob, 'test.pdf')).rejects.toThrow('Upload failed');
    });
  });

  describe('File Search', () => {
    beforeEach(() => {
      driveSync.setAccessToken('valid-token');
      // Mock main folder
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ files: [{ id: 'main-folder' }] })
      });
    });

    test('should search for files by name pattern', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          files: [
            { id: 'file-1', name: 'prestart-2026-01-01.pdf' },
            { id: 'file-2', name: 'prestart-2026-01-02.pdf' }
          ]
        })
      });

      const files = await driveSync.searchFiles('prestart');

      expect(files).toHaveLength(2);
      expect(files[0].name).toContain('prestart');
    });

    test('should return empty array when no files match', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ files: [] })
      });

      const files = await driveSync.searchFiles('nonexistent');

      expect(files).toHaveLength(0);
    });
  });

  describe('File Deletion', () => {
    beforeEach(() => {
      driveSync.setAccessToken('valid-token');
    });

    test('should delete file by ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204
      });

      const result = await driveSync.deleteFile('file-to-delete');

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('files/file-to-delete'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    test('should handle delete failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      const result = await driveSync.deleteFile('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('Authentication Errors', () => {
    test('should throw error when not connected', async () => {
      // Don't set token
      driveSync.init();

      await expect(driveSync.getOrCreateMainFolder()).rejects.toThrow('Not connected to Google Drive');
    });

    test('should handle token expiration', async () => {
      driveSync.setAccessToken('expired-token');

      mockFetch.mockResolvedValueOnce({
        status: 401,
        ok: false
      });

      await expect(driveSync.getOrCreateMainFolder()).rejects.toThrow('Token expired');
      expect(driveSync.isConnected()).toBe(false);
    });
  });

  describe('Folder Structure', () => {
    test('should return folder structure configuration', () => {
      const structure = driveSync.getFolderStructure();

      expect(structure.main).toBe('JMart Steel Test');
      expect(structure.subfolders).toHaveProperty('prestart');
      expect(structure.subfolders).toHaveProperty('incident');
      expect(structure.subfolders).toHaveProperty('itp');
    });

    test('should have correct folder paths for form types', () => {
      const structure = driveSync.getFolderStructure();

      expect(structure.subfolders.prestart).toContain('Pre-Start');
      expect(structure.subfolders.incident).toContain('Incident');
      expect(structure.subfolders['steel-itp']).toContain('Steel');
    });
  });
});
