// Signature Encryption Module
// AES-GCM encryption for signatures at rest using Web Crypto API
// Key derived from app password via PBKDF2

var SignatureEncryption = (function() {
  'use strict';

  // In-memory decryption key (cleared on page unload)
  var _cachedKey = null;
  var _cachedPassword = null;

  // Derive AES-GCM key from password using PBKDF2
  async function deriveKey(password, salt) {
    var encoder = new TextEncoder();
    var keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode(salt),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  // Fixed salt for signature encryption key derivation (not the same as password hash salt)
  var SIG_SALT = 'jmart-sig-encryption-2024';

  // Encrypt a string with AES-GCM
  async function encryptString(plaintext, password) {
    var key = _cachedKey && _cachedPassword === password
      ? _cachedKey
      : await deriveKey(password, SIG_SALT);
    _cachedKey = key;
    _cachedPassword = password;

    var encoder = new TextEncoder();
    var iv = crypto.getRandomValues(new Uint8Array(12));
    var encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encoder.encode(plaintext)
    );

    // Pack as: base64(iv + ciphertext)
    var combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    return 'enc:' + arrayBufferToBase64(combined.buffer);
  }

  // Decrypt an AES-GCM encrypted string
  async function decryptString(encData, password) {
    if (!encData || !encData.startsWith('enc:')) {
      return encData; // Not encrypted, return as-is
    }

    var key = _cachedKey && _cachedPassword === password
      ? _cachedKey
      : await deriveKey(password, SIG_SALT);
    _cachedKey = key;
    _cachedPassword = password;

    var combined = base64ToArrayBuffer(encData.slice(4));
    var iv = combined.slice(0, 12);
    var ciphertext = combined.slice(12);

    var decoder = new TextDecoder();
    var decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv) },
      key,
      ciphertext
    );
    return decoder.decode(decrypted);
  }

  // Encrypt entire signatures object { name: dataURL, ... }
  async function encryptSignatures(signaturesObj, password) {
    if (!signaturesObj || typeof signaturesObj !== 'object') return {};
    var encrypted = {};
    var names = Object.keys(signaturesObj);
    for (var i = 0; i < names.length; i++) {
      var name = names[i];
      var sig = signaturesObj[name];
      if (sig && typeof sig === 'string' && sig.startsWith('data:image')) {
        encrypted[name] = await encryptString(sig, password);
      } else if (sig && typeof sig === 'string' && sig.startsWith('enc:')) {
        encrypted[name] = sig; // Already encrypted
      } else {
        encrypted[name] = sig;
      }
    }
    return encrypted;
  }

  // Decrypt entire signatures object
  async function decryptSignatures(signaturesObj, password) {
    if (!signaturesObj || typeof signaturesObj !== 'object') return {};
    var decrypted = {};
    var names = Object.keys(signaturesObj);
    for (var i = 0; i < names.length; i++) {
      var name = names[i];
      var sig = signaturesObj[name];
      try {
        decrypted[name] = await decryptString(sig, password);
      } catch (e) {
        console.warn('[SignatureEncryption] Failed to decrypt signature for', name, ':', e.message);
        decrypted[name] = null; // Can't decrypt — wrong password or corrupted
      }
    }
    return decrypted;
  }

  // Check if a signature value is encrypted
  function isEncrypted(sigValue) {
    return typeof sigValue === 'string' && sigValue.startsWith('enc:');
  }

  // Check if signatures object has any encrypted values
  function hasEncryptedSignatures(signaturesObj) {
    if (!signaturesObj || typeof signaturesObj !== 'object') return false;
    return Object.values(signaturesObj).some(function(v) { return isEncrypted(v); });
  }

  // Cache the password in memory so we don't ask on every operation within a session
  function cachePassword(password) {
    _cachedPassword = password;
    // Pre-derive the key
    deriveKey(password, SIG_SALT).then(function(key) {
      _cachedKey = key;
    }).catch(function() {});
  }

  // Clear cached key (call on logout)
  function clearCache() {
    _cachedKey = null;
    _cachedPassword = null;
  }

  // Get cached password (for re-verification without prompting)
  function getCachedPassword() {
    return _cachedPassword;
  }

  // Helpers
  function arrayBufferToBase64(buffer) {
    var bytes = new Uint8Array(buffer);
    var binary = '';
    for (var i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  function base64ToArrayBuffer(base64) {
    var binary = atob(base64);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  // Clear on page unload for security
  window.addEventListener('beforeunload', clearCache);

  return {
    encryptString: encryptString,
    decryptString: decryptString,
    encryptSignatures: encryptSignatures,
    decryptSignatures: decryptSignatures,
    isEncrypted: isEncrypted,
    hasEncryptedSignatures: hasEncryptedSignatures,
    cachePassword: cachePassword,
    clearCache: clearCache,
    getCachedPassword: getCachedPassword,
    deriveKey: deriveKey
  };
})();
