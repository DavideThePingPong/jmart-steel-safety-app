/**
 * Tests for DeviceAuthManager alias — verifies that DeviceAuthManager === DeviceAuth
 * after loading deviceAuth.js, and that initWithStatus() returns correct formats.
 */

const loadScript = require('../../helpers/loadScript');

describe('DeviceAuthManager (alias)', () => {
  let origLocalStorage;

  beforeEach(() => {
    origLocalStorage = global.localStorage;

    // Mock globals that deviceAuth.js depends on
    global.navigator = {
      userAgent: 'TestAgent',
      language: 'en',
      hardwareConcurrency: 4,
      platform: 'TestPlatform'
    };
    global.screen = { width: 1920, height: 1080, colorDepth: 24 };
    global.document = {
      createElement: () => ({
        getContext: () => ({
          textBaseline: '',
          font: '',
          fillText: () => {}
        }),
        toDataURL: () => 'data:test'
      })
    };
    global.localStorage = {
      _store: {},
      getItem(k) { return this._store[k] || null; },
      setItem(k, v) { this._store[k] = v; },
      removeItem(k) { delete this._store[k]; },
      get length() { return Object.keys(this._store).length; },
      key(i) { return Object.keys(this._store)[i]; }
    };
    global.crypto = { getRandomValues: (arr) => arr };
    global.firebaseDb = null;
    global.isFirebaseConfigured = false;
    global.firebaseAuthReady = Promise.resolve();
    global.firebaseRead = jest.fn().mockResolvedValue({ exists: false });
    global.firebaseAuthUid = null;
    global.sanitizeForFirebase = (x) => x;

    loadScript('js/deviceAuth.js', {
      globalizeConst: ['DeviceAuth', 'DeviceAuthManager'],
      quiet: true
    });
  });

  afterEach(() => {
    delete global.DeviceAuth;
    delete global.DeviceAuthManager;
    delete global.firebaseDb;
    delete global.isFirebaseConfigured;
    delete global.firebaseAuthReady;
    delete global.firebaseRead;
    delete global.firebaseAuthUid;
    delete global.sanitizeForFirebase;
    global.localStorage = origLocalStorage;
  });

  it('DeviceAuthManager is the same object as DeviceAuth', () => {
    expect(DeviceAuthManager).toBe(DeviceAuth);
  });

  it('DeviceAuthManager has initWithStatus method', () => {
    expect(typeof DeviceAuthManager.initWithStatus).toBe('function');
  });

  describe('initWithStatus()', () => {
    it('returns no-firebase when firebase not configured', async () => {
      global.firebaseDb = null;
      global.isFirebaseConfigured = false;
      const result = await DeviceAuth.initWithStatus();
      expect(result).toEqual({ status: 'no-firebase', canAccess: true });
    });

    it('returns approved with isAdmin when device is approved', async () => {
      global.firebaseDb = { ref: jest.fn() };
      global.isFirebaseConfigured = true;
      DeviceAuth.checkDeviceStatus = jest.fn().mockResolvedValue({ approved: true, admin: true });
      DeviceAuth.loadPasswordHash = jest.fn().mockResolvedValue();
      const result = await DeviceAuth.initWithStatus();
      expect(result).toEqual({ status: 'approved', canAccess: true, isAdmin: true });
    });

    it('returns error/canAccess on DeviceAuth error', async () => {
      global.firebaseDb = { ref: jest.fn() };
      global.isFirebaseConfigured = true;
      DeviceAuth.checkDeviceStatus = jest.fn().mockResolvedValue({ error: true });
      DeviceAuth.loadPasswordHash = jest.fn().mockResolvedValue();
      const result = await DeviceAuth.initWithStatus();
      expect(result).toEqual({ status: 'error', canAccess: true });
    });

    it('returns new when device is pending but not found in Firebase', async () => {
      global.firebaseDb = { ref: jest.fn() };
      global.isFirebaseConfigured = true;
      DeviceAuth.checkDeviceStatus = jest.fn().mockResolvedValue({ pending: true });
      DeviceAuth.loadPasswordHash = jest.fn().mockResolvedValue();
      global.firebaseRead = jest.fn().mockResolvedValue({ exists: false });
      const result = await DeviceAuth.initWithStatus();
      expect(result).toEqual({ status: 'new', canAccess: false });
    });

    it('returns denied when device is in denied list', async () => {
      global.firebaseDb = { ref: jest.fn() };
      global.isFirebaseConfigured = true;
      DeviceAuth.checkDeviceStatus = jest.fn().mockResolvedValue({ pending: true });
      DeviceAuth.loadPasswordHash = jest.fn().mockResolvedValue();
      // firebaseRead returns: 1st call (denied check) = exists
      global.firebaseRead = jest.fn().mockResolvedValueOnce({ exists: true });
      const result = await DeviceAuth.initWithStatus();
      expect(result).toEqual({ status: 'denied', canAccess: false });
    });

    it('returns pending when device is in pending list', async () => {
      global.firebaseDb = { ref: jest.fn() };
      global.isFirebaseConfigured = true;
      DeviceAuth.checkDeviceStatus = jest.fn().mockResolvedValue({ pending: true });
      DeviceAuth.loadPasswordHash = jest.fn().mockResolvedValue();
      // firebaseRead: 1st call (denied) = not exists, 2nd call (pending) = exists
      global.firebaseRead = jest.fn()
        .mockResolvedValueOnce({ exists: false })
        .mockResolvedValueOnce({ exists: true });
      const result = await DeviceAuth.initWithStatus();
      expect(result).toEqual({ status: 'pending', canAccess: false });
    });
  });
});
