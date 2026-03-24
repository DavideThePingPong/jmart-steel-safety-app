/**
 * Tests for js/storageQuotaManager.js — StorageQuotaManager
 *
 * Tests the REAL production code (not a mock replica).
 * We strip the two IIFEs (Storage.prototype patch and boot cleanup) during load.
 */

const fs = require('fs');
const path = require('path');

const SCRIPT = path.resolve(__dirname, '..', '..', '..', 'js', 'storageQuotaManager.js');

function loadSQM() {
  let code = fs.readFileSync(SCRIPT, 'utf-8');
  code = code.replace(/^const StorageQuotaManager\s*=/m, 'global.StorageQuotaManager =');
  // Strip both IIFEs at the bottom
  code = code.replace(/^\(function\(\)\s*\{[\s\S]*?\}\)\(\);/gm, '// [STRIPPED IIFE]');
  const fn = new Function(code);
  fn.call(global);
}

/**
 * Creates a localStorage-like object where for...in only yields data keys,
 * and methods (getItem, setItem, etc.) behave like the real localStorage API.
 */
function createTestStorage() {
  const data = {};
  const methods = {
    getItem: jest.fn(key => data[key] !== undefined ? data[key] : null),
    setItem: jest.fn((key, value) => { data[key] = String(value); }),
    removeItem: jest.fn(key => { delete data[key]; }),
    clear: jest.fn(() => { Object.keys(data).forEach(k => delete data[k]); }),
    key: jest.fn(i => Object.keys(data)[i] || null),
  };

  return new Proxy(data, {
    get(target, prop) {
      if (prop === 'length') return Object.keys(data).length;
      if (prop === '_data') return data;
      if (prop in methods) return methods[prop];
      if (prop === 'hasOwnProperty') return key => Object.prototype.hasOwnProperty.call(data, key);
      return data[prop];
    },
    set(target, prop, value) {
      if (prop in methods) { methods[prop] = value; }
      else { data[prop] = value; }
      return true;
    },
    has(target, prop) { return prop in data; },
    ownKeys() { return Object.keys(data); },
    getOwnPropertyDescriptor(target, prop) {
      if (prop in data) {
        return { configurable: true, enumerable: true, value: data[prop], writable: true };
      }
      return undefined;
    }
  });
}

