/**
 * Signature Utility Tests
 * CRITICAL PRIORITY - Compliance Requirement
 *
 * Tests signature validation, capture, and verification
 * Ensures signatures meet compliance requirements
 */

import {
  validateSignatureData,
  signaturesMatch,
  getSignatureMetadata,
  isSignatureEmpty,
  createSignatureRecord,
  verifySignatureRecord
} from '../../../src/utils/signature';

describe('Signature Utilities', () => {
  // Helper to create valid signature data
  const createValidSignature = (content = 'A'.repeat(500)) => {
    return `data:image/png;base64,${content}`;
  };

  describe('validateSignatureData', () => {
    test('should reject null signature', () => {
      const result = validateSignatureData(null);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Signature data is required');
    });

    test('should reject undefined signature', () => {
      const result = validateSignatureData(undefined);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Signature data is required');
    });

    test('should reject empty string', () => {
      const result = validateSignatureData('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Signature data is required');
    });

    test('should reject non-string signature', () => {
      const result = validateSignatureData({ data: 'test' });
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Signature data must be a string');
    });

    test('should reject non-data-URL format', () => {
      const result = validateSignatureData('not-a-data-url');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid signature format - must be a data URL');
    });

    test('should reject unsupported image format', () => {
      const result = validateSignatureData('data:image/gif;base64,ABC123');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Unsupported image format');
    });

    test('should reject non-base64 encoded data', () => {
      const result = validateSignatureData('data:image/png,not-base64');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Signature must be base64 encoded');
    });

    test('should reject empty base64 content', () => {
      const result = validateSignatureData('data:image/png;base64,');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Signature appears to be empty');
    });

    test('should reject very short base64 content', () => {
      const result = validateSignatureData('data:image/png;base64,ABC');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Signature appears to be empty');
    });

    test('should reject invalid base64 characters', () => {
      const result = validateSignatureData('data:image/png;base64,ABC!!!???');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid base64 encoding');
    });

    test('should accept valid PNG signature', () => {
      const result = validateSignatureData(createValidSignature());
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test('should accept valid JPEG signature', () => {
      const result = validateSignatureData(`data:image/jpeg;base64,${'B'.repeat(500)}`);
      expect(result.isValid).toBe(true);
    });

    test('should accept valid WebP signature', () => {
      const result = validateSignatureData(`data:image/webp;base64,${'C'.repeat(500)}`);
      expect(result.isValid).toBe(true);
    });

    test('should accept base64 with valid special characters', () => {
      // Base64 allows +, /, and = characters
      const validBase64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/==';
      const paddedBase64 = validBase64.repeat(3); // Make it longer than 100 chars
      const result = validateSignatureData(`data:image/png;base64,${paddedBase64}`);
      expect(result.isValid).toBe(true);
    });
  });

  describe('signaturesMatch', () => {
    test('should return true for identical signatures', () => {
      const sig = createValidSignature();
      expect(signaturesMatch(sig, sig)).toBe(true);
    });

    test('should return false for different signatures', () => {
      const sig1 = createValidSignature('AAA');
      const sig2 = createValidSignature('BBB');
      expect(signaturesMatch(sig1, sig2)).toBe(false);
    });

    test('should return false if first signature is null', () => {
      expect(signaturesMatch(null, createValidSignature())).toBe(false);
    });

    test('should return false if second signature is null', () => {
      expect(signaturesMatch(createValidSignature(), null)).toBe(false);
    });

    test('should return false if both signatures are null', () => {
      expect(signaturesMatch(null, null)).toBe(false);
    });
  });

  describe('getSignatureMetadata', () => {
    test('should extract PNG format', () => {
      const metadata = getSignatureMetadata(createValidSignature());
      expect(metadata.format).toBe('png');
      expect(metadata.isValid).toBe(true);
    });

    test('should extract JPEG format', () => {
      const metadata = getSignatureMetadata(`data:image/jpeg;base64,${'A'.repeat(500)}`);
      expect(metadata.format).toBe('jpeg');
    });

    test('should calculate approximate size', () => {
      const content = 'A'.repeat(400);
      const metadata = getSignatureMetadata(`data:image/png;base64,${content}`);
      // Base64 encoding: 4 characters = 3 bytes
      expect(metadata.size).toBe(300);
    });

    test('should return invalid for invalid signature', () => {
      const metadata = getSignatureMetadata('invalid');
      expect(metadata.isValid).toBe(false);
      expect(metadata.format).toBeNull();
      expect(metadata.size).toBe(0);
    });
  });

  describe('isSignatureEmpty', () => {
    test('should return true for null', () => {
      expect(isSignatureEmpty(null)).toBe(true);
    });

    test('should return true for empty string', () => {
      expect(isSignatureEmpty('')).toBe(true);
    });

    test('should return true for very small signature', () => {
      // Small signature (less than ~1KB)
      const smallSig = `data:image/png;base64,${'A'.repeat(200)}`;
      expect(isSignatureEmpty(smallSig)).toBe(true);
    });

    test('should return false for substantial signature', () => {
      // Larger signature (more than 1KB)
      const largeSig = `data:image/png;base64,${'A'.repeat(2000)}`;
      expect(isSignatureEmpty(largeSig)).toBe(false);
    });

    test('should return true for invalid signature format', () => {
      expect(isSignatureEmpty('not-a-valid-format')).toBe(true);
    });
  });

  describe('createSignatureRecord', () => {
    test('should create valid signature record', () => {
      const signature = createValidSignature('X'.repeat(2000));
      const record = createSignatureRecord(signature, 'John Smith');

      expect(record.data).toBe(signature);
      expect(record.userName).toBe('John Smith');
      expect(record.isValid).toBe(true);
      expect(record.error).toBeNull();
      expect(record.timestamp).toBeDefined();
      expect(record.metadata).toBeDefined();
    });

    test('should mark invalid signature in record', () => {
      const record = createSignatureRecord('invalid', 'John Smith');

      expect(record.isValid).toBe(false);
      expect(record.error).toBeDefined();
    });

    test('should use provided timestamp', () => {
      const timestamp = new Date('2026-01-15T10:30:00Z');
      const record = createSignatureRecord(createValidSignature(), 'Jane', timestamp);

      expect(record.timestamp).toBe('2026-01-15T10:30:00.000Z');
    });

    test('should use current time if no timestamp provided', () => {
      const before = new Date();
      const record = createSignatureRecord(createValidSignature(), 'Jane');
      const after = new Date();

      const recordTime = new Date(record.timestamp);
      expect(recordTime >= before).toBe(true);
      expect(recordTime <= after).toBe(true);
    });

    test('should include metadata in record', () => {
      const record = createSignatureRecord(createValidSignature(), 'Jane');

      expect(record.metadata).toHaveProperty('format');
      expect(record.metadata).toHaveProperty('size');
      expect(record.metadata).toHaveProperty('isValid');
    });
  });

  describe('verifySignatureRecord', () => {
    const createValidRecord = () => ({
      data: createValidSignature('X'.repeat(2000)),
      userName: 'John Smith',
      timestamp: new Date().toISOString()
    });

    test('should verify valid signature record', () => {
      const result = verifySignatureRecord(createValidRecord());

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject null record', () => {
      const result = verifySignatureRecord(null);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Signature record is required');
    });

    test('should reject record without data', () => {
      const record = createValidRecord();
      delete record.data;

      const result = verifySignatureRecord(record);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Signature data is missing');
    });

    test('should reject record with invalid signature data', () => {
      const record = { ...createValidRecord(), data: 'invalid' };

      const result = verifySignatureRecord(record);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should reject record without userName', () => {
      const record = createValidRecord();
      delete record.userName;

      const result = verifySignatureRecord(record);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('User name is missing');
    });

    test('should reject record without timestamp', () => {
      const record = createValidRecord();
      delete record.timestamp;

      const result = verifySignatureRecord(record);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Timestamp is missing');
    });

    test('should reject record with invalid timestamp', () => {
      const record = { ...createValidRecord(), timestamp: 'not-a-date' };

      const result = verifySignatureRecord(record);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid timestamp format');
    });

    test('should return multiple errors for multiple issues', () => {
      const record = {
        data: null,
        userName: null,
        timestamp: 'invalid'
      };

      const result = verifySignatureRecord(record);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });
});
