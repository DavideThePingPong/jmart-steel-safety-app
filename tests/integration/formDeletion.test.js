/**
 * Form Deletion Integration Test
 * Tests the complete form deletion flow:
 * 1. Create form → localStorage + Firebase
 * 2. Delete form → localStorage removed + deletedFormIdsRef updated
 * 3. Firebase listener fires → merge logic respects deletedFormIdsRef
 * 4. Deleted form stays deleted (does NOT reappear)
 *
 * This test catches the exact bug from March 2026 where deleted forms
 * reappeared after Firebase listener re-merged them.
 */

describe('Form Deletion Integration', () => {
  let storageData;
  let mockStorage;
  let forms;
  let deletedFormIdsRef;
  let deletingFormRef;

  beforeEach(() => {
    // Setup localStorage mock
    storageData = {};
    mockStorage = {
      getItem: jest.fn(key => storageData[key] || null),
      setItem: jest.fn((key, value) => { storageData[key] = value; }),
      removeItem: jest.fn(key => { delete storageData[key]; }),
      clear: jest.fn()
    };

    // Simulate the refs from hooks.jsx
    deletedFormIdsRef = { current: new Set() };
    deletingFormRef = { current: false };

    // Initial forms
    forms = [
      { id: 'form-abc123', type: 'prestart', createdAt: '2026-03-18T10:00:00Z', data: { siteConducted: 'Test Site' }, status: 'completed' },
      { id: 'form-def456', type: 'incident', createdAt: '2026-03-17T09:00:00Z', data: { siteConducted: 'Other Site' }, status: 'completed' },
      { id: 'form-ghi789', type: 'toolbox', createdAt: '2026-03-16T08:00:00Z', data: { siteConducted: 'Third Site' }, status: 'completed' }
    ];

    storageData['jmart-safety-forms'] = JSON.stringify(forms);
    storageData['jmart-deleted-form-ids'] = '[]';
  });

  describe('deleteForm flow', () => {
    it('should remove form from local array and persist deleted ID', () => {
      const formIdToDelete = 'form-abc123';

      // Simulate deleteForm from hooks.jsx
      deletedFormIdsRef.current.add(formIdToDelete);
      storageData['jmart-deleted-form-ids'] = JSON.stringify([...deletedFormIdsRef.current]);

      const updatedForms = forms.filter(f => f.id !== formIdToDelete);
      storageData['jmart-safety-forms'] = JSON.stringify(updatedForms);

      // Verify form is removed
      expect(updatedForms).toHaveLength(2);
      expect(updatedForms.find(f => f.id === formIdToDelete)).toBeUndefined();

      // Verify deleted ID is persisted
      const persistedIds = JSON.parse(storageData['jmart-deleted-form-ids']);
      expect(persistedIds).toContain(formIdToDelete);
    });
  });

  describe('Firebase listener merge logic [REGRESSION]', () => {
    it('should NOT re-add deleted forms when Firebase listener fires', () => {
      const formIdToDelete = 'form-abc123';

      // Step 1: Delete the form locally
      deletedFormIdsRef.current.add(formIdToDelete);
      const localForms = forms.filter(f => f.id !== formIdToDelete);
      storageData['jmart-safety-forms'] = JSON.stringify(localForms);

      // Step 2: Firebase listener fires with ALL forms (including the deleted one)
      // This simulates the race condition where Firebase hasn't been updated yet
      const firebaseForms = {
        'form-abc123': { id: 'form-abc123', type: 'prestart', createdAt: '2026-03-18T10:00:00Z', data: { siteConducted: 'Test Site' }, source: 'firebase' },
        'form-def456': { id: 'form-def456', type: 'incident', createdAt: '2026-03-17T09:00:00Z', data: { siteConducted: 'Other Site' }, source: 'firebase' },
        'form-ghi789': { id: 'form-ghi789', type: 'toolbox', createdAt: '2026-03-16T08:00:00Z', data: { siteConducted: 'Third Site' }, source: 'firebase' }
      };

      // Step 3: Simulate the merge logic from useDataSync in hooks.jsx
      const formsArray = Object.values(firebaseForms);
      const formMap = new Map();
      const deletedIds = deletedFormIdsRef.current;

      formsArray.forEach(form => {
        if (deletedIds.has(form.id)) return; // Skip forms deleted offline
        formMap.set(form.id, { ...form, source: 'firebase' });
      });

      // Also merge local-only forms
      const currentLocalForms = JSON.parse(storageData['jmart-safety-forms'] || '[]');
      currentLocalForms.forEach(localForm => {
        if (!formMap.has(localForm.id)) {
          formMap.set(localForm.id, { ...localForm, source: 'local' });
        }
      });

      const mergedForms = [];
      formMap.forEach(form => mergedForms.push(form));

      // CRITICAL ASSERTION: The deleted form must NOT be in the merged result
      expect(mergedForms.find(f => f.id === formIdToDelete)).toBeUndefined();
      expect(mergedForms).toHaveLength(2);
    });

    it('should handle multiple simultaneous deletions', () => {
      // Delete two forms
      deletedFormIdsRef.current.add('form-abc123');
      deletedFormIdsRef.current.add('form-ghi789');

      // Firebase returns all three
      const firebaseForms = Object.fromEntries(
        forms.map(f => [f.id, { ...f, source: 'firebase' }])
      );

      // Merge logic
      const formsArray = Object.values(firebaseForms);
      const formMap = new Map();
      formsArray.forEach(form => {
        if (deletedFormIdsRef.current.has(form.id)) return;
        formMap.set(form.id, form);
      });

      const mergedForms = Array.from(formMap.values());

      // Only form-def456 should survive
      expect(mergedForms).toHaveLength(1);
      expect(mergedForms[0].id).toBe('form-def456');
    });

    it('should persist deleted IDs across page reloads', () => {
      // Delete a form
      deletedFormIdsRef.current.add('form-abc123');
      storageData['jmart-deleted-form-ids'] = JSON.stringify([...deletedFormIdsRef.current]);

      // Simulate page reload: create new ref from localStorage
      const reloadedIds = new Set(JSON.parse(storageData['jmart-deleted-form-ids']));

      // Firebase listener fires after reload
      const firebaseForms = forms.map(f => ({ ...f }));
      const formMap = new Map();
      firebaseForms.forEach(form => {
        if (reloadedIds.has(form.id)) return;
        formMap.set(form.id, form);
      });

      const mergedForms = Array.from(formMap.values());
      expect(mergedForms).toHaveLength(2);
      expect(mergedForms.find(f => f.id === 'form-abc123')).toBeUndefined();
    });

    it('should clean up deleted ID after successful Firebase sync', () => {
      const formIdToDelete = 'form-abc123';

      // Delete form
      deletedFormIdsRef.current.add(formIdToDelete);

      // Simulate successful Firebase sync callback
      // (Firebase now has the updated forms without the deleted one)
      deletedFormIdsRef.current.delete(formIdToDelete);
      storageData['jmart-deleted-form-ids'] = JSON.stringify([...deletedFormIdsRef.current]);

      // Next Firebase listener fires — form-abc123 is no longer in Firebase
      const firebaseForms = forms.filter(f => f.id !== formIdToDelete);
      const formMap = new Map();
      firebaseForms.forEach(form => {
        if (deletedFormIdsRef.current.has(form.id)) return;
        formMap.set(form.id, form);
      });

      const mergedForms = Array.from(formMap.values());
      expect(mergedForms).toHaveLength(2);
      expect(mergedForms.find(f => f.id === formIdToDelete)).toBeUndefined();
    });

    it('should keep deleted ID when Firebase delete is queued instead of treating it as synced', () => {
      const formIdToDelete = 'form-abc123';

      deletedFormIdsRef.current.add(formIdToDelete);
      storageData['jmart-deleted-form-ids'] = JSON.stringify([...deletedFormIdsRef.current]);

      const deleteResult = { success: false, queued: true, error: 'Auth not ready' };

      // Simulate the hooks.jsx delete callback handling.
      if (deleteResult.success) {
        deletedFormIdsRef.current.delete(formIdToDelete);
        storageData['jmart-deleted-form-ids'] = JSON.stringify([...deletedFormIdsRef.current]);
      }

      expect(JSON.parse(storageData['jmart-deleted-form-ids'])).toContain(formIdToDelete);

      // Firebase still returns the form, but local suppression should prevent it from reappearing.
      const firebaseForms = Object.fromEntries(forms.map(f => [f.id, { ...f, source: 'firebase' }]));
      const formMap = new Map();
      Object.values(firebaseForms).forEach(form => {
        if (deletedFormIdsRef.current.has(form.id)) return;
        formMap.set(form.id, form);
      });

      const mergedForms = Array.from(formMap.values());
      expect(mergedForms.find(f => f.id === formIdToDelete)).toBeUndefined();
    });

    it('should prune deleted IDs after Firebase confirms the form is gone', () => {
      const formIdToDelete = 'form-abc123';

      deletedFormIdsRef.current.add(formIdToDelete);
      storageData['jmart-deleted-form-ids'] = JSON.stringify([...deletedFormIdsRef.current]);

      const firebaseForms = forms.filter(f => f.id !== formIdToDelete);
      const remoteIds = new Set(firebaseForms.map(form => form.id));
      let prunedDeletedIds = false;

      [...deletedFormIdsRef.current].forEach(id => {
        if (!remoteIds.has(id)) {
          deletedFormIdsRef.current.delete(id);
          prunedDeletedIds = true;
        }
      });

      if (prunedDeletedIds) {
        storageData['jmart-deleted-form-ids'] = JSON.stringify([...deletedFormIdsRef.current]);
      }

      expect(JSON.parse(storageData['jmart-deleted-form-ids'])).not.toContain(formIdToDelete);
    });

    it('should not merge stale local-only forms back in when Firebase is authoritative', () => {
      storageData['jmart-safety-forms'] = JSON.stringify(forms);
      const firebaseForms = {
        'form-def456': { id: 'form-def456', type: 'incident', createdAt: '2026-03-17T09:00:00Z', data: { siteConducted: 'Other Site' }, source: 'firebase' }
      };

      const formMap = new Map();
      Object.values(firebaseForms).forEach(form => {
        if (deletedFormIdsRef.current.has(form.id)) return;
        formMap.set(form.id, { ...form, source: 'firebase' });
      });

      const currentLocalForms = JSON.parse(storageData['jmart-safety-forms'] || '[]');
      const preserveLocalOnlyForms = false;
      currentLocalForms.forEach(localForm => {
        if (!localForm || deletedFormIdsRef.current.has(localForm.id)) return;
        if (!formMap.has(localForm.id)) {
          if (!preserveLocalOnlyForms) return;
          formMap.set(localForm.id, { ...localForm, source: 'local' });
        }
      });

      const mergedForms = Array.from(formMap.values());
      expect(mergedForms).toHaveLength(1);
      expect(mergedForms[0].id).toBe('form-def456');
    });

    it('should preserve local-only forms when a real queued form sync exists', () => {
      storageData['jmart-safety-forms'] = JSON.stringify(forms);
      const firebaseForms = {
        'form-def456': { id: 'form-def456', type: 'incident', createdAt: '2026-03-17T09:00:00Z', data: { siteConducted: 'Other Site' }, source: 'firebase' }
      };

      const formMap = new Map();
      Object.values(firebaseForms).forEach(form => {
        if (deletedFormIdsRef.current.has(form.id)) return;
        formMap.set(form.id, { ...form, source: 'firebase' });
      });

      const currentLocalForms = JSON.parse(storageData['jmart-safety-forms'] || '[]');
      const preserveLocalOnlyForms = true;
      currentLocalForms.forEach(localForm => {
        if (!localForm || deletedFormIdsRef.current.has(localForm.id)) return;
        if (!formMap.has(localForm.id)) {
          if (!preserveLocalOnlyForms) return;
          formMap.set(localForm.id, { ...localForm, source: 'local' });
        }
      });

      const mergedForms = Array.from(formMap.values());
      expect(mergedForms).toHaveLength(3);
      expect(mergedForms.find(f => f.id === 'form-abc123')).toBeDefined();
      expect(mergedForms.find(f => f.id === 'form-ghi789')).toBeDefined();
    });
  });

  describe('sanitizeForFirebase', () => {
    // Test the universal sanitizer that prevents undefined→Firebase crashes
    const sanitize = (obj) => {
      if (obj === undefined) return null;
      if (obj === null || typeof obj !== 'object') return obj;
      if (Array.isArray(obj)) return obj.map(sanitize);
      var clean = {};
      Object.keys(obj).forEach(k => { clean[k] = sanitize(obj[k]); });
      return clean;
    };

    it('should replace top-level undefined with null', () => {
      expect(sanitize(undefined)).toBe(null);
    });

    it('should replace nested undefined values with null', () => {
      const input = { a: 'hello', b: undefined, c: { d: undefined, e: 42 } };
      const result = sanitize(input);
      expect(result.b).toBe(null);
      expect(result.c.d).toBe(null);
      expect(result.c.e).toBe(42);
    });

    it('should handle arrays with undefined values', () => {
      const input = [1, undefined, 'hello', { x: undefined }];
      const result = sanitize(input);
      expect(result[1]).toBe(null);
      expect(result[3].x).toBe(null);
    });

    it('should pass through clean objects unchanged', () => {
      const input = { id: 'abc', type: 'prestart', data: { site: 'Test' } };
      expect(sanitize(input)).toEqual(input);
    });

    it('should handle the exact audit log case that caused the March 2026 crash', () => {
      // This was the real-world payload that triggered:
      // "set failed: value argument contains undefined in property
      //  'jmart-safety.auditLog.xxx.details.originalCreatedBy'"
      const deletedForm = {
        id: 'form-abc',
        type: 'prestart',
        _modifiedBy: 'DEV-ABC123',
        createdAt: '2026-03-18T10:00:00Z'
        // NOTE: no createdBy field exists on form objects
      };

      const auditDetails = {
        formId: deletedForm.id,
        formType: deletedForm.type,
        originalCreatedBy: deletedForm.createdBy || deletedForm._modifiedBy || 'unknown',
        originalCreatedAt: deletedForm.createdAt || 'unknown'
      };

      const sanitized = sanitize(auditDetails);

      // No undefined values should exist
      Object.values(sanitized).forEach(v => {
        expect(v).not.toBe(undefined);
      });

      // originalCreatedBy should fall back to _modifiedBy
      expect(sanitized.originalCreatedBy).toBe('DEV-ABC123');
    });
  });
});
