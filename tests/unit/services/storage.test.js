/**
 * Storage Service Tests
 * CRITICAL PRIORITY - Data Persistence
 *
 * Tests localStorage operations including:
 * - Basic CRUD operations
 * - Quota handling
 * - Form-specific operations
 * - Error handling
 */

import { createStorageService, STORAGE_KEYS } from '../../../src/services/storage';

describe('Storage Service', () => {
  let mockStorage;
  let storageService;
  let storageData;

  beforeEach(() => {
    storageData = {};

    mockStorage = {
      getItem: jest.fn(key => storageData[key] || null),
      setItem: jest.fn((key, value) => {
        storageData[key] = value;
      }),
      removeItem: jest.fn(key => {
        delete storageData[key];
      }),
      clear: jest.fn(() => {
        storageData = {};
      }),
      hasOwnProperty: jest.fn(key => key in storageData)
    };

    // Make storage iterable for getStorageUsage
    Object.defineProperty(mockStorage, Symbol.iterator, {
      value: function* () {
        for (const key in storageData) {
          yield key;
        }
      }
    });

    storageService = createStorageService(mockStorage);
  });

  describe('Basic Operations', () => {
    describe('getItem', () => {
      test('should return parsed JSON value', () => {
        storageData['test-key'] = JSON.stringify({ foo: 'bar' });

        const result = storageService.getItem('test-key');

        expect(result).toEqual({ foo: 'bar' });
      });

      test('should return default value when key not found', () => {
        const result = storageService.getItem('nonexistent', 'default');

        expect(result).toBe('default');
      });

      test('should return null as default when no default provided', () => {
        const result = storageService.getItem('nonexistent');

        expect(result).toBeNull();
      });

      test('should handle invalid JSON gracefully', () => {
        storageData['bad-json'] = 'not valid json {{{';

        const result = storageService.getItem('bad-json', 'default');

        expect(result).toBe('default');
      });
    });

    describe('setItem', () => {
      test('should stringify and store value', () => {
        const result = storageService.setItem('test-key', { foo: 'bar' });

        expect(result.success).toBe(true);
        expect(storageData['test-key']).toBe('{"foo":"bar"}');
      });

      test('should handle arrays', () => {
        storageService.setItem('array-key', [1, 2, 3]);

        expect(storageData['array-key']).toBe('[1,2,3]');
      });

      test('should handle quota exceeded error', () => {
        const errorStorage = {
          ...mockStorage,
          setItem: jest.fn(() => {
            const error = new Error('Quota exceeded');
            error.name = 'QuotaExceededError';
            throw error;
          })
        };
        const quotaService = createStorageService(errorStorage);

        const result = quotaService.setItem('test', { large: 'data' });

        expect(result.success).toBe(false);
        expect(result.error).toBe('Storage quota exceeded');
      });

      test('should handle quota exceeded with code 22', () => {
        const errorStorage = {
          ...mockStorage,
          setItem: jest.fn(() => {
            const error = new Error('Quota exceeded');
            error.code = 22;
            throw error;
          })
        };
        const quotaService = createStorageService(errorStorage);

        const result = quotaService.setItem('test', { large: 'data' });

        expect(result.success).toBe(false);
        expect(result.error).toBe('Storage quota exceeded');
      });

      test('should handle other errors', () => {
        const errorStorage = {
          ...mockStorage,
          setItem: jest.fn(() => {
            throw new Error('Some other error');
          })
        };
        const errorService = createStorageService(errorStorage);

        const result = errorService.setItem('test', {});

        expect(result.success).toBe(false);
        expect(result.error).toBe('Some other error');
      });
    });

    describe('removeItem', () => {
      test('should remove item from storage', () => {
        storageData['test-key'] = 'value';

        const result = storageService.removeItem('test-key');

        expect(result.success).toBe(true);
        expect(mockStorage.removeItem).toHaveBeenCalledWith('test-key');
      });
    });
  });

  describe('Storage Usage', () => {
    test('should calculate storage usage', () => {
      storageData['key1'] = 'a'.repeat(100);
      storageData['key2'] = 'b'.repeat(200);

      // Make storage iterable
      for (const key in storageData) {
        mockStorage.hasOwnProperty.mockImplementation(k => k in storageData);
      }

      const usage = storageService.getStorageUsage();

      expect(usage).toHaveProperty('used');
      expect(usage).toHaveProperty('limit');
      expect(usage).toHaveProperty('percentage');
      expect(usage.limit).toBe(5 * 1024 * 1024); // 5MB
    });

    test('should check if space is available', () => {
      const hasSpace = storageService.hasSpace(1000);
      expect(typeof hasSpace).toBe('boolean');
    });
  });

  describe('Form Operations', () => {
    describe('getForms', () => {
      test('should return empty array when no forms stored', () => {
        const forms = storageService.getForms();
        expect(forms).toEqual([]);
      });

      test('should return stored forms', () => {
        const storedForms = [
          { id: '1', type: 'prestart' },
          { id: '2', type: 'incident' }
        ];
        storageData[STORAGE_KEYS.FORMS] = JSON.stringify(storedForms);

        const forms = storageService.getForms();

        expect(forms).toEqual(storedForms);
      });
    });

    describe('saveForms', () => {
      test('should save forms array', () => {
        const forms = [{ id: '1', type: 'prestart' }];

        const result = storageService.saveForms(forms);

        expect(result.success).toBe(true);
        expect(JSON.parse(storageData[STORAGE_KEYS.FORMS])).toEqual(forms);
      });
    });

    describe('addForm', () => {
      test('should add form to existing forms', () => {
        storageData[STORAGE_KEYS.FORMS] = JSON.stringify([{ id: '1' }]);

        const result = storageService.addForm({ id: '2', type: 'incident' });

        expect(result.success).toBe(true);
        const saved = JSON.parse(storageData[STORAGE_KEYS.FORMS]);
        expect(saved).toHaveLength(2);
        expect(saved[1].id).toBe('2');
      });

      test('should add form when no existing forms', () => {
        const result = storageService.addForm({ id: '1', type: 'prestart' });

        expect(result.success).toBe(true);
        const saved = JSON.parse(storageData[STORAGE_KEYS.FORMS]);
        expect(saved).toHaveLength(1);
      });
    });

    describe('updateForm', () => {
      test('should update existing form', () => {
        storageData[STORAGE_KEYS.FORMS] = JSON.stringify([
          { id: '1', type: 'prestart', data: { old: 'data' } }
        ]);

        const result = storageService.updateForm('1', { data: { new: 'data' } });

        expect(result.success).toBe(true);
        const saved = JSON.parse(storageData[STORAGE_KEYS.FORMS]);
        expect(saved[0].data).toEqual({ new: 'data' });
      });

      test('should return error when form not found', () => {
        storageData[STORAGE_KEYS.FORMS] = JSON.stringify([{ id: '1' }]);

        const result = storageService.updateForm('nonexistent', {});

        expect(result.success).toBe(false);
        expect(result.error).toBe('Form not found');
      });

      test('should preserve existing form properties', () => {
        storageData[STORAGE_KEYS.FORMS] = JSON.stringify([
          { id: '1', type: 'prestart', createdAt: '2026-01-01' }
        ]);

        storageService.updateForm('1', { updatedAt: '2026-02-01' });

        const saved = JSON.parse(storageData[STORAGE_KEYS.FORMS]);
        expect(saved[0].createdAt).toBe('2026-01-01');
        expect(saved[0].updatedAt).toBe('2026-02-01');
      });
    });

    describe('deleteForm', () => {
      test('should delete existing form', () => {
        storageData[STORAGE_KEYS.FORMS] = JSON.stringify([
          { id: '1' },
          { id: '2' }
        ]);

        const result = storageService.deleteForm('1');

        expect(result.success).toBe(true);
        const saved = JSON.parse(storageData[STORAGE_KEYS.FORMS]);
        expect(saved).toHaveLength(1);
        expect(saved[0].id).toBe('2');
      });

      test('should return error when form not found', () => {
        storageData[STORAGE_KEYS.FORMS] = JSON.stringify([{ id: '1' }]);

        const result = storageService.deleteForm('nonexistent');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Form not found');
      });
    });

    describe('getFormById', () => {
      test('should return form by ID', () => {
        storageData[STORAGE_KEYS.FORMS] = JSON.stringify([
          { id: '1', type: 'prestart' },
          { id: '2', type: 'incident' }
        ]);

        const form = storageService.getFormById('2');

        expect(form).toEqual({ id: '2', type: 'incident' });
      });

      test('should return null when form not found', () => {
        storageData[STORAGE_KEYS.FORMS] = JSON.stringify([{ id: '1' }]);

        const form = storageService.getFormById('nonexistent');

        expect(form).toBeNull();
      });
    });
  });

  describe('Site Operations', () => {
    test('should get sites', () => {
      storageData[STORAGE_KEYS.SITES] = JSON.stringify([{ name: 'Site 1' }]);

      const sites = storageService.getSites();

      expect(sites).toEqual([{ name: 'Site 1' }]);
    });

    test('should return empty array when no sites', () => {
      const sites = storageService.getSites();
      expect(sites).toEqual([]);
    });

    test('should save sites', () => {
      const sites = [{ name: 'Site 1' }, { name: 'Site 2' }];

      const result = storageService.saveSites(sites);

      expect(result.success).toBe(true);
      expect(JSON.parse(storageData[STORAGE_KEYS.SITES])).toEqual(sites);
    });
  });

  describe('Signature Operations', () => {
    test('should get signatures', () => {
      storageData[STORAGE_KEYS.SIGNATURES] = JSON.stringify({
        'John': 'sig1',
        'Jane': 'sig2'
      });

      const signatures = storageService.getSignatures();

      expect(signatures).toEqual({ 'John': 'sig1', 'Jane': 'sig2' });
    });

    test('should return empty object when no signatures', () => {
      const signatures = storageService.getSignatures();
      expect(signatures).toEqual({});
    });

    test('should save signature for user', () => {
      const result = storageService.saveSignature('John', 'signature-data');

      expect(result.success).toBe(true);
      const saved = JSON.parse(storageData[STORAGE_KEYS.SIGNATURES]);
      expect(saved['John']).toBe('signature-data');
    });

    test('should get signature by name', () => {
      storageData[STORAGE_KEYS.SIGNATURES] = JSON.stringify({
        'John': 'sig-john'
      });

      const signature = storageService.getSignatureByName('John');

      expect(signature).toBe('sig-john');
    });

    test('should return null for unknown signature', () => {
      storageData[STORAGE_KEYS.SIGNATURES] = JSON.stringify({});

      const signature = storageService.getSignatureByName('Unknown');

      expect(signature).toBeNull();
    });
  });

  describe('Clear All Data', () => {
    test('should clear all app data', () => {
      storageData[STORAGE_KEYS.FORMS] = '[]';
      storageData[STORAGE_KEYS.SITES] = '[]';
      storageData[STORAGE_KEYS.SIGNATURES] = '{}';

      const result = storageService.clearAllData();

      expect(result.success).toBe(true);
      expect(mockStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.FORMS);
      expect(mockStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.SITES);
      expect(mockStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.SIGNATURES);
    });
  });

  describe('Storage Keys Export', () => {
    test('should export storage keys', () => {
      expect(STORAGE_KEYS).toHaveProperty('FORMS');
      expect(STORAGE_KEYS).toHaveProperty('SITES');
      expect(STORAGE_KEYS).toHaveProperty('SIGNATURES');
      expect(STORAGE_KEYS).toHaveProperty('SYNC_QUEUE');
    });
  });
});
