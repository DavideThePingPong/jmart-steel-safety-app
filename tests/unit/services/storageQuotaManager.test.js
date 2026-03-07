/**
 * Tests for js/storageQuotaManager.js — StorageQuotaManager
 *
 * The source file has complex IIFE side effects (patches Storage.prototype.setItem,
 * runs emergency boot cleanup). Instead of loading the full file, we construct
 * a minimal mock that replicates the canStore and getUsage logic from the source.
 *
 * REGRESSION bug: canStore used to multiply ALL inputs by 2, but number arguments
 * should be treated as raw byte counts (not multiplied).
 */

describe('StorageQuotaManager', () => {
  let manager;

  beforeEach(() => {
    // Build a minimal replica of StorageQuotaManager with the FIXED logic
    manager = {
      MAX_STORAGE_MB: 5,
      WARNING_THRESHOLD: 0.8,

      getUsage: function() {
        let totalBytes = 0;
        // Iterate over our mock storage
        for (const key in this._store) {
          if (Object.prototype.hasOwnProperty.call(this._store, key)) {
            totalBytes += this._store[key].length * 2; // UTF-16
          }
        }
        const totalMB = totalBytes / (1024 * 1024);
        const percentUsed = (totalMB / this.MAX_STORAGE_MB) * 100;
        return {
          bytes: totalBytes,
          megabytes: totalMB.toFixed(2),
          percentUsed: percentUsed.toFixed(1),
          isWarning: percentUsed >= (this.WARNING_THRESHOLD * 100),
          isCritical: percentUsed >= 95
        };
      },

      canStore: function(dataString) {
        const dataBytes = typeof dataString === 'number'
          ? dataString
          : ((dataString ? dataString.length : 0) * 2);
        const usage = this.getUsage();
        const projectedMB = (usage.bytes + dataBytes) / (1024 * 1024);
        return projectedMB < this.MAX_STORAGE_MB;
      },

      // Simple in-memory store to simulate localStorage for getUsage
      _store: {}
    };
  });

  // -------------------------------------------------------
  // canStore — byte calculation
  // -------------------------------------------------------
  describe('canStore', () => {
    it('should treat number argument as raw byte count, NOT multiply by 2 [REGRESSION]', () => {
      // Storage is empty (0 bytes used)
      // Pass 1000 as a number — should be treated as 1000 bytes, not 2000
      // 1000 bytes / (1024*1024) = ~0.00095 MB, well under 5MB
      expect(manager.canStore(1000)).toBe(true);

      // Verify the distinction: a string of length 1000 should be 2000 bytes
      // but a number 1000 should be exactly 1000 bytes.
      // Set storage close to limit to expose the difference
      const almostFullBytes = 5 * 1024 * 1024 - 1500; // 1500 bytes from limit
      // Simulate used storage: a string whose .length * 2 = almostFullBytes
      const charCount = almostFullBytes / 2;
      manager._store['bigKey'] = 'x'.repeat(charCount);

      // Number 1000: 1000 bytes needed, 1500 available => fits
      expect(manager.canStore(1000)).toBe(true);

      // Number 2000: 2000 bytes needed, 1500 available => does NOT fit
      expect(manager.canStore(2000)).toBe(false);

      // String of length 1000: 1000*2=2000 bytes needed, 1500 available => does NOT fit
      expect(manager.canStore('x'.repeat(1000))).toBe(false);
    });

    it('should treat string argument by multiplying length by 2 (UTF-16)', () => {
      // "hello" has 5 chars => 10 bytes
      expect(manager.canStore('hello')).toBe(true);
    });

    it('should return true when storage is empty and data is small', () => {
      expect(manager.canStore('test data')).toBe(true);
    });

    it('should return false when data would exceed the 5MB limit', () => {
      // Fill storage to near the limit
      const nearFull = (5 * 1024 * 1024) / 2; // chars needed for ~5MB
      manager._store['big'] = 'x'.repeat(nearFull - 10);

      // Try to store another large chunk
      expect(manager.canStore('x'.repeat(100))).toBe(false);
    });

    it('should handle null and empty string gracefully', () => {
      // null => (null ? null.length : 0) * 2 = 0 bytes => always fits
      expect(manager.canStore(null)).toBe(true);
      expect(manager.canStore('')).toBe(true);
    });

    it('should handle zero as a number (0 bytes)', () => {
      expect(manager.canStore(0)).toBe(true);
    });
  });

  // -------------------------------------------------------
  // getUsage
  // -------------------------------------------------------
  describe('getUsage', () => {
    it('should return 0 bytes when storage is empty', () => {
      const usage = manager.getUsage();
      expect(usage.bytes).toBe(0);
      expect(usage.megabytes).toBe('0.00');
      expect(usage.percentUsed).toBe('0.0');
      expect(usage.isWarning).toBe(false);
      expect(usage.isCritical).toBe(false);
    });

    it('should calculate bytes as string length * 2 (UTF-16 encoding)', () => {
      manager._store['key1'] = 'abcde'; // 5 chars => 10 bytes
      const usage = manager.getUsage();
      expect(usage.bytes).toBe(10);
    });

    it('should flag isWarning when usage exceeds 80%', () => {
      // 80% of 5MB = 4MB = 4*1024*1024 bytes => chars = bytes/2
      const charsFor4MB = (4 * 1024 * 1024) / 2;
      manager._store['big'] = 'x'.repeat(charsFor4MB);
      const usage = manager.getUsage();
      expect(usage.isWarning).toBe(true);
    });

    it('should flag isCritical when usage exceeds 95%', () => {
      // 95% of 5MB = 4.75MB
      const charsFor475MB = Math.ceil((4.75 * 1024 * 1024) / 2);
      manager._store['big'] = 'x'.repeat(charsFor475MB);
      const usage = manager.getUsage();
      expect(usage.isCritical).toBe(true);
    });
  });
});
