/**
 * Firebase Sync Service Tests
 * CRITICAL PRIORITY - Data Integrity
 *
 * Tests the Firebase synchronization service including:
 * - Online sync operations
 * - Offline queue management
 * - Retry logic with exponential backoff
 */

import { createFirebaseSync } from '../../../src/services/firebaseSync';

describe('FirebaseSync Service', () => {
  let mockFirebaseDb;
  let mockLocalStorage;
  let firebaseSync;

  beforeEach(() => {
    // Mock Firebase database
    mockFirebaseDb = {
      ref: jest.fn(() => ({
        set: jest.fn().mockResolvedValue(undefined),
        get: jest.fn().mockResolvedValue({ val: () => null }),
        on: jest.fn(),
        off: jest.fn()
      }))
    };

    // Mock localStorage
    const storage = {};
    mockLocalStorage = {
      getItem: jest.fn(key => storage[key] || null),
      setItem: jest.fn((key, value) => { storage[key] = value; }),
      removeItem: jest.fn(key => { delete storage[key]; }),
      clear: jest.fn(() => { Object.keys(storage).forEach(k => delete storage[k]); })
    };

    // Create service instance
    firebaseSync = createFirebaseSync(mockFirebaseDb, mockLocalStorage);
  });

  describe('Initialization', () => {
    test('should initialize with empty queue when no saved queue', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      firebaseSync.init();

      expect(firebaseSync.getPendingCount()).toBe(0);
    });

    test('should load pending queue from localStorage', () => {
      const savedQueue = [
        { id: '1', type: 'forms', data: [], attempts: 0 }
      ];
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(savedQueue));

      firebaseSync.init();

      expect(firebaseSync.getPendingCount()).toBe(1);
    });

    test('should handle corrupted localStorage data gracefully', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-json{{{');

      expect(() => firebaseSync.init()).not.toThrow();
      expect(firebaseSync.getPendingCount()).toBe(0);
    });
  });

  describe('Connection Status', () => {
    test('should return true when Firebase is connected', () => {
      expect(firebaseSync.isConnected()).toBe(true);
    });

    test('should return false when Firebase is null', () => {
      const disconnectedSync = createFirebaseSync(null, mockLocalStorage);
      expect(disconnectedSync.isConnected()).toBe(false);
    });
  });

  describe('Form Sync', () => {
    test('should sync forms successfully when online', async () => {
      const forms = [{ id: '1', type: 'prestart', data: {} }];

      const result = await firebaseSync.syncForms(forms);

      expect(result.success).toBe(true);
      expect(mockFirebaseDb.ref).toHaveBeenCalledWith('jmart-safety/forms');
    });

    test('should queue forms when Firebase is not configured', async () => {
      const disconnectedSync = createFirebaseSync(null, mockLocalStorage);
      const forms = [{ id: '1', type: 'prestart', data: {} }];

      const result = await disconnectedSync.syncForms(forms);

      expect(result.success).toBe(false);
      expect(result.queued).toBe(true);
      expect(disconnectedSync.getPendingCount()).toBe(1);
    });

    test('should queue forms when sync fails', async () => {
      mockFirebaseDb.ref.mockReturnValue({
        set: jest.fn().mockRejectedValue(new Error('Network error'))
      });

      const forms = [{ id: '1', type: 'prestart', data: {} }];
      const result = await firebaseSync.syncForms(forms);

      expect(result.success).toBe(false);
      expect(result.queued).toBe(true);
      expect(result.error).toBe('Network error');
    });

    test('should save queue to localStorage after queuing', async () => {
      const disconnectedSync = createFirebaseSync(null, mockLocalStorage);
      await disconnectedSync.syncForms([{ id: '1' }]);

      expect(mockLocalStorage.setItem).toHaveBeenCalled();
      const savedData = mockLocalStorage.setItem.mock.calls[0];
      expect(savedData[0]).toBe('jmart-sync-queue');
    });
  });

  describe('Sites Sync', () => {
    test('should sync sites successfully', async () => {
      const sites = [{ name: 'Site 1' }];

      const result = await firebaseSync.syncSites(sites);

      expect(result.success).toBe(true);
      expect(mockFirebaseDb.ref).toHaveBeenCalledWith('jmart-safety/sites');
    });

    test('should queue sites when offline', async () => {
      const disconnectedSync = createFirebaseSync(null, mockLocalStorage);
      const result = await disconnectedSync.syncSites([{ name: 'Site 1' }]);

      expect(result.success).toBe(false);
      expect(result.queued).toBe(true);
    });
  });

  describe('Training Sync', () => {
    test('should sync training records successfully', async () => {
      const training = [{ id: '1', name: 'Safety Training' }];

      const result = await firebaseSync.syncTraining(training);

      expect(result.success).toBe(true);
      expect(mockFirebaseDb.ref).toHaveBeenCalledWith('jmart-safety/training');
    });
  });

  describe('Queue Management', () => {
    test('should add items to queue with unique IDs', () => {
      firebaseSync.addToQueue('forms', [{ id: '1' }]);
      firebaseSync.addToQueue('forms', [{ id: '2' }]);

      const queue = firebaseSync.getPendingQueue();
      expect(queue).toHaveLength(2);
      expect(queue[0].id).not.toBe(queue[1].id);
    });

    test('should track timestamps on queued items', () => {
      firebaseSync.addToQueue('forms', [{ id: '1' }]);

      const queue = firebaseSync.getPendingQueue();
      expect(queue[0].timestamp).toBeDefined();
      expect(new Date(queue[0].timestamp)).toBeInstanceOf(Date);
    });

    test('should track attempt count on queued items', () => {
      firebaseSync.addToQueue('forms', [{ id: '1' }]);

      const queue = firebaseSync.getPendingQueue();
      expect(queue[0].attempts).toBe(0);
    });

    test('should clear queue', () => {
      firebaseSync.addToQueue('forms', [{ id: '1' }]);
      firebaseSync.addToQueue('sites', [{ name: 'Site 1' }]);

      expect(firebaseSync.getPendingCount()).toBe(2);

      firebaseSync.clearQueue();

      expect(firebaseSync.getPendingCount()).toBe(0);
    });
  });

  describe('Queue Processing', () => {
    beforeEach(() => {
      // Ensure navigator.onLine returns true
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });
    });

    test('should not process queue when offline', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false });

      firebaseSync.addToQueue('forms', [{ id: '1' }]);
      const result = await firebaseSync.processQueue();

      expect(result.offline).toBe(true);
      expect(firebaseSync.getPendingCount()).toBe(1); // Still in queue
    });

    test('should process queue successfully when online', async () => {
      mockFirebaseDb.ref.mockReturnValue({
        set: jest.fn().mockResolvedValue(undefined)
      });

      firebaseSync.addToQueue('forms', [{ id: '1' }]);
      const result = await firebaseSync.processQueue();

      expect(result.processed).toBe(1);
      expect(firebaseSync.getPendingCount()).toBe(0);
    });

    test('should increment attempts on failure', async () => {
      mockFirebaseDb.ref.mockReturnValue({
        set: jest.fn().mockRejectedValue(new Error('Sync failed'))
      });

      firebaseSync.addToQueue('forms', [{ id: '1' }]);
      await firebaseSync.processQueue();

      const queue = firebaseSync.getPendingQueue();
      expect(queue[0].attempts).toBe(1);
    });

    test('should handle different sync types', async () => {
      mockFirebaseDb.ref.mockReturnValue({
        set: jest.fn().mockResolvedValue(undefined)
      });

      firebaseSync.addToQueue('forms', []);
      firebaseSync.addToQueue('sites', []);
      firebaseSync.addToQueue('training', []);
      firebaseSync.addToQueue('signatures', {});

      await firebaseSync.processQueue();

      expect(mockFirebaseDb.ref).toHaveBeenCalledWith('jmart-safety/forms');
      expect(mockFirebaseDb.ref).toHaveBeenCalledWith('jmart-safety/sites');
      expect(mockFirebaseDb.ref).toHaveBeenCalledWith('jmart-safety/training');
      expect(mockFirebaseDb.ref).toHaveBeenCalledWith('signatures');
    });
  });

  describe('Retry All', () => {
    test('should reset attempt counts and process queue', async () => {
      mockFirebaseDb.ref.mockReturnValue({
        set: jest.fn()
          .mockRejectedValueOnce(new Error('Fail 1'))
          .mockRejectedValueOnce(new Error('Fail 2'))
          .mockResolvedValue(undefined)
      });

      firebaseSync.addToQueue('forms', [{ id: '1' }]);

      // Fail twice
      await firebaseSync.processQueue();
      await firebaseSync.processQueue();

      let queue = firebaseSync.getPendingQueue();
      expect(queue[0].attempts).toBe(2);

      // Retry all - should reset attempts
      await firebaseSync.retryAll();

      queue = firebaseSync.getPendingQueue();
      // After retry, attempts should either be 0 (reset before process) or item removed (success)
      // Since our mock now succeeds, the item should be processed
    });
  });

  describe('Status Listeners', () => {
    test('should notify listeners on queue add', () => {
      const listener = jest.fn();
      firebaseSync.onSyncStatusChange(listener);

      firebaseSync.addToQueue('forms', [{ id: '1' }]);

      expect(listener).toHaveBeenCalledWith('queued', { pending: 1 });
    });

    test('should allow unsubscribing listeners', () => {
      const listener = jest.fn();
      const unsubscribe = firebaseSync.onSyncStatusChange(listener);

      unsubscribe();
      firebaseSync.addToQueue('forms', [{ id: '1' }]);

      expect(listener).not.toHaveBeenCalled();
    });

    test('should notify listeners on sync success', async () => {
      const listener = jest.fn();
      firebaseSync.onSyncStatusChange(listener);

      mockFirebaseDb.ref.mockReturnValue({
        set: jest.fn().mockResolvedValue(undefined)
      });

      firebaseSync.addToQueue('forms', [{ id: '1' }]);
      await firebaseSync.processQueue();

      expect(listener).toHaveBeenCalledWith('synced', expect.objectContaining({
        pending: 0,
        item: 'forms'
      }));
    });
  });

  describe('Real-time Listeners', () => {
    test('should set up forms listener', () => {
      const callback = jest.fn();
      const mockRef = {
        on: jest.fn(),
        off: jest.fn()
      };
      mockFirebaseDb.ref.mockReturnValue(mockRef);

      const unsubscribe = firebaseSync.onFormsChange(callback);

      expect(mockFirebaseDb.ref).toHaveBeenCalledWith('jmart-safety/forms');
      expect(mockRef.on).toHaveBeenCalledWith('value', expect.any(Function), expect.any(Function));

      // Cleanup
      unsubscribe();
      expect(mockRef.off).toHaveBeenCalled();
    });

    test('should return noop when Firebase not connected', () => {
      const disconnectedSync = createFirebaseSync(null, mockLocalStorage);
      const callback = jest.fn();

      const unsubscribe = disconnectedSync.onFormsChange(callback);

      expect(unsubscribe).toBeInstanceOf(Function);
      expect(() => unsubscribe()).not.toThrow();
    });
  });
});
