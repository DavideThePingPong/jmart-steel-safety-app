/**
 * Incident Report Form Validation Tests
 * CRITICAL PRIORITY - Compliance Requirement
 *
 * Tests validation rules for Incident/Near-Miss Report forms
 * Ensures compliance with WorkCover NSW requirements
 */

import { validateIncidentForm } from '../../../src/validation/formValidation';

describe('Incident Report Form Validation', () => {
  // Helper to create a valid incident form base
  const createValidIncidentForm = (overrides = {}) => ({
    incidentDate: '2026-02-01',
    incidentTime: '14:30',
    incidentType: 'Near Miss',
    location: 'Sydney CBD Construction Site',
    description: 'Worker slipped on wet surface near scaffolding. No injuries sustained.',
    workerName: 'John Smith',
    signature: 'data:image/png;base64,' + 'a'.repeat(1500),
    actionTaken: 'Area cordoned off, wet floor signs placed, supervisor notified.',
    ...overrides
  });

  describe('Incident Date Validation', () => {
    test('should reject form without incident date', () => {
      const form = createValidIncidentForm({ incidentDate: null });
      const result = validateIncidentForm(form);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Incident date is required');
    });

    test('should reject form with empty incident date', () => {
      const form = createValidIncidentForm({ incidentDate: '' });
      const result = validateIncidentForm(form);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Incident date is required');
    });

    test('should reject form with future incident date', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const form = createValidIncidentForm({
        incidentDate: futureDate.toISOString().split('T')[0]
      });
      const result = validateIncidentForm(form);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Incident date cannot be in the future');
    });

    test('should accept form with past incident date', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      const form = createValidIncidentForm({
        incidentDate: pastDate.toISOString().split('T')[0]
      });
      const result = validateIncidentForm(form);

      expect(result.errors).not.toContain('Incident date cannot be in the future');
    });

    test('should accept form with today incident date', () => {
      const today = new Date().toISOString().split('T')[0];
      const form = createValidIncidentForm({ incidentDate: today });
      const result = validateIncidentForm(form);

      expect(result.errors).not.toContain('Incident date cannot be in the future');
    });
  });

  describe('Incident Time Validation', () => {
    test('should reject form without incident time', () => {
      const form = createValidIncidentForm({ incidentTime: null });
      const result = validateIncidentForm(form);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Incident time is required');
    });

    test('should reject form with empty incident time', () => {
      const form = createValidIncidentForm({ incidentTime: '' });
      const result = validateIncidentForm(form);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Incident time is required');
    });
  });

  describe('Incident Type Validation', () => {
    test('should reject form without incident type', () => {
      const form = createValidIncidentForm({ incidentType: '' });
      const result = validateIncidentForm(form);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Incident type is required');
    });

    test('should accept valid incident types', () => {
      const validTypes = ['Near Miss', 'Injury', 'Property Damage', 'Environmental'];
      validTypes.forEach(type => {
        const form = createValidIncidentForm({ incidentType: type });
        const result = validateIncidentForm(form);
        expect(result.errors).not.toContain('Incident type is required');
      });
    });
  });

  describe('Location Validation', () => {
    test('should reject form without location', () => {
      const form = createValidIncidentForm({ location: '' });
      const result = validateIncidentForm(form);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Location is required');
    });

    test('should reject form with whitespace-only location', () => {
      const form = createValidIncidentForm({ location: '   ' });
      const result = validateIncidentForm(form);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Location is required');
    });
  });

  describe('Description Validation', () => {
    test('should reject form without description', () => {
      const form = createValidIncidentForm({ description: '' });
      const result = validateIncidentForm(form);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Description is required');
    });

    test('should reject form with whitespace-only description', () => {
      const form = createValidIncidentForm({ description: '   ' });
      const result = validateIncidentForm(form);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Description is required');
    });

    test('should accept detailed description', () => {
      const form = createValidIncidentForm({
        description: 'At approximately 2:30 PM, a near-miss incident occurred when a worker slipped on a wet surface near the scaffolding area. The worker was able to regain balance and no injuries were sustained. The wet surface was caused by recent rain and inadequate drainage.'
      });
      const result = validateIncidentForm(form);

      expect(result.errors).not.toContain('Description is required');
    });
  });

  describe('Worker Name Validation', () => {
    test('should reject form without worker name', () => {
      const form = createValidIncidentForm({ workerName: '' });
      const result = validateIncidentForm(form);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Worker name is required');
    });

    test('should reject form with null worker name', () => {
      const form = createValidIncidentForm({ workerName: null });
      const result = validateIncidentForm(form);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Worker name is required');
    });
  });

  describe('Signature Validation (Compliance Requirement)', () => {
    test('should reject form without signature', () => {
      const form = createValidIncidentForm({ signature: null });
      const result = validateIncidentForm(form);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Signature is required for incident reports');
    });

    test('should reject form with empty signature', () => {
      const form = createValidIncidentForm({ signature: '' });
      const result = validateIncidentForm(form);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Signature is required for incident reports');
    });

    test('should accept form with valid signature', () => {
      const form = createValidIncidentForm({
        signature: 'data:image/png;base64,' + 'a'.repeat(1500)
      });
      const result = validateIncidentForm(form);

      expect(result.errors).not.toContain('Signature is required for incident reports');
    });
  });

  describe('Action Taken Validation', () => {
    test('should reject form without action taken', () => {
      const form = createValidIncidentForm({ actionTaken: '' });
      const result = validateIncidentForm(form);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Immediate action taken must be documented');
    });

    test('should reject form with whitespace-only action', () => {
      const form = createValidIncidentForm({ actionTaken: '   ' });
      const result = validateIncidentForm(form);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Immediate action taken must be documented');
    });

    test('should accept form with documented action', () => {
      const form = createValidIncidentForm({
        actionTaken: 'Immediately stopped work in the area, secured the scene, notified supervisor and safety officer.'
      });
      const result = validateIncidentForm(form);

      expect(result.errors).not.toContain('Immediate action taken must be documented');
    });
  });

  describe('Complete Form Validation', () => {
    test('should accept a complete valid incident form', () => {
      const form = createValidIncidentForm();
      const result = validateIncidentForm(form);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should return all errors for completely empty form', () => {
      const form = {
        incidentDate: null,
        incidentTime: null,
        incidentType: '',
        location: '',
        description: '',
        workerName: '',
        signature: null,
        actionTaken: ''
      };
      const result = validateIncidentForm(form);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBe(8); // All fields should have errors
    });
  });
});
