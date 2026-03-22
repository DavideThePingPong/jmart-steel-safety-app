/**
 * Tests for js/deviceAuthManager.js — DeviceAuthManager (compatibility shim)
 */

const loadScript = require('../../helpers/loadScript');

describe('DeviceAuthManager', () => {
  beforeEach(() => {
    // Mock DeviceAuth (the real implementation)
    global.DeviceAuth = {
      deviceId: 'test-device-123',
      isAdmin: false,
      pendingDevices: [],
      approvedDevices: [],
      APP_PASSWORD_HASH: 'hash123',
      generateDeviceId: jest.fn(),
      getDeviceInfo: jest.fn(),
      loadPasswordHash: jest.fn().mockResolvedValue(),
      checkDeviceStatus: jest.fn().mockResolvedValue({ approved: true, admin: false }),
      hashPassword: jest.fn().mockResolvedValue('hashed'),
      verifyPassword: jest.fn().mockResolvedValue(true),
      setPassword: jest.fn().mockResolvedValue(),
      _legacyHash: jest.fn().mockReturnValue('legacy'),
      registerDevice: jest.fn().mockResolvedValue(),
      approveAsAdmin: jest.fn().mockResolvedValue(),
      approveDevice: jest.fn().mockResolvedValue(),
      denyDevice: jest.fn().mockResolvedValue(),
      removeDevice: jest.fn().mockResolvedValue(),
      renameDevice: jest.fn().mockResolvedValue(),
      listenToDevices: jest.fn(),
      updateLastSeen: jest.fn().mockResolvedValue(),
      getPendingCount: jest.fn().mockReturnValue(3)
    };

    global.firebaseDb = { ref: jest.fn() };
    global.isFirebaseConfigured = true;
    global.firebaseAuthReady = Promise.resolve();
    global.firebaseRead = jest.fn().mockResolvedValue({ exists: false });

    loadScript('js/deviceAuthManager.js', {
      globalizeConst: ['DeviceAuthManager'],
      quiet: true
    });
  });

  afterEach(() => {
    delete global.DeviceAuthManager;
    delete global.DeviceAuth;
    delete global.firebaseDb;
    delete global.isFirebaseConfigured;
    delete global.firebaseAuthReady;
    delete global.firebaseRead;
  });

  describe('getter/setter delegation', () => {
    it('deviceId delegates to DeviceAuth', () => {
      expect(DeviceAuthManager.deviceId).toBe('test-device-123');
    });

    it('isAdmin getter delegates to DeviceAuth', () => {
      DeviceAuth.isAdmin = true;
      expect(DeviceAuthManager.isAdmin).toBe(true);
    });

    it('isAdmin setter delegates to DeviceAuth', () => {
      DeviceAuthManager.isAdmin = true;
      expect(DeviceAuth.isAdmin).toBe(true);
    });

    it('pendingDevices delegates to DeviceAuth', () => {
      DeviceAuth.pendingDevices = [{ id: 'a' }];
      expect(DeviceAuthManager.pendingDevices).toEqual([{ id: 'a' }]);
    });

    it('approvedDevices delegates to DeviceAuth', () => {
      DeviceAuth.approvedDevices = [{ id: 'b' }];
      expect(DeviceAuthManager.approvedDevices).toEqual([{ id: 'b' }]);
    });

    it('APP_PASSWORD_HASH getter/setter delegates', () => {
      expect(DeviceAuthManager.APP_PASSWORD_HASH).toBe('hash123');
      DeviceAuthManager.APP_PASSWORD_HASH = 'newhash';
      expect(DeviceAuth.APP_PASSWORD_HASH).toBe('newhash');
    });
  });

  describe('method delegation', () => {
    it('generateDeviceId delegates', () => {
      DeviceAuthManager.generateDeviceId();
      expect(DeviceAuth.generateDeviceId).toHaveBeenCalled();
    });

    it('hashPassword delegates', async () => {
      await DeviceAuthManager.hashPassword('pw');
      expect(DeviceAuth.hashPassword).toHaveBeenCalledWith('pw');
    });

    it('verifyPassword delegates', async () => {
      await DeviceAuthManager.verifyPassword('pw');
      expect(DeviceAuth.verifyPassword).toHaveBeenCalledWith('pw');
    });

    it('setPassword delegates', async () => {
      await DeviceAuthManager.setPassword('pw');
      expect(DeviceAuth.setPassword).toHaveBeenCalledWith('pw');
    });

    it('_legacyHash delegates', () => {
      DeviceAuthManager._legacyHash('pw');
      expect(DeviceAuth._legacyHash).toHaveBeenCalledWith('pw');
    });

    it('registerDevice delegates', () => {
      DeviceAuthManager.registerDevice('MyDevice');
      expect(DeviceAuth.registerDevice).toHaveBeenCalledWith('MyDevice');
    });

    it('approveDevice delegates', () => {
      DeviceAuthManager.approveDevice('dev-1');
      expect(DeviceAuth.approveDevice).toHaveBeenCalledWith('dev-1');
    });

    it('denyDevice delegates', () => {
      DeviceAuthManager.denyDevice('dev-1');
      expect(DeviceAuth.denyDevice).toHaveBeenCalledWith('dev-1');
    });

    it('removeDevice delegates', () => {
      DeviceAuthManager.removeDevice('dev-1');
      expect(DeviceAuth.removeDevice).toHaveBeenCalledWith('dev-1');
    });

    it('renameDevice delegates', () => {
      DeviceAuthManager.renameDevice('dev-1', 'NewName');
      expect(DeviceAuth.renameDevice).toHaveBeenCalledWith('dev-1', 'NewName');
    });

    it('getPendingCount delegates', () => {
      expect(DeviceAuthManager.getPendingCount()).toBe(3);
    });
  });

  describe('init()', () => {
    it('returns approved/canAccess when device is approved', async () => {
      DeviceAuth.checkDeviceStatus.mockResolvedValue({ approved: true, admin: false });
      const result = await DeviceAuthManager.init();
      expect(result).toEqual({ status: 'approved', canAccess: true, isAdmin: false });
    });

    it('returns approved with isAdmin when admin', async () => {
      DeviceAuth.checkDeviceStatus.mockResolvedValue({ approved: true, admin: true });
      const result = await DeviceAuthManager.init();
      expect(result).toEqual({ status: 'approved', canAccess: true, isAdmin: true });
    });

    it('returns no-firebase when firebase not configured', async () => {
      global.firebaseDb = null;
      global.isFirebaseConfigured = false;
      const result = await DeviceAuthManager.init();
      expect(result).toEqual({ status: 'no-firebase', canAccess: true });
    });

    it('returns error without access when DeviceAuth errors', async () => {
      DeviceAuth.checkDeviceStatus.mockResolvedValue({ error: true, networkError: true });
      const result = await DeviceAuthManager.init();
      expect(result).toEqual({ status: 'error', canAccess: false, networkError: true });
    });

    it('returns denied when device is in denied list', async () => {
      DeviceAuth.checkDeviceStatus.mockResolvedValue({ pending: true });
      global.firebaseRead = jest.fn()
        .mockResolvedValueOnce({ exists: true })  // denied check
      const result = await DeviceAuthManager.init();
      expect(result).toEqual({ status: 'denied', canAccess: false });
    });

    it('returns pending when device is pending', async () => {
      DeviceAuth.checkDeviceStatus.mockResolvedValue({ pending: true });
      global.firebaseRead = jest.fn()
        .mockResolvedValueOnce({ exists: false })  // denied check
        .mockResolvedValueOnce({ exists: true });   // pending check
      const result = await DeviceAuthManager.init();
      expect(result).toEqual({ status: 'pending', canAccess: false });
    });

    it('returns recovery-required when manual admin recovery is needed', async () => {
      DeviceAuth.checkDeviceStatus.mockResolvedValue({ pending: true, recoveryRequired: true });
      const result = await DeviceAuthManager.init();
      expect(result).toEqual({ status: 'recovery-required', canAccess: false });
    });

    it('returns new when device is not found anywhere', async () => {
      DeviceAuth.checkDeviceStatus.mockResolvedValue({ pending: true });
      global.firebaseRead = jest.fn().mockResolvedValue({ exists: false });
      const result = await DeviceAuthManager.init();
      expect(result).toEqual({ status: 'new', canAccess: false });
    });

    it('calls generateDeviceId and getDeviceInfo', async () => {
      await DeviceAuthManager.init();
      expect(DeviceAuth.generateDeviceId).toHaveBeenCalled();
      expect(DeviceAuth.getDeviceInfo).toHaveBeenCalled();
    });
  });
});
