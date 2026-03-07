/**
 * Tests for js/auditLogManager.js — AuditLogManager
 *
 * Note: setupTests.js provides jest.fn() mocks for localStorage.
 * We use an in-memory store to back getItem/setItem.
 */

const loadScript = require('../../helpers/loadScript');

describe('AuditLogManager', () => {
  let mockFirebaseSet;
  let store;

  beforeEach(() => {
    store = {};
    localStorage.getItem.mockImplementation(key => store[key] !== undefined ? store[key] : null);
    localStorage.setItem.mockImplementation((key, value) => { store[key] = String(value); });

    global.DeviceAuthManager = { deviceId: 'test-device-123' };
    mockFirebaseSet = jest.fn().mockResolvedValue(undefined);
    global.firebaseDb = { ref: jest.fn(() => ({ set: mockFirebaseSet })) };
    global.isFirebaseConfigured = true;

    loadScript('js/auditLogManager.js', { globalizeConst: ['AuditLogManager'], quiet: true });
  });

  afterEach(() => {
    delete global.AuditLogManager;
    delete global.DeviceAuthManager;
  });

  describe('log()', () => {
    it('creates entry with correct shape', async () => {
      store['jmart-user-name'] = 'Test User';
      const entry = await AuditLogManager.log('create', { formId: 'f1', formType: 'prestart' });
      expect(entry).toMatchObject({
        action: 'create', deviceId: 'test-device-123', userName: 'Test User',
        details: { formId: 'f1', formType: 'prestart' }
      });
      expect(entry.id).toBeTruthy();
      expect(typeof entry.timestamp).toBe('number');
      expect(entry.timestampISO).toBeTruthy();
    });

    it('generates unique IDs', async () => {
      const e1 = await AuditLogManager.log('create', {});
      const e2 = await AuditLogManager.log('update', {});
      expect(e1.id).not.toBe(e2.id);
    });

    it('uses "Unknown User" when no user name set', async () => {
      const entry = await AuditLogManager.log('view', {});
      expect(entry.userName).toBe('Unknown User');
    });

    it('uses "unknown" when DeviceAuthManager has no deviceId', async () => {
      global.DeviceAuthManager = { deviceId: null };
      const entry = await AuditLogManager.log('view', {});
      expect(entry.deviceId).toBe('unknown');
    });

    it('saves to localStorage', async () => {
      await AuditLogManager.log('create', { formId: 'f1' });
      const stored = JSON.parse(store['jmart-audit-log']);
      expect(stored).toHaveLength(1);
      expect(stored[0].action).toBe('create');
    });

    it('caps at 200 entries', async () => {
      store['jmart-audit-log'] = JSON.stringify(
        Array.from({ length: 200 }, (_, i) => ({ id: `old-${i}`, action: 'view', timestamp: Date.now() }))
      );
      await AuditLogManager.log('create', { formId: 'new' });
      const stored = JSON.parse(store['jmart-audit-log']);
      expect(stored.length).toBeLessThanOrEqual(200);
      expect(stored[stored.length - 1].action).toBe('create');
    });

    it('caps by byte size at 200KB', async () => {
      store['jmart-audit-log'] = JSON.stringify(
        Array.from({ length: 100 }, (_, i) => ({ id: `big-${i}`, action: 'create', details: { data: 'x'.repeat(3000) }, timestamp: Date.now() }))
      );
      await AuditLogManager.log('create', { formId: 'test' });
      expect(store['jmart-audit-log'].length).toBeLessThanOrEqual(200000);
    });

    it('syncs to Firebase when configured', async () => {
      const entry = await AuditLogManager.log('create', { formId: 'f1' });
      expect(global.firebaseDb.ref).toHaveBeenCalledWith('jmart-safety/auditLog/' + entry.id);
      expect(mockFirebaseSet).toHaveBeenCalledWith(entry);
    });

    it('skips Firebase when not configured', async () => {
      global.isFirebaseConfigured = false;
      await AuditLogManager.log('create', {});
      expect(mockFirebaseSet).not.toHaveBeenCalled();
    });

    it('skips Firebase when firebaseDb is null', async () => {
      global.firebaseDb = null;
      await AuditLogManager.log('create', {});
    });

    it('handles localStorage write errors', async () => {
      localStorage.setItem.mockImplementation(() => { throw new Error('quota'); });
      const spy = jest.spyOn(console, 'error').mockImplementation();
      const entry = await AuditLogManager.log('create', {});
      expect(entry).toBeTruthy();
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('handles Firebase sync errors', async () => {
      mockFirebaseSet.mockRejectedValue(new Error('network'));
      const spy = jest.spyOn(console, 'error').mockImplementation();
      const entry = await AuditLogManager.log('create', {});
      expect(entry).toBeTruthy();
      spy.mockRestore();
    });
  });

  describe('getRecent()', () => {
    it('returns empty array when no log', () => {
      expect(AuditLogManager.getRecent()).toEqual([]);
    });

    it('returns entries in reverse order', () => {
      store['jmart-audit-log'] = JSON.stringify([
        { id: '1', timestamp: 1000 }, { id: '2', timestamp: 2000 }, { id: '3', timestamp: 3000 }
      ]);
      const recent = AuditLogManager.getRecent();
      expect(recent[0].id).toBe('3');
      expect(recent[2].id).toBe('1');
    });

    it('respects limit parameter', () => {
      store['jmart-audit-log'] = JSON.stringify(
        Array.from({ length: 10 }, (_, i) => ({ id: `${i}`, timestamp: i }))
      );
      expect(AuditLogManager.getRecent(3)).toHaveLength(3);
    });

    it('handles corrupt localStorage', () => {
      store['jmart-audit-log'] = 'not-json';
      const spy = jest.spyOn(console, 'error').mockImplementation();
      expect(AuditLogManager.getRecent()).toEqual([]);
      spy.mockRestore();
    });
  });

  describe('getFormHistory()', () => {
    it('filters by formId', () => {
      store['jmart-audit-log'] = JSON.stringify([
        { id: '1', details: { formId: 'f1' } },
        { id: '2', details: { formId: 'f2' } },
        { id: '3', details: { formId: 'f1' } }
      ]);
      const history = AuditLogManager.getFormHistory('f1');
      expect(history).toHaveLength(2);
    });

    it('returns empty when no matches', () => {
      store['jmart-audit-log'] = JSON.stringify([{ id: '1', details: { formId: 'other' } }]);
      expect(AuditLogManager.getFormHistory('x')).toEqual([]);
    });

    it('skips entries without details', () => {
      store['jmart-audit-log'] = JSON.stringify([
        { id: '1' },
        { id: '2', details: { formId: 'f1' } }
      ]);
      expect(AuditLogManager.getFormHistory('f1')).toHaveLength(1);
    });

    it('handles corrupt localStorage', () => {
      store['jmart-audit-log'] = '{broken';
      const spy = jest.spyOn(console, 'error').mockImplementation();
      expect(AuditLogManager.getFormHistory('f1')).toEqual([]);
      spy.mockRestore();
    });
  });
});
