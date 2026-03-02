/**
 * Other Forms Validation Tests
 * HIGH PRIORITY - Compliance Requirements
 *
 * Tests validation rules for Toolbox Talk, ITP, and Site Inspection forms
 */

import {
  validateToolboxForm,
  validateITPForm,
  validateSiteInspectionForm,
  validateForm
} from '../../../src/validation/formValidation';

describe('Toolbox Talk Form Validation', () => {
  const createValidToolboxForm = (overrides = {}) => ({
    topic: 'Working at Heights Safety',
    location: 'Sydney CBD Site - Level 5',
    conductedBy: 'John Smith',
    date: '2026-02-01',
    attendees: ['Worker 1', 'Worker 2', 'Worker 3'],
    keyPoints: 'Fall protection requirements, harness inspection, anchor points',
    ...overrides
  });

  describe('Required Fields', () => {
    test('should reject form without topic', () => {
      const form = createValidToolboxForm({ topic: '' });
      const result = validateToolboxForm(form);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Topic is required');
    });

    test('should reject form without location', () => {
      const form = createValidToolboxForm({ location: '' });
      const result = validateToolboxForm(form);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Location is required');
    });

    test('should reject form without conductor', () => {
      const form = createValidToolboxForm({ conductedBy: '' });
      const result = validateToolboxForm(form);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Conducted by is required');
    });

    test('should reject form without date', () => {
      const form = createValidToolboxForm({ date: null });
      const result = validateToolboxForm(form);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Date is required');
    });
  });

  describe('Attendees Validation', () => {
    test('should reject form without attendees', () => {
      const form = createValidToolboxForm({ attendees: [] });
      const result = validateToolboxForm(form);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least one attendee is required');
    });

    test('should reject form with null attendees', () => {
      const form = createValidToolboxForm({ attendees: null });
      const result = validateToolboxForm(form);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least one attendee is required');
    });

    test('should accept form with at least one attendee', () => {
      const form = createValidToolboxForm({ attendees: ['Worker 1'] });
      const result = validateToolboxForm(form);

      expect(result.errors).not.toContain('At least one attendee is required');
    });
  });

  describe('Key Points Validation', () => {
    test('should reject form without key points', () => {
      const form = createValidToolboxForm({ keyPoints: '' });
      const result = validateToolboxForm(form);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Key points discussed are required');
    });

    test('should reject form with whitespace-only key points', () => {
      const form = createValidToolboxForm({ keyPoints: '   ' });
      const result = validateToolboxForm(form);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Key points discussed are required');
    });
  });

  describe('Complete Form', () => {
    test('should accept a complete valid toolbox form', () => {
      const form = createValidToolboxForm();
      const result = validateToolboxForm(form);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});

describe('ITP Form Validation', () => {
  const createValidITPForm = (overrides = {}) => ({
    siteName: 'Sydney CBD Project',
    inspectorName: 'Jane Doe',
    date: '2026-02-01',
    checkpoints: {
      'cp1': 'pass',
      'cp2': 'pass',
      'cp3': 'pass'
    },
    supervisorSignature: 'data:image/png;base64,' + 'a'.repeat(1500),
    ...overrides
  });

  describe('Required Fields', () => {
    test('should reject form without site name', () => {
      const form = createValidITPForm({ siteName: '' });
      const result = validateITPForm(form);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Site name is required');
    });

    test('should reject form without inspector name', () => {
      const form = createValidITPForm({ inspectorName: '' });
      const result = validateITPForm(form);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Inspector name is required');
    });

    test('should reject form without date', () => {
      const form = createValidITPForm({ date: null });
      const result = validateITPForm(form);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Date is required');
    });
  });

  describe('Checkpoints Validation', () => {
    test('should reject form with incomplete checkpoints', () => {
      const form = createValidITPForm({
        checkpoints: {
          'cp1': 'pass',
          'cp2': null, // Incomplete
          'cp3': 'pass'
        }
      });
      const result = validateITPForm(form);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('checkpoint(s) are incomplete'))).toBe(true);
    });

    test('should reject form with undefined checkpoints', () => {
      const form = createValidITPForm({
        checkpoints: {
          'cp1': 'pass',
          'cp2': undefined,
          'cp3': 'pass'
        }
      });
      const result = validateITPForm(form);

      expect(result.isValid).toBe(false);
    });

    test('should accept form with all checkpoints completed', () => {
      const form = createValidITPForm({
        checkpoints: {
          'cp1': 'pass',
          'cp2': 'fail',
          'cp3': 'na'
        }
      });
      const result = validateITPForm(form);

      expect(result.errors.some(e => e.includes('incomplete'))).toBe(false);
    });
  });

  describe('Signature Validation', () => {
    test('should reject form without supervisor signature', () => {
      const form = createValidITPForm({ supervisorSignature: null });
      const result = validateITPForm(form);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Supervisor signature is required');
    });

    test('should accept form with supervisor signature', () => {
      const form = createValidITPForm();
      const result = validateITPForm(form);

      expect(result.errors).not.toContain('Supervisor signature is required');
    });
  });

  describe('Complete Form', () => {
    test('should accept a complete valid ITP form', () => {
      const form = createValidITPForm();
      const result = validateITPForm(form);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});

describe('Site Inspection Form Validation', () => {
  const createValidInspectionForm = (overrides = {}) => ({
    siteName: 'North Sydney Site',
    inspectorName: 'Bob Wilson',
    date: '2026-02-01',
    builder: 'ABC Construction',
    areas: ['Ground Floor', 'Level 1', 'Exterior'],
    findings: 'All areas inspected, minor housekeeping issues noted.',
    ...overrides
  });

  describe('Required Fields', () => {
    test('should reject form without site name', () => {
      const form = createValidInspectionForm({ siteName: '' });
      const result = validateSiteInspectionForm(form);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Site name is required');
    });

    test('should reject form without inspector name', () => {
      const form = createValidInspectionForm({ inspectorName: '' });
      const result = validateSiteInspectionForm(form);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Inspector name is required');
    });

    test('should reject form without date', () => {
      const form = createValidInspectionForm({ date: null });
      const result = validateSiteInspectionForm(form);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Date is required');
    });

    test('should reject form without builder', () => {
      const form = createValidInspectionForm({ builder: '' });
      const result = validateSiteInspectionForm(form);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Builder is required');
    });
  });

  describe('Areas Validation', () => {
    test('should reject form without areas', () => {
      const form = createValidInspectionForm({ areas: [] });
      const result = validateSiteInspectionForm(form);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least one area must be inspected');
    });

    test('should reject form with null areas', () => {
      const form = createValidInspectionForm({ areas: null });
      const result = validateSiteInspectionForm(form);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least one area must be inspected');
    });

    test('should accept form with at least one area', () => {
      const form = createValidInspectionForm({ areas: ['Ground Floor'] });
      const result = validateSiteInspectionForm(form);

      expect(result.errors).not.toContain('At least one area must be inspected');
    });
  });

  describe('Complete Form', () => {
    test('should accept a complete valid inspection form', () => {
      const form = createValidInspectionForm();
      const result = validateSiteInspectionForm(form);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});

describe('Generic Form Validator', () => {
  test('should route to correct validator for prestart', () => {
    const form = {
      siteConducted: 'Test Site',
      supervisorName: 'Test',
      siteHazards: { value: 'Test hazards', notes: [] },
      highRiskWorks: 'no',
      worksCoveredBySWMS: 'no',
      isPlantEquipmentUsed: 'no',
      signatures: { 'Worker': 'sig' },
      checkType: 'crane',
      checks: { c1: true, c2: true, c3: true, c4: true, c5: true }
    };
    const result = validateForm('prestart', form);
    expect(result).toHaveProperty('isValid');
    expect(result).toHaveProperty('errors');
  });

  test('should route to correct validator for incident', () => {
    const form = {
      incidentDate: '2026-02-01',
      incidentTime: '10:00',
      incidentType: 'Near Miss',
      location: 'Test',
      description: 'Test incident',
      workerName: 'Test Worker',
      signature: 'data:image/png;base64,' + 'a'.repeat(1500),
      actionTaken: 'Test action'
    };
    const result = validateForm('incident', form);
    expect(result.isValid).toBe(true);
  });

  test('should route to correct validator for toolbox', () => {
    const form = {
      topic: 'Test Topic',
      location: 'Test Location',
      conductedBy: 'Test',
      date: '2026-02-01',
      attendees: ['Worker 1'],
      keyPoints: 'Test key points'
    };
    const result = validateForm('toolbox', form);
    expect(result.isValid).toBe(true);
  });

  test('should handle unknown form type', () => {
    const result = validateForm('unknown-type', {});
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Unknown form type: unknown-type');
  });

  test('should handle steel-itp as ITP form', () => {
    const form = {
      siteName: 'Test Site',
      inspectorName: 'Test',
      date: '2026-02-01',
      checkpoints: { cp1: 'pass' },
      supervisorSignature: 'sig'
    };
    const result = validateForm('steel-itp', form);
    expect(result).toHaveProperty('isValid');
  });
});
