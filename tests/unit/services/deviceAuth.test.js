/**
 * Tests for js/deviceAuth.js — DeviceAuth
 *
 * Note: setupTests.js already mocks localStorage, navigator.onLine,
 * console.log, and sets firebaseDb=null / isFirebaseConfigured=false.
 */

const loadScript = require('../../helpers/loadScript');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a mock Firebase ref that supports chained methods */
function createMockRef() {
  const ref = {
    set: jest.fn().mockResolvedValue(),
    get: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    once: jest.fn(),
    push: jest.fn().mockResolvedValue(),
    update: jest.fn().mockResolvedValue(),
    remove: jest.fn().mockResolvedValue(),
    child: jest.fn()
  };
  // child() returns another ref with the same shape
  ref.child.mockReturnValue({
    set: jest.fn().mockResolvedValue(),
    once: jest.fn()
  });
  return ref;
}

function createMockFirebaseDb() {
  const mockRef = createMockRef();
  return {
    ref: jest.fn(() => mockRef),
    _mockRef: mockRef // expose for assertions
  };
}

/** Snapshot helper used by .once('value') */
function makeSnapshot(val) {
  return {
    exists: () => val !== null && val !== undefined,
    val: () => val,
    key: val && val.id ? val.id : null
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('DeviceAuth', () => {
  let store;

  beforeEach(() => {
    // localStorage backing store
    store = {};
    localStorage.getItem.mockImplementation(key => store[key] || null);
    localStorage.setItem.mockImplementation((key, val) => { store[key] = String(val); });
    localStorage.removeItem.mockImplementation(key => { delete store[key]; });

    // Canvas mock (jsdom does not support canvas natively)
    HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
      textBaseline: '',
      font: '',
      fillText: jest.fn()
    }));
    HTMLCanvasElement.prototype.toDataURL = jest.fn(() => 'data:image/png;base64,mockcanvasdata');

    // Screen mock
    Object.defineProperty(global, 'screen', {
      value: { width: 1920, height: 1080, colorDepth: 24 },
      writable: true,
      configurable: true
    });

    // crypto.subtle mock
    global.crypto = {
      subtle: {
        digest: jest.fn().mockResolvedValue(new ArrayBuffer(32)),
        importKey: jest.fn().mockResolvedValue('mockKey'),
        deriveBits: jest.fn().mockResolvedValue(new ArrayBuffer(32))
      },
      getRandomValues: jest.fn(arr => { arr.fill(42); return arr; })
    };

    // Firebase-related globals
    global.firebaseDb = null;
    global.isFirebaseConfigured = false;
    global.firebaseAuthReady = Promise.resolve();
    global.firebaseAuthUid = 'test-uid-123';
    global.firebaseRead = jest.fn().mockResolvedValue({ exists: false, val: null, source: 'sdk' });
    global.AuditLogManager = { log: jest.fn() };

    // Load the script fresh each test
    loadScript('js/deviceAuth.js', {
      globalizeConst: ['DeviceAuth'],
      quiet: true
    });
  });

  afterEach(() => {
    delete global.DeviceAuth;
    delete global.firebaseRead;
    delete global.firebaseAuthReady;
    delete global.firebaseAuthUid;
    delete global.AuditLogManager;
  });

  // =======================================================================
  // 1. generateDeviceId
  // =======================================================================
  describe('generateDeviceId()', () => {
    it('returns cached device ID from localStorage', () => {
      store['jmart-device-id'] = 'DEV-CACHED-123';
      const id = DeviceAuth.generateDeviceId();
      expect(id).toBe('DEV-CACHED-123');
      expect(DeviceAuth.deviceId).toBe('DEV-CACHED-123');
    });

    it('generates a new ID when none is stored', () => {
      const id = DeviceAuth.generateDeviceId();
      expect(id).toMatch(/^DEV-/);
      expect(DeviceAuth.deviceId).toBe(id);
    });

    it('stores newly generated ID in localStorage', () => {
      const id = DeviceAuth.generateDeviceId();
      expect(localStorage.setItem).toHaveBeenCalledWith('jmart-device-id', id);
    });
  });

  // =======================================================================
  // 2. getDeviceInfo
  // =======================================================================
  describe('getDeviceInfo()', () => {
    beforeEach(() => {
      DeviceAuth.deviceId = 'DEV-TEST-1';
    });

    it('detects Windows PC + Chrome from user agent', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0',
        configurable: true
      });
      const info = DeviceAuth.getDeviceInfo();
      expect(info.type).toBe('Windows PC');
      expect(info.browser).toBe('Chrome');
    });

    it('detects iPhone + Safari', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605 Safari/605',
        configurable: true
      });
      const info = DeviceAuth.getDeviceInfo();
      expect(info.type).toBe('iPhone');
      expect(info.browser).toBe('Safari');
    });

    it('detects Android Phone', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile Chrome/120',
        configurable: true
      });
      const info = DeviceAuth.getDeviceInfo();
      expect(info.type).toBe('Android Phone');
    });

    it('includes screen dimensions in device info', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0) Chrome/120',
        configurable: true
      });
      const info = DeviceAuth.getDeviceInfo();
      expect(info.screen).toBe('1920x1080');
    });
  });

  // =======================================================================
  // 3. _legacyHash
  // =======================================================================
  describe('_legacyHash()', () => {
    it('returns a deterministic DJB2-style hash with hash_ prefix', () => {
      const h1 = DeviceAuth._legacyHash('test123');
      const h2 = DeviceAuth._legacyHash('test123');
      expect(h1).toBe(h2);
      expect(h1).toMatch(/^hash_[0-9a-f]+$/);
    });

    it('returns different hashes for different inputs', () => {
      const h1 = DeviceAuth._legacyHash('password1');
      const h2 = DeviceAuth._legacyHash('password2');
      expect(h1).not.toBe(h2);
    });
  });

  // =======================================================================
  // 4. onStatusChange
  // =======================================================================
  describe('onStatusChange()', () => {
    it('calls listener immediately with current status', () => {
      DeviceAuth.isApproved = true;
      DeviceAuth.isAdmin = false;
      const cb = jest.fn();
      DeviceAuth.onStatusChange(cb);
      expect(cb).toHaveBeenCalledWith({ approved: true, admin: false });
    });

    it('adds listener to statusListeners', () => {
      const cb = jest.fn();
      DeviceAuth.onStatusChange(cb);
      expect(DeviceAuth.statusListeners).toContain(cb);
    });

    it('returns an unsubscribe function that removes the listener', () => {
      const cb = jest.fn();
      const unsub = DeviceAuth.onStatusChange(cb);
      expect(DeviceAuth.statusListeners).toContain(cb);
      unsub();
      expect(DeviceAuth.statusListeners).not.toContain(cb);
    });
  });

  // =======================================================================
  // 5. notifyStatusListeners
  // =======================================================================
  describe('notifyStatusListeners()', () => {
    it('calls all registered listeners with current status', () => {
      DeviceAuth.isApproved = true;
      DeviceAuth.isAdmin = true;
      const cb1 = jest.fn();
      const cb2 = jest.fn();
      DeviceAuth.statusListeners = [cb1, cb2];
      DeviceAuth.notifyStatusListeners();
      expect(cb1).toHaveBeenCalledWith({ approved: true, admin: true });
      expect(cb2).toHaveBeenCalledWith({ approved: true, admin: true });
    });
  });

  // =======================================================================
  // 6. onNotification
  // =======================================================================
  describe('onNotification()', () => {
    it('adds listener and returns unsubscribe function', () => {
      const cb = jest.fn();
      const unsub = DeviceAuth.onNotification(cb);
      expect(DeviceAuth.notificationListeners).toContain(cb);
      unsub();
      expect(DeviceAuth.notificationListeners).not.toContain(cb);
    });
  });

  // =======================================================================
  // 7. notifyNotificationListeners
  // =======================================================================
  describe('notifyNotificationListeners()', () => {
    it('calls all listeners with type and data', () => {
      const cb1 = jest.fn();
      const cb2 = jest.fn();
      DeviceAuth.notificationListeners = [cb1, cb2];
      DeviceAuth.notifyNotificationListeners('new_device', { id: 'DEV-X' });
      expect(cb1).toHaveBeenCalledWith('new_device', { id: 'DEV-X' });
      expect(cb2).toHaveBeenCalledWith('new_device', { id: 'DEV-X' });
    });
  });

  // =======================================================================
  // 8. getPendingCount
  // =======================================================================
  describe('getPendingCount()', () => {
    it('returns length of pendingDevices array', () => {
      DeviceAuth.pendingDevices = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
      expect(DeviceAuth.getPendingCount()).toBe(3);
    });

    it('returns 0 when no pending devices', () => {
      DeviceAuth.pendingDevices = [];
      expect(DeviceAuth.getPendingCount()).toBe(0);
    });
  });

  // =======================================================================
  // 9-13. checkDeviceStatus
  // =======================================================================
  describe('checkDeviceStatus()', () => {
    it('returns {approved:false} when no firebaseDb', async () => {
      global.firebaseDb = null;
      const result = await DeviceAuth.checkDeviceStatus();
      expect(result).toEqual({ approved: false });
    });

    it('auto-approves as admin when first device (no approved devices exist)', async () => {
      const mockDb = createMockFirebaseDb();
      global.firebaseDb = mockDb;
      DeviceAuth.deviceId = 'DEV-FIRST';
      DeviceAuth.deviceInfo = { type: 'Windows PC', browser: 'Chrome' };

      // firebaseRead calls in order:
      // 1. old flat structure migration check -> not exists
      // 2. approved/<deviceId> -> not exists
      // 3. approved/ (all) -> not exists (empty)
      global.firebaseRead = jest.fn()
        .mockResolvedValueOnce({ exists: false, val: null }) // migration check
        .mockResolvedValueOnce({ exists: false, val: null }) // approved/<deviceId>
        .mockResolvedValueOnce({ exists: false, val: null }); // all approved

      const result = await DeviceAuth.checkDeviceStatus();
      expect(result.approved).toBe(true);
      expect(result.admin).toBe(true);
      expect(result.firstDevice).toBe(true);
    });

    it('returns approved with admin flag when device found in approved list', async () => {
      const mockDb = createMockFirebaseDb();
      global.firebaseDb = mockDb;
      DeviceAuth.deviceId = 'DEV-KNOWN';

      global.firebaseRead = jest.fn()
        .mockResolvedValueOnce({ exists: false, val: null }) // migration check
        .mockResolvedValueOnce({
          exists: true,
          val: { isAdmin: true, canViewDevices: true, canRevokeDevices: false }
        }); // approved/<deviceId>

      // Mock the update call (fire-and-forget)
      mockDb._mockRef.update.mockReturnValue({ catch: jest.fn() });

      const result = await DeviceAuth.checkDeviceStatus();
      expect(result.approved).toBe(true);
      expect(result.admin).toBe(true);
      expect(result.canViewDevices).toBe(true);
      expect(DeviceAuth.isApproved).toBe(true);
      expect(DeviceAuth.isAdmin).toBe(true);
    });

    it('returns pending when device is not approved', async () => {
      const mockDb = createMockFirebaseDb();
      global.firebaseDb = mockDb;
      DeviceAuth.deviceId = 'DEV-NEW';
      DeviceAuth.deviceInfo = { type: 'iPhone', browser: 'Safari' };

      const otherAdmin = {
        'DEV-ADMIN': { isAdmin: true, lastSeen: new Date().toISOString() }
      };

      global.firebaseRead = jest.fn()
        .mockResolvedValueOnce({ exists: false, val: null }) // migration
        .mockResolvedValueOnce({ exists: false, val: null }) // approved/<deviceId>
        .mockResolvedValueOnce({ exists: true, val: otherAdmin }) // all approved
        .mockResolvedValueOnce({ exists: false, val: null }); // pending/<deviceId>

      const result = await DeviceAuth.checkDeviceStatus();
      expect(result.approved).toBe(false);
      expect(result.pending).toBe(true);
      expect(DeviceAuth.isApproved).toBe(false);
    });

    it('handles errors gracefully and returns networkError', async () => {
      const mockDb = createMockFirebaseDb();
      global.firebaseDb = mockDb;
      DeviceAuth.deviceId = 'DEV-ERR';

      global.firebaseRead = jest.fn().mockRejectedValue(new Error('Network timeout'));

      const result = await DeviceAuth.checkDeviceStatus();
      expect(result.approved).toBe(false);
      expect(result.networkError).toBe(true);
      expect(result.error).toBe('Network timeout');
    });
  });

  // =======================================================================
  // 14. registerAsPending
  // =======================================================================
  describe('registerAsPending()', () => {
    it('writes device data to Firebase pending path', async () => {
      const mockDb = createMockFirebaseDb();
      global.firebaseDb = mockDb;
      DeviceAuth.deviceId = 'DEV-PEND';
      DeviceAuth.deviceInfo = { type: 'iPad', browser: 'Safari', screen: '1024x768' };

      await DeviceAuth.registerAsPending();

      expect(mockDb.ref).toHaveBeenCalledWith('jmart-safety/devices/pending/DEV-PEND');
      expect(mockDb._mockRef.set).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'iPad',
          status: 'pending'
        })
      );
    });

    it('does nothing when firebaseDb is null', async () => {
      global.firebaseDb = null;
      await DeviceAuth.registerAsPending();
      // No error thrown - silent return
    });
  });

  // =======================================================================
  // 15. registerAsApproved
  // =======================================================================
  describe('registerAsApproved()', () => {
    it('writes approved device data to Firebase and removes from pending', async () => {
      const mockDb = createMockFirebaseDb();
      global.firebaseDb = mockDb;
      DeviceAuth.deviceId = 'DEV-APPR';
      DeviceAuth.deviceInfo = { type: 'Mac', browser: 'Chrome', screen: '2560x1440' };

      await DeviceAuth.registerAsApproved(true);

      // Should have written to approved path
      expect(mockDb.ref).toHaveBeenCalledWith('jmart-safety/devices/approved/DEV-APPR');
      expect(mockDb._mockRef.set).toHaveBeenCalledWith(
        expect.objectContaining({
          isAdmin: true,
          approvedBy: 'SYSTEM (First Device)'
        })
      );
      // Should have removed from pending
      expect(mockDb.ref).toHaveBeenCalledWith('jmart-safety/devices/pending/DEV-APPR');
      expect(mockDb._mockRef.remove).toHaveBeenCalled();
      // State flags updated
      expect(DeviceAuth.isApproved).toBe(true);
      expect(DeviceAuth.isAdmin).toBe(true);
    });
  });

  // =======================================================================
  // 16. approveDevice
  // =======================================================================
  describe('approveDevice()', () => {
    it('moves device from pending to approved', async () => {
      const mockDb = createMockFirebaseDb();
      global.firebaseDb = mockDb;
      DeviceAuth.isAdmin = true;

      // Mock once('value') for the pending device
      mockDb._mockRef.once.mockResolvedValue(
        makeSnapshot({ id: 'DEV-TARGET', type: 'Android Phone', authUid: null })
      );

      const result = await DeviceAuth.approveDevice('DEV-TARGET', false);
      expect(result).toBe(true);
      expect(mockDb.ref).toHaveBeenCalledWith('jmart-safety/devices/pending/DEV-TARGET');
      expect(mockDb.ref).toHaveBeenCalledWith('jmart-safety/devices/approved/DEV-TARGET');
    });

    it('returns false when caller is not admin', async () => {
      const mockDb = createMockFirebaseDb();
      global.firebaseDb = mockDb;
      DeviceAuth.isAdmin = false;

      const result = await DeviceAuth.approveDevice('DEV-TARGET');
      expect(result).toBe(false);
    });
  });

  // =======================================================================
  // 17-18. denyDevice
  // =======================================================================
  describe('denyDevice()', () => {
    it('moves device from pending to denied', async () => {
      const mockDb = createMockFirebaseDb();
      global.firebaseDb = mockDb;
      DeviceAuth.isAdmin = true;
      DeviceAuth.deviceId = 'DEV-ADMIN';

      mockDb._mockRef.once.mockResolvedValue(
        makeSnapshot({ id: 'DEV-BAD', type: 'Unknown Device' })
      );

      const result = await DeviceAuth.denyDevice('DEV-BAD');
      expect(result).toBe(true);
      expect(mockDb.ref).toHaveBeenCalledWith('jmart-safety/devices/denied/DEV-BAD');
      expect(mockDb.ref).toHaveBeenCalledWith('jmart-safety/devices/pending/DEV-BAD');
    });

    it('returns false when caller is not admin', async () => {
      global.firebaseDb = createMockFirebaseDb();
      DeviceAuth.isAdmin = false;
      const result = await DeviceAuth.denyDevice('DEV-BAD');
      expect(result).toBe(false);
    });
  });

  // =======================================================================
  // 19. revokeDevice
  // =======================================================================
  describe('revokeDevice()', () => {
    it('removes device from approved list', async () => {
      const mockDb = createMockFirebaseDb();
      global.firebaseDb = mockDb;
      DeviceAuth.isAdmin = true;
      DeviceAuth.deviceId = 'DEV-ME';

      mockDb._mockRef.once.mockResolvedValue(
        makeSnapshot({ id: 'DEV-OTHER', isAdmin: false })
      );

      const result = await DeviceAuth.revokeDevice('DEV-OTHER');
      expect(result).toBe(true);
      expect(mockDb.ref).toHaveBeenCalledWith('jmart-safety/devices/approved/DEV-OTHER');
    });

    it('cannot revoke own device', async () => {
      const mockDb = createMockFirebaseDb();
      global.firebaseDb = mockDb;
      DeviceAuth.isAdmin = true;
      DeviceAuth.deviceId = 'DEV-SELF';

      const result = await DeviceAuth.revokeDevice('DEV-SELF');
      expect(result).toBe(false);
    });

    it('returns false when not admin and not canRevokeDevices', async () => {
      global.firebaseDb = createMockFirebaseDb();
      DeviceAuth.isAdmin = false;
      DeviceAuth.canRevokeDevices = false;
      DeviceAuth.deviceId = 'DEV-ME';

      const result = await DeviceAuth.revokeDevice('DEV-OTHER');
      expect(result).toBe(false);
    });
  });

  // =======================================================================
  // 20. updateLastSeen
  // =======================================================================
  describe('updateLastSeen()', () => {
    it('writes timestamp to Firebase', async () => {
      const mockDb = createMockFirebaseDb();
      global.firebaseDb = mockDb;
      DeviceAuth.deviceId = 'DEV-SEEN';

      await DeviceAuth.updateLastSeen();

      expect(mockDb.ref).toHaveBeenCalledWith('jmart-safety/devices/approved/DEV-SEEN/lastSeen');
      expect(mockDb._mockRef.set).toHaveBeenCalledWith(expect.any(String));
    });

    it('does nothing when no firebaseDb', async () => {
      global.firebaseDb = null;
      DeviceAuth.deviceId = 'DEV-SEEN';
      // Should not throw
      await DeviceAuth.updateLastSeen();
    });

    it('does nothing when no deviceId', async () => {
      global.firebaseDb = createMockFirebaseDb();
      DeviceAuth.deviceId = null;
      await DeviceAuth.updateLastSeen();
    });
  });

  // =======================================================================
  // 21. registerDevice
  // =======================================================================
  describe('registerDevice()', () => {
    it('writes pending entry with device info and name', async () => {
      const mockDb = createMockFirebaseDb();
      global.firebaseDb = mockDb;
      DeviceAuth.deviceId = 'DEV-REG';
      DeviceAuth.deviceInfo = { type: 'Windows PC', browser: 'Edge' };

      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0) Edg/120',
        configurable: true
      });

      const result = await DeviceAuth.registerDevice('Davide Laptop');
      expect(result).toBe(true);
      expect(mockDb.ref).toHaveBeenCalledWith('jmart-safety/devices/pending/DEV-REG');
      expect(mockDb._mockRef.set).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'DEV-REG',
          name: 'Davide Laptop',
          status: 'pending'
        })
      );
    });

    it('returns false when firebaseDb is null', async () => {
      global.firebaseDb = null;
      const result = await DeviceAuth.registerDevice('Test');
      expect(result).toBe(false);
    });
  });

  // =======================================================================
  // 22. approveAsAdmin
  // =======================================================================
  describe('approveAsAdmin()', () => {
    it('writes approved entry with admin flag and registers auth UID', async () => {
      const mockDb = createMockFirebaseDb();
      global.firebaseDb = mockDb;
      DeviceAuth.deviceId = 'DEV-ADM';
      DeviceAuth.deviceInfo = { type: 'Mac', browser: 'Safari' };
      global.firebaseAuthUid = 'uid-admin-001';

      const result = await DeviceAuth.approveAsAdmin();
      expect(result).toBe(true);
      expect(DeviceAuth.isAdmin).toBe(true);

      // Should write approved data
      expect(mockDb.ref).toHaveBeenCalledWith('jmart-safety/devices/approved/DEV-ADM');
      expect(mockDb._mockRef.set).toHaveBeenCalledWith(
        expect.objectContaining({
          isAdmin: true,
          approvedBy: 'SYSTEM (First Device)'
        })
      );
      // Should register admin auth UID
      expect(mockDb.ref).toHaveBeenCalledWith('jmart-safety/adminAuthUids/uid-admin-001');
      // Should remove from pending
      expect(mockDb.ref).toHaveBeenCalledWith('jmart-safety/devices/pending/DEV-ADM');
      expect(mockDb._mockRef.remove).toHaveBeenCalled();
    });

    it('returns false when firebaseDb is null', async () => {
      global.firebaseDb = null;
      const result = await DeviceAuth.approveAsAdmin();
      expect(result).toBe(false);
    });
  });

  // =======================================================================
  // 23. loadPasswordHash
  // =======================================================================
  describe('loadPasswordHash()', () => {
    it('loads from localStorage cache first', async () => {
      store['jmart-password-hash'] = 'hash_abc123';
      global.isFirebaseConfigured = false;

      await DeviceAuth.loadPasswordHash();
      expect(DeviceAuth.APP_PASSWORD_HASH).toBe('hash_abc123');
    });

    it('loads from Firebase when configured and updates cache', async () => {
      global.isFirebaseConfigured = true;
      global.firebaseRead = jest.fn().mockResolvedValue({
        val: 'sha256_deadbeef',
        source: 'rest'
      });

      await DeviceAuth.loadPasswordHash();
      expect(DeviceAuth.APP_PASSWORD_HASH).toBe('sha256_deadbeef');
      expect(localStorage.setItem).toHaveBeenCalledWith('jmart-password-hash', 'sha256_deadbeef');
    });

    it('falls back to local cache when Firebase fails', async () => {
      store['jmart-password-hash'] = 'hash_fallback';
      global.isFirebaseConfigured = true;
      global.firebaseRead = jest.fn().mockRejectedValue(new Error('offline'));

      await DeviceAuth.loadPasswordHash();
      expect(DeviceAuth.APP_PASSWORD_HASH).toBe('hash_fallback');
    });
  });

  // =======================================================================
  // 24. renameDevice
  // =======================================================================
  describe('renameDevice()', () => {
    it('updates name in Firebase for an approved device', async () => {
      const mockDb = createMockFirebaseDb();
      global.firebaseDb = mockDb;
      DeviceAuth.isAdmin = true;

      // once('value') returns existing device
      mockDb._mockRef.once.mockResolvedValue(makeSnapshot({ id: 'DEV-REN', name: 'Old Name' }));

      const childRef = { set: jest.fn().mockResolvedValue() };
      mockDb._mockRef.child.mockReturnValue(childRef);

      const result = await DeviceAuth.renameDevice('DEV-REN', 'New Name');
      expect(result).toBe(true);
      expect(mockDb._mockRef.child).toHaveBeenCalledWith('name');
      expect(childRef.set).toHaveBeenCalledWith('New Name');
    });

    it('returns false for empty name', async () => {
      global.firebaseDb = createMockFirebaseDb();
      DeviceAuth.isAdmin = true;

      const result = await DeviceAuth.renameDevice('DEV-REN', '');
      expect(result).toBe(false);
    });

    it('returns false when not admin and no revoke permission', async () => {
      global.firebaseDb = createMockFirebaseDb();
      DeviceAuth.isAdmin = false;
      DeviceAuth.canRevokeDevices = false;

      const result = await DeviceAuth.renameDevice('DEV-REN', 'Name');
      expect(result).toBe(false);
    });
  });

  // =======================================================================
  // 25. listenForPendingDevices
  // =======================================================================
  describe('listenForPendingDevices()', () => {
    it('registers a Firebase value listener and returns unsubscribe', () => {
      const mockDb = createMockFirebaseDb();
      global.firebaseDb = mockDb;
      DeviceAuth.isAdmin = true;

      const cb = jest.fn();
      const unsub = DeviceAuth.listenForPendingDevices(cb);

      expect(mockDb.ref).toHaveBeenCalledWith('jmart-safety/devices/pending');
      expect(mockDb._mockRef.on).toHaveBeenCalledWith('value', expect.any(Function));
      expect(mockDb._mockRef.on).toHaveBeenCalledWith('child_added', expect.any(Function));
      expect(typeof unsub).toBe('function');
    });

    it('returns noop when not admin', () => {
      global.firebaseDb = createMockFirebaseDb();
      DeviceAuth.isAdmin = false;

      const unsub = DeviceAuth.listenForPendingDevices(jest.fn());
      expect(typeof unsub).toBe('function');
      // Calling unsub should not throw
      unsub();
    });

    it('returns noop when no firebaseDb', () => {
      global.firebaseDb = null;
      DeviceAuth.isAdmin = true;
      const unsub = DeviceAuth.listenForPendingDevices(jest.fn());
      expect(typeof unsub).toBe('function');
    });
  });

  // =======================================================================
  // 26. listenForApprovedDevices
  // =======================================================================
  describe('listenForApprovedDevices()', () => {
    it('registers a Firebase value listener and returns unsubscribe', () => {
      const mockDb = createMockFirebaseDb();
      global.firebaseDb = mockDb;

      const cb = jest.fn();
      const unsub = DeviceAuth.listenForApprovedDevices(cb);

      expect(mockDb.ref).toHaveBeenCalledWith('jmart-safety/devices/approved');
      expect(mockDb._mockRef.on).toHaveBeenCalledWith('value', expect.any(Function));
      expect(typeof unsub).toBe('function');
    });

    it('returns noop when no firebaseDb', () => {
      global.firebaseDb = null;
      const unsub = DeviceAuth.listenForApprovedDevices(jest.fn());
      expect(typeof unsub).toBe('function');
    });
  });
});
