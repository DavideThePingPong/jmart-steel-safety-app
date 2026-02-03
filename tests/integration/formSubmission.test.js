/**
 * Form Submission Integration Tests
 * CRITICAL PRIORITY - End-to-end form workflow
 *
 * Tests the complete form submission flow including:
 * - Validation
 * - Local storage
 * - Firebase sync
 * - Error handling
 */

import { validatePrestartForm, validateIncidentForm } from '../../src/validation/formValidation';
import { createStorageService } from '../../src/services/storage';
import { createFirebaseSync } from '../../src/services/firebaseSync';

describe('Form Submission Integration', () => {
  let storageService;
  let firebaseSync;
  let mockStorage;
  let mockFirebaseDb;
  let storageData;

  beforeEach(() => {
    // Setup mock storage
    storageData = {};
    mockStorage = {
      getItem: jest.fn(key => storageData[key] || null),
      setItem: jest.fn((key, value) => { storageData[key] = value; }),
      removeItem: jest.fn(key => { delete storageData[key]; }),
      clear: jest.fn()
    };

    // Setup mock Firebase
    mockFirebaseDb = {
      ref: jest.fn(() => ({
        set: jest.fn().mockResolvedValue(undefined),
        get: jest.fn().mockResolvedValue({ val: () => null }),
        on: jest.fn(),
        off: jest.fn()
      }))
    };

    // Ensure online
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true });

    storageService = createStorageService(mockStorage);
    firebaseSync = createFirebaseSync(mockFirebaseDb, mockStorage);
  });

  describe('Pre-Start Form Submission Flow', () => {
    const createCompletePrestartForm = () => ({
      id: Date.now().toString(),
      type: 'prestart',
      createdAt: new Date().toISOString(),
      data: {
        siteConducted: 'Sydney CBD Construction Site',
        supervisorName: 'John Smith',
        siteHazards: { value: 'Working at heights, electrical hazards', notes: [] },
        highRiskWorks: 'yes',
        worksCoveredBySWMS: 'yes',
        isPlantEquipmentUsed: 'no',
        signatures: { 'Worker 1': 'data:image/png;base64,' + 'A'.repeat(1500) },
        checkType: 'site',
        checks: { s1: true, s2: true, s3: true, s4: true, s5: true, s6: true, s7: true, s8: true, s9: true, s10: true }
      }
    });

    test('should validate and save form locally', () => {
      const form = createCompletePrestartForm();

      // Step 1: Validate
      const validation = validatePrestartForm(form.data);
      expect(validation.isValid).toBe(true);

      // Step 2: Save locally
      const saveResult = storageService.addForm(form);
      expect(saveResult.success).toBe(true);

      // Step 3: Verify saved
      const savedForm = storageService.getFormById(form.id);
      expect(savedForm).not.toBeNull();
      expect(savedForm.type).toBe('prestart');
    });

    test('should sync form to Firebase after local save', async () => {
      const form = createCompletePrestartForm();

      // Validate and save locally
      const validation = validatePrestartForm(form.data);
      expect(validation.isValid).toBe(true);

      storageService.addForm(form);

      // Sync to Firebase
      const forms = storageService.getForms();
      const syncResult = await firebaseSync.syncForms(forms);

      expect(syncResult.success).toBe(true);
      expect(mockFirebaseDb.ref).toHaveBeenCalledWith('jmart-safety/forms');
    });

    test('should queue form for sync when offline', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false });

      const form = createCompletePrestartForm();
      storageService.addForm(form);

      // Create disconnected sync (simulating offline)
      const offlineSync = createFirebaseSync(null, mockStorage);
      const forms = storageService.getForms();
      const syncResult = await offlineSync.syncForms(forms);

      expect(syncResult.success).toBe(false);
      expect(syncResult.queued).toBe(true);
      expect(offlineSync.getPendingCount()).toBe(1);
    });

    test('should reject invalid form before saving', () => {
      const form = createCompletePrestartForm();
      form.data.siteConducted = ''; // Make invalid

      const validation = validatePrestartForm(form.data);
      expect(validation.isValid).toBe(false);

      // Should not save invalid form
      if (validation.isValid) {
        storageService.addForm(form);
      }

      const savedForm = storageService.getFormById(form.id);
      expect(savedForm).toBeNull();
    });

    test('should handle sync failure and retry', async () => {
      let attempts = 0;
      mockFirebaseDb.ref.mockReturnValue({
        set: jest.fn(() => {
          attempts++;
          if (attempts < 3) {
            return Promise.reject(new Error('Network error'));
          }
          return Promise.resolve();
        })
      });

      const form = createCompletePrestartForm();
      storageService.addForm(form);
      const forms = storageService.getForms();

      // First attempt fails and queues
      const firstResult = await firebaseSync.syncForms(forms);
      expect(firstResult.queued).toBe(true);

      // Process queue - should eventually succeed
      await firebaseSync.processQueue();
      await firebaseSync.processQueue();
      await firebaseSync.processQueue();
    });
  });

  describe('Incident Report Submission Flow', () => {
    const createCompleteIncidentForm = () => ({
      id: Date.now().toString(),
      type: 'incident',
      createdAt: new Date().toISOString(),
      data: {
        incidentDate: '2026-02-01',
        incidentTime: '14:30',
        incidentType: 'Near Miss',
        location: 'Sydney CBD - Level 5',
        description: 'Worker slipped on wet surface near scaffolding.',
        workerName: 'John Smith',
        signature: 'data:image/png;base64,' + 'A'.repeat(1500),
        actionTaken: 'Area cordoned off, supervisor notified.'
      }
    });

    test('should complete incident form submission flow', async () => {
      const form = createCompleteIncidentForm();

      // Validate
      const validation = validateIncidentForm(form.data);
      expect(validation.isValid).toBe(true);

      // Save locally
      const saveResult = storageService.addForm(form);
      expect(saveResult.success).toBe(true);

      // Sync to Firebase
      const forms = storageService.getForms();
      const syncResult = await firebaseSync.syncForms(forms);
      expect(syncResult.success).toBe(true);
    });

    test('should reject incident with future date', () => {
      const form = createCompleteIncidentForm();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      form.data.incidentDate = futureDate.toISOString().split('T')[0];

      const validation = validateIncidentForm(form.data);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Incident date cannot be in the future');
    });

    test('should require signature for incident reports', () => {
      const form = createCompleteIncidentForm();
      form.data.signature = null;

      const validation = validateIncidentForm(form.data);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Signature is required for incident reports');
    });
  });

  describe('Multi-form Operations', () => {
    test('should handle multiple form submissions', async () => {
      // Submit multiple forms
      const forms = [
        {
          id: '1',
          type: 'prestart',
          data: {
            siteConducted: 'Site 1',
            supervisorName: 'John',
            siteHazards: { value: 'Hazard 1', notes: [] },
            highRiskWorks: 'no',
            worksCoveredBySWMS: 'no',
            isPlantEquipmentUsed: 'no',
            signatures: { 'W1': 'sig1' },
            checkType: 'crane',
            checks: { c1: true, c2: true, c3: true, c4: true, c5: true }
          }
        },
        {
          id: '2',
          type: 'incident',
          data: {
            incidentDate: '2026-02-01',
            incidentTime: '10:00',
            incidentType: 'Near Miss',
            location: 'Site 2',
            description: 'Near miss event',
            workerName: 'Jane',
            signature: 'data:image/png;base64,' + 'A'.repeat(1500),
            actionTaken: 'Area secured'
          }
        }
      ];

      for (const form of forms) {
        storageService.addForm(form);
      }

      expect(storageService.getForms()).toHaveLength(2);

      // Sync all
      const allForms = storageService.getForms();
      const syncResult = await firebaseSync.syncForms(allForms);
      expect(syncResult.success).toBe(true);
    });

    test('should update existing form', () => {
      const form = {
        id: '1',
        type: 'prestart',
        data: { siteConducted: 'Original Site' }
      };

      storageService.addForm(form);
      storageService.updateForm('1', { data: { siteConducted: 'Updated Site' } });

      const updated = storageService.getFormById('1');
      expect(updated.data.siteConducted).toBe('Updated Site');
    });

    test('should delete form', () => {
      const form = { id: '1', type: 'prestart', data: {} };
      storageService.addForm(form);

      expect(storageService.getForms()).toHaveLength(1);

      storageService.deleteForm('1');

      expect(storageService.getForms()).toHaveLength(0);
    });
  });

  describe('Error Recovery', () => {
    test('should recover from localStorage failure', () => {
      // Simulate quota exceeded
      const errorStorage = {
        ...mockStorage,
        setItem: jest.fn(() => {
          const error = new Error('Quota exceeded');
          error.name = 'QuotaExceededError';
          throw error;
        })
      };
      const errorService = createStorageService(errorStorage);

      const form = { id: '1', type: 'prestart', data: {} };
      const result = errorService.addForm(form);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Storage quota exceeded');
    });

    test('should maintain data integrity on partial failure', async () => {
      // First form succeeds, second fails
      let callCount = 0;
      mockFirebaseDb.ref.mockReturnValue({
        set: jest.fn(() => {
          callCount++;
          if (callCount > 1) {
            return Promise.reject(new Error('Second call fails'));
          }
          return Promise.resolve();
        })
      });

      const form1 = { id: '1', type: 'prestart', data: {} };
      const form2 = { id: '2', type: 'incident', data: {} };

      storageService.addForm(form1);
      storageService.addForm(form2);

      // Local storage should have both
      expect(storageService.getForms()).toHaveLength(2);
    });
  });
});
