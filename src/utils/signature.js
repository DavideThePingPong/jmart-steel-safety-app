/**
 * Signature Utilities for JMart Steel Safety App
 * Handles signature capture, validation, and storage
 */

/**
 * Validates signature data
 * @param {string} signatureData - Base64 encoded signature
 * @returns {Object} - { isValid: boolean, error?: string }
 */
export function validateSignatureData(signatureData) {
  if (!signatureData) {
    return { isValid: false, error: 'Signature data is required' };
  }

  if (typeof signatureData !== 'string') {
    return { isValid: false, error: 'Signature data must be a string' };
  }

  // Check for valid data URL format
  if (!signatureData.startsWith('data:image/')) {
    return { isValid: false, error: 'Invalid signature format - must be a data URL' };
  }

  // Check supported image formats
  const validFormats = ['data:image/png', 'data:image/jpeg', 'data:image/webp'];
  const hasValidFormat = validFormats.some(format => signatureData.startsWith(format));
  if (!hasValidFormat) {
    return { isValid: false, error: 'Unsupported image format' };
  }

  // Check for base64 content
  if (!signatureData.includes(';base64,')) {
    return { isValid: false, error: 'Signature must be base64 encoded' };
  }

  // Extract base64 content
  const base64Content = signatureData.split(';base64,')[1];
  if (!base64Content || base64Content.length < 100) {
    return { isValid: false, error: 'Signature appears to be empty' };
  }

  // Validate base64 characters
  const base64Regex = /^[A-Za-z0-9+/=]+$/;
  if (!base64Regex.test(base64Content)) {
    return { isValid: false, error: 'Invalid base64 encoding' };
  }

  return { isValid: true };
}

/**
 * Compares two signatures to check if they are identical
 * @param {string} sig1 - First signature
 * @param {string} sig2 - Second signature
 * @returns {boolean} - True if signatures are identical
 */
export function signaturesMatch(sig1, sig2) {
  if (!sig1 || !sig2) return false;
  return sig1 === sig2;
}

/**
 * Extracts signature metadata
 * @param {string} signatureData - Base64 signature data
 * @returns {Object} - { format: string, size: number, isValid: boolean }
 */
export function getSignatureMetadata(signatureData) {
  const validation = validateSignatureData(signatureData);
  if (!validation.isValid) {
    return { format: null, size: 0, isValid: false };
  }

  // Extract format
  const formatMatch = signatureData.match(/^data:image\/(\w+)/);
  const format = formatMatch ? formatMatch[1] : 'unknown';

  // Calculate approximate size in bytes
  const base64Content = signatureData.split(';base64,')[1];
  const size = Math.ceil((base64Content.length * 3) / 4);

  return {
    format,
    size,
    isValid: true
  };
}

/**
 * Creates a blank canvas signature (for testing/initialization)
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @returns {string} - Base64 data URL of blank canvas
 */
export function createBlankSignature(width = 300, height = 150) {
  // This would use canvas in browser, for testing return a placeholder
  if (typeof document === 'undefined') {
    // Node.js environment - return mock data
    return `data:image/png;base64,${'A'.repeat(200)}`;
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, width, height);
  return canvas.toDataURL('image/png');
}

/**
 * Checks if a signature is likely empty (mostly white/transparent)
 * This is a simple heuristic based on data size
 * @param {string} signatureData - Base64 signature data
 * @returns {boolean} - True if signature appears empty
 */
export function isSignatureEmpty(signatureData) {
  if (!signatureData) return true;

  const metadata = getSignatureMetadata(signatureData);
  if (!metadata.isValid) return true;

  // A signature with actual content should be larger than ~1KB
  // An empty white canvas compressed is typically smaller
  return metadata.size < 1000;
}

/**
 * Associates a signature with a user identity
 * @param {string} signatureData - Base64 signature data
 * @param {string} userName - User name
 * @param {Date} timestamp - Timestamp of signing
 * @returns {Object} - Signature record
 */
export function createSignatureRecord(signatureData, userName, timestamp = new Date()) {
  const validation = validateSignatureData(signatureData);

  return {
    data: signatureData,
    userName,
    timestamp: timestamp.toISOString(),
    isValid: validation.isValid,
    error: validation.error || null,
    metadata: getSignatureMetadata(signatureData)
  };
}

/**
 * Verifies a signature record
 * @param {Object} signatureRecord - Signature record to verify
 * @returns {Object} - { isValid: boolean, errors: string[] }
 */
export function verifySignatureRecord(signatureRecord) {
  const errors = [];

  if (!signatureRecord) {
    return { isValid: false, errors: ['Signature record is required'] };
  }

  if (!signatureRecord.data) {
    errors.push('Signature data is missing');
  } else {
    const validation = validateSignatureData(signatureRecord.data);
    if (!validation.isValid) {
      errors.push(validation.error);
    }
  }

  if (!signatureRecord.userName) {
    errors.push('User name is missing');
  }

  if (!signatureRecord.timestamp) {
    errors.push('Timestamp is missing');
  } else {
    const timestamp = new Date(signatureRecord.timestamp);
    if (isNaN(timestamp.getTime())) {
      errors.push('Invalid timestamp format');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export default {
  validateSignatureData,
  signaturesMatch,
  getSignatureMetadata,
  createBlankSignature,
  isSignatureEmpty,
  createSignatureRecord,
  verifySignatureRecord
};