describe('StorageQuotaManager', () => {
  let testStorage;

  beforeEach(() => {
    testStorage = createTestStorage();
    Object.defineProperty(global, 'localStorage', { value: testStorage, writable: true, configurable: true });
    loadSQM();
  });

  afterEach(() => {
    delete global.StorageQuotaManager;
    // Restore setupTests-style mock
    const mock = {
      getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn(),
      clear: jest.fn(), length: 0, key: jest.fn()
    };
    Object.defineProperty(global, 'localStorage', { value: mock, writable: true, configurable: true });
  });

  describe('getUsage()', () => {
    it('returns 0 when empty', () => {
      const u = StorageQuotaManager.getUsage();
      expect(u.bytes).toBe(0);
      expect(u.megabytes).toBe('0.00');
      expect(u.isWarning).toBe(false);
      expect(u.isCritical).toBe(false);
    });

    it('calculates bytes as length * 2 (UTF-16)', () => {
      testStorage._data['k'] = 'abcde';
      expect(StorageQuotaManager.getUsage().bytes).toBe(10);
    });

    it('flags isWarning at 80%+', () => {
      testStorage._data['big'] = 'x'.repeat((4 * 1024 * 1024) / 2);
      expect(StorageQuotaManager.getUsage().isWarning).toBe(true);
    });

    it('flags isCritical at 95%+', () => {
      testStorage._data['big'] = 'x'.repeat(Math.ceil((4.75 * 1024 * 1024) / 2));
      expect(StorageQuotaManager.getUsage().isCritical).toBe(true);
    });
  });

  describe('canStore()', () => {
    it('number = raw bytes, string = length * 2', () => {
      const almostFull = 5 * 1024 * 1024 - 1500;
      testStorage._data['big'] = 'x'.repeat(almostFull / 2);
      expect(StorageQuotaManager.canStore(1000)).toBe(true);
      expect(StorageQuotaManager.canStore(2000)).toBe(false);
      expect(StorageQuotaManager.canStore('x'.repeat(1000))).toBe(false);
    });

    it('handles null, empty, zero', () => {
      expect(StorageQuotaManager.canStore(null)).toBe(true);
      expect(StorageQuotaManager.canStore('')).toBe(true);
      expect(StorageQuotaManager.canStore(0)).toBe(true);
    });
  });

  describe('onStorageChange()', () => {
    it('adds listener and calls immediately', () => {
      const cb = jest.fn();
      StorageQuotaManager.onStorageChange(cb);
      expect(cb).toHaveBeenCalledWith(expect.objectContaining({ bytes: 0 }));
    });

    it('returns unsubscribe function', () => {
      const cb = jest.fn();
      const unsub = StorageQuotaManager.onStorageChange(cb);
      expect(StorageQuotaManager.listeners).toContain(cb);
      unsub();
      expect(StorageQuotaManager.listeners).not.toContain(cb);
    });
  });

  describe('notifyListeners()', () => {
    it('calls all listeners', () => {
      const cb1 = jest.fn(), cb2 = jest.fn();
      StorageQuotaManager.listeners = [cb1, cb2];
      StorageQuotaManager.notifyListeners({ bytes: 100 });
      expect(cb1).toHaveBeenCalledWith({ bytes: 100 });
      expect(cb2).toHaveBeenCalledWith({ bytes: 100 });
    });
  });

  describe('stripLargeData()', () => {
    it('returns non-array unchanged', () => {
      expect(StorageQuotaManager.stripLargeData('hi')).toBe('hi');
      expect(StorageQuotaManager.stripLargeData(null)).toBe(null);
    });

    it('strips base64 over 500 chars', () => {
      const forms = [{ photo: 'data:image/png;base64,' + 'A'.repeat(600) }];
      const r = StorageQuotaManager.stripLargeData(forms);
      expect(r[0].photo).toBe('[in-firebase]');
    });

    it('truncates strings over 5KB', () => {
      const forms = [{ note: 'x'.repeat(6000) }];
      const r = StorageQuotaManager.stripLargeData(forms);
      expect(r[0].note).toContain('...[truncated]');
    });

    it('keeps small strings unchanged', () => {
      const r = StorageQuotaManager.stripLargeData([{ a: 'test' }]);
      expect(r[0].a).toBe('test');
    });

    it('does not mutate original', () => {
      const orig = [{ p: 'data:image/png;base64,' + 'A'.repeat(600) }];
      const saved = orig[0].p;
      StorageQuotaManager.stripLargeData(orig);
      expect(orig[0].p).toBe(saved);
    });
  });

  describe('_stripDeep()', () => {
    it('strips nested base64', () => {
      const obj = { a: { b: 'data:image/png;base64,' + 'X'.repeat(1500) } };
      expect(StorageQuotaManager._stripDeep(obj, 0)).toBe(1);
      expect(obj.a.b).toBe('[stripped]');
    });

    it('handles null/non-object', () => {
      expect(StorageQuotaManager._stripDeep(null, 0)).toBe(0);
    });

    it('respects max depth', () => {
      const obj = { a: 'data:image/png;base64,' + 'X'.repeat(1500) };
      expect(StorageQuotaManager._stripDeep(obj, 11)).toBe(0);
    });
  });

  describe('safeFormsWrite()', () => {
    it('writes [] for empty input', () => {
      StorageQuotaManager.safeFormsWrite([]);
      expect(testStorage._data['jmart-safety-forms']).toBe('[]');
    });

    it('strips large data', () => {
      const forms = [{ id: '1', photo: 'data:image/png;base64,' + 'A'.repeat(600), createdAt: '2026-01-01' }];
      StorageQuotaManager.safeFormsWrite(forms);
      const w = JSON.parse(testStorage._data['jmart-safety-forms']);
      expect(w[0].photo).toBe('[in-firebase]');
    });

    it('trims forms to fit MAX_FORMS_BYTES', () => {
      // Use many forms with lots of small non-strippable fields to exceed 1.5MB
      const forms = [];
      for (let i = 0; i < 500; i++) {
        const f = { id: `form-${i}`, createdAt: new Date().toISOString() };
        // Add many small fields (each under 500 chars so won't be stripped)
        for (let j = 0; j < 20; j++) {
          f[`field_${j}`] = 'x'.repeat(400);
        }
        forms.push(f);
      }
      StorageQuotaManager.safeFormsWrite(forms);
      const w = JSON.parse(testStorage._data['jmart-safety-forms']);
      expect(w.length).toBeLessThan(500);
    });

    it('sorts newest first', () => {
      StorageQuotaManager.safeFormsWrite([
        { id: '1', createdAt: '2025-01-01' },
        { id: '2', createdAt: '2026-01-01' }
      ]);
      const w = JSON.parse(testStorage._data['jmart-safety-forms']);
      expect(w[0].id).toBe('2');
    });
  });

  describe('safePhotoQueueWrite()', () => {
    it('writes [] for empty input', () => {
      StorageQuotaManager.safePhotoQueueWrite([]);
      expect(testStorage._data['jmart-photo-queue']).toBe('[]');
    });

    it('writes valid queue', () => {
      StorageQuotaManager.safePhotoQueueWrite([{ f: 'a.jpg', queuedAt: '2026-01-01' }]);
      expect(JSON.parse(testStorage._data['jmart-photo-queue'])).toHaveLength(1);
    });

    it('drops oldest when over 500KB budget', () => {
      const queue = [];
      for (let i = 0; i < 50; i++) {
        // Each item ~20KB, 50 items = ~1MB > 500KB
        queue.push({ data: 'y'.repeat(20000), queuedAt: new Date(2026, 0, i + 1).toISOString() });
      }
      StorageQuotaManager.safePhotoQueueWrite(queue);
      const w = JSON.parse(testStorage._data['jmart-photo-queue']);
      expect(w.length).toBeLessThan(50);
    });

    it('writes [] when single item exceeds budget', () => {
      StorageQuotaManager.safePhotoQueueWrite([{ data: 'x'.repeat(600000), queuedAt: '2026-01-01' }]);
      expect(testStorage._data['jmart-photo-queue']).toBe('[]');
    });
  });

  describe('safeRecordingsWrite()', () => {
    it('writes [] for empty input', () => {
      StorageQuotaManager.safeRecordingsWrite([]);
      expect(testStorage._data['jmart-job-recordings']).toBe('[]');
    });

    it('strips large data', () => {
      const recs = [{ photo: 'data:image/png;base64,' + 'A'.repeat(600), date: '2026-01-01' }];
      StorageQuotaManager.safeRecordingsWrite(recs);
      const w = JSON.parse(testStorage._data['jmart-job-recordings']);
      expect(w[0].photo).toBe('[in-firebase]');
    });

    it('trims when over 500KB budget', () => {
      const recs = [];
      for (let i = 0; i < 200; i++) {
        const r = { id: `r-${i}`, date: new Date().toISOString() };
        for (let j = 0; j < 10; j++) r[`f${j}`] = 'a'.repeat(400);
        recs.push(r);
      }
      StorageQuotaManager.safeRecordingsWrite(recs);
      const w = JSON.parse(testStorage._data['jmart-job-recordings']);
      expect(w.length).toBeLessThan(200);
    });
  });

  describe('safeSignaturesWrite()', () => {
    it('writes {} for null', () => {
      StorageQuotaManager.safeSignaturesWrite(null);
      expect(testStorage._data['jmart-team-signatures']).toBe('{}');
    });

    it('writes valid sigs', () => {
      StorageQuotaManager.safeSignaturesWrite({ a: 's1', b: 's2' });
      expect(JSON.parse(testStorage._data['jmart-team-signatures']).a).toBe('s1');
    });

    it('does not trim signatures automatically', () => {
      const sigs = {};
      for (let i = 0; i < 100; i++) sigs[`s${i}`] = 'x'.repeat(5000);
      StorageQuotaManager.safeSignaturesWrite(sigs);
      const w = JSON.parse(testStorage._data['jmart-team-signatures']);
      expect(Object.keys(w).length).toBe(100);
    });

    it('does not delete existing signatures when a write fails', () => {
      testStorage._data['jmart-team-signatures'] = JSON.stringify({ keep: 'me' });
      testStorage.setItem.mockImplementation(() => { throw new Error('fail'); });
      StorageQuotaManager.safeSignaturesWrite({ changed: 'value' });
      expect(JSON.parse(testStorage._data['jmart-team-signatures'])).toEqual({ keep: 'me' });
    });
  });

  describe('cleanup()', () => {
    it('removes temp/cache keys', () => {
      testStorage._data['app-temp-data'] = 'x';
      testStorage._data['my-cache-key'] = 'y';
      StorageQuotaManager.cleanup();
      expect(testStorage.removeItem).toHaveBeenCalledWith('app-temp-data');
      expect(testStorage.removeItem).toHaveBeenCalledWith('my-cache-key');
    });

    it('returns result with cleaned count and usage', () => {
      const r = StorageQuotaManager.cleanup();
      expect(r).toHaveProperty('cleaned');
      expect(r).toHaveProperty('usage');
    });

    it('nukes bloated sync queue', () => {
      testStorage._data['jmart-sync-queue'] = 'x'.repeat(600000);
      StorageQuotaManager.cleanup();
      expect(testStorage._data['jmart-sync-queue']).toBe('[]');
    });

    it('trims audit log to 200', () => {
      testStorage._data['jmart-audit-log'] = JSON.stringify(Array.from({ length: 300 }, (_, i) => ({ id: i })));
      StorageQuotaManager.cleanup();
      expect(JSON.parse(testStorage._data['jmart-audit-log']).length).toBe(200);
    });

    it('removes backup keys', () => {
      testStorage._data['my-backup-thing'] = 'old';
      StorageQuotaManager.cleanup();
      expect(testStorage.removeItem).toHaveBeenCalledWith('my-backup-thing');
    });
  });

  describe('safeSave()', () => {
    it('saves JSON data', () => {
      StorageQuotaManager.safeSave('k', { a: 1 });
      expect(testStorage._data['k']).toBe('{"a":1}');
    });

    it('saves string data', () => {
      StorageQuotaManager.safeSave('k', 'hello');
      expect(testStorage._data['k']).toBe('hello');
    });

    it('notifies listeners in warning zone', () => {
      const cb = jest.fn();
      StorageQuotaManager.listeners = [cb];
      testStorage._data['big'] = 'x'.repeat(Math.ceil((4.25 * 1024 * 1024) / 2));
      StorageQuotaManager.safeSave('s', 'hi');
      expect(cb).toHaveBeenCalled();
    });
  });

  describe('stripPhotosFromForms()', () => {
    it('skips small forms', () => {
      testStorage._data['jmart-safety-forms'] = JSON.stringify([{ id: 1 }]);
      expect(StorageQuotaManager.stripPhotosFromForms()).toBe(0);
    });

    it('strips base64 from large forms', () => {
      const big = Array.from({ length: 30 }, () => ({
        photo: 'data:image/png;base64,' + 'A'.repeat(2000)
      }));
      testStorage._data['jmart-safety-forms'] = JSON.stringify(big);
      expect(StorageQuotaManager.stripPhotosFromForms()).toBeGreaterThan(0);
      expect(JSON.parse(testStorage._data['jmart-safety-forms'])[0].photo).toBe('[stripped]');
    });

    it('returns 0 when key missing', () => {
      expect(StorageQuotaManager.stripPhotosFromForms()).toBe(0);
    });
  });
});
