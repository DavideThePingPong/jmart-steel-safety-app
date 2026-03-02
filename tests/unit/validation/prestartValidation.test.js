/**
 * Pre-Start Form Validation Tests
 * CRITICAL PRIORITY - WHS Compliance
 *
 * Tests validation rules for Pre-Start Checklist forms
 * Ensures compliance with NSW WHS Act requirements
 */

import {
  validatePrestartForm,
  validateSignature
} from '../../../src/validation/formValidation';

describe('Pre-Start Form Validation', () => {
  // Helper to create a valid form base
  const createValidPrestartForm = (overrides = {}) => ({
    siteConducted: 'Sydney CBD Site',
    supervisorName: 'John Smith',
    siteHazards: { value: 'Working at heights, electrical hazards', notes: [] },
    highRiskWorks: 'yes',
    worksCoveredBySWMS: 'yes',
    isPlantEquipmentUsed: 'yes',
    signatures: { 'Worker 1': 'data:image/png;base64,validSignatureData' },
    checkType: 'site',
    checks: { s1: true, s2: true, s3: true, s4: true, s5: true, s6: true, s7: true, s8: true, s9: true, s10: true },
    ...overrides
  });

  describe('Site/Location Validation', () => {
    test('should reject form without site/location', () => {
      const form = createValidPrestartForm({ siteConducted: '' });
      const result = validatePrestartForm(form);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Site/Location is required');
    });

    test('should reject form with whitespace-only site', () => {
      const form = createValidPrestartForm({ siteConducted: '   ' });
      const result = validatePrestartForm(form);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Site/Location is required');
    });

    test('should accept form with valid site', () => {
      const form = createValidPrestartForm({ siteConducted: 'North Sydney' });
      const result = validatePrestartForm(form);

      expect(result.isValid).toBe(true);
    });
  });

  describe('Supervisor Name Validation', () => {
    test('should reject form without supervisor name', () => {
      const form = createValidPrestartForm({ supervisorName: '' });
      const result = validatePrestartForm(form);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Supervisor name is required');
    });

    test('should reject form with null supervisor name', () => {
      const form = createValidPrestartForm({ supervisorName: null });
      const result = validatePrestartForm(form);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Supervisor name is required');
    });
  });

  describe('Site Hazards Validation (WHS Requirement)', () => {
    test('should reject form without site hazards identified', () => {
      const form = createValidPrestartForm({
        siteHazards: { value: '', notes: [] }
      });
      const result = validatePrestartForm(form);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Site hazards must be identified');
    });

    test('should accept form with hazards in value field', () => {
      const form = createValidPrestartForm({
        siteHazards: { value: 'Electrical hazards near work area', notes: [] }
      });
      const result = validatePrestartForm(form);

      expect(result.isValid).toBe(true);
    });

    test('should accept form with hazards in notes only', () => {
      const form = createValidPrestartForm({
        siteHazards: { value: '', notes: ['Working at heights risk'] }
      });
      const result = validatePrestartForm(form);

      expect(result.isValid).toBe(true);
    });

    test('should accept string format for hazards (legacy)', () => {
      const form = createValidPrestartForm({
        siteHazards: 'Dust and debris hazards'
      });
      const result = validatePrestartForm(form);

      expect(result.isValid).toBe(true);
    });
  });

  describe('High-Risk Works Validation (WHS Requirement)', () => {
    test('should reject form without high-risk works answer', () => {
      const form = createValidPrestartForm({ highRiskWorks: null });
      const result = validatePrestartForm(form);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('High-risk works question must be answered');
    });

    test('should reject form with undefined high-risk works', () => {
      const form = createValidPrestartForm({ highRiskWorks: undefined });
      const result = validatePrestartForm(form);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('High-risk works question must be answered');
    });

    test('should accept yes, no, or na values', () => {
      ['yes', 'no', 'na'].forEach(value => {
        const form = createValidPrestartForm({ highRiskWorks: value });
        // Adjust SWMS based on high-risk answer
        if (value === 'yes') {
          form.worksCoveredBySWMS = 'yes';
        }
        const result = validatePrestartForm(form);
        expect(result.errors).not.toContain('High-risk works question must be answered');
      });
    });
  });

  describe('SWMS Coverage Validation (WHS Requirement)', () => {
    test('should reject form without SWMS coverage answer', () => {
      const form = createValidPrestartForm({ worksCoveredBySWMS: null });
      const result = validatePrestartForm(form);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('SWMS coverage question must be answered');
    });

    test('should reject high-risk works without SWMS coverage', () => {
      const form = createValidPrestartForm({
        highRiskWorks: 'yes',
        worksCoveredBySWMS: 'no'
      });
      const result = validatePrestartForm(form);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('High-risk works require SWMS coverage');
    });

    test('should accept high-risk works with SWMS coverage', () => {
      const form = createValidPrestartForm({
        highRiskWorks: 'yes',
        worksCoveredBySWMS: 'yes'
      });
      const result = validatePrestartForm(form);

      expect(result.errors).not.toContain('High-risk works require SWMS coverage');
    });

    test('should allow no SWMS for non-high-risk works', () => {
      const form = createValidPrestartForm({
        highRiskWorks: 'no',
        worksCoveredBySWMS: 'no'
      });
      const result = validatePrestartForm(form);

      expect(result.errors).not.toContain('High-risk works require SWMS coverage');
    });
  });

  describe('Plant/Equipment Validation', () => {
    test('should reject form without plant/equipment answer', () => {
      const form = createValidPrestartForm({ isPlantEquipmentUsed: null });
      const result = validatePrestartForm(form);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Plant/equipment question must be answered');
    });
  });

  describe('Signature Validation (Compliance Requirement)', () => {
    test('should reject form without any signatures', () => {
      const form = createValidPrestartForm({ signatures: {} });
      const result = validatePrestartForm(form);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least one worker must sign on');
    });

    test('should reject form with all null signatures', () => {
      const form = createValidPrestartForm({
        signatures: { 'Worker 1': null, 'Worker 2': null }
      });
      const result = validatePrestartForm(form);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least one worker must sign on');
    });

    test('should accept form with at least one signature', () => {
      const form = createValidPrestartForm({
        signatures: { 'Worker 1': 'data:image/png;base64,abc', 'Worker 2': null }
      });
      const result = validatePrestartForm(form);

      expect(result.errors).not.toContain('At least one worker must sign on');
    });

    test('should reject form with no signatures object', () => {
      const form = createValidPrestartForm({ signatures: null });
      const result = validatePrestartForm(form);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least one worker must sign on');
    });
  });

  describe('Checklist Completion Validation', () => {
    test('should reject incomplete site checklist', () => {
      const form = createValidPrestartForm({
        checkType: 'site',
        checks: { s1: true, s2: true } // Only 2 of 10 items
      });
      const result = validatePrestartForm(form);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('All 10 checklist items must be completed (2 done)');
    });

    test('should accept complete site checklist', () => {
      const form = createValidPrestartForm({
        checkType: 'site',
        checks: {
          s1: true, s2: true, s3: true, s4: true, s5: true,
          s6: true, s7: true, s8: true, s9: true, s10: true
        }
      });
      const result = validatePrestartForm(form);

      expect(result.errors.some(e => e.includes('checklist items must be completed'))).toBe(false);
    });

    test('should validate crane checklist (5 items)', () => {
      const form = createValidPrestartForm({
        checkType: 'crane',
        checks: { c1: true, c2: true } // Only 2 of 5
      });
      const result = validatePrestartForm(form);

      expect(result.errors).toContain('All 5 checklist items must be completed (2 done)');
    });

    test('should accept complete crane checklist', () => {
      const form = createValidPrestartForm({
        checkType: 'crane',
        checks: { c1: true, c2: true, c3: true, c4: true, c5: true }
      });
      const result = validatePrestartForm(form);

      expect(result.errors.some(e => e.includes('checklist items must be completed'))).toBe(false);
    });
  });

  describe('Complete Valid Form', () => {
    test('should accept a complete valid form', () => {
      const form = createValidPrestartForm();
      const result = validatePrestartForm(form);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should return multiple errors for multiple issues', () => {
      const form = {
        siteConducted: '',
        supervisorName: '',
        siteHazards: { value: '', notes: [] },
        highRiskWorks: null,
        worksCoveredBySWMS: null,
        isPlantEquipmentUsed: null,
        signatures: {},
        checkType: 'site',
        checks: {}
      };
      const result = validatePrestartForm(form);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(5);
    });
  });
});

describe('Signature Validation', () => {
  test('should reject null signature', () => {
    const result = validateSignature(null);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Signature is required');
  });

  test('should reject empty signature', () => {
    const result = validateSignature('');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Signature is required');
  });

  test('should reject invalid format', () => {
    const result = validateSignature('not-a-valid-signature');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Invalid signature format');
  });

  test('should reject very short signature (likely empty canvas)', () => {
    const result = validateSignature('data:image/png;base64,abc');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Signature appears to be empty or too simple');
  });

  test('should accept valid signature data', () => {
    // Create a signature that's long enough (> 1000 chars)
    const longSignature = 'data:image/png;base64,' + 'a'.repeat(1500);
    const result = validateSignature(longSignature);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
