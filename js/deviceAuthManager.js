// Device Authentication Manager — Compatibility Shim
// All functionality consolidated into DeviceAuth (deviceAuth.js)
// This file provides backward compatibility for code that references DeviceAuthManager
// ========================================
const DeviceAuthManager = {
  get deviceId()       { return DeviceAuth.deviceId; },
  get isAdmin()        { return DeviceAuth.isAdmin; },
  set isAdmin(v)       { DeviceAuth.isAdmin = v; },
  get pendingDevices() { return DeviceAuth.pendingDevices; },
  get approvedDevices(){ return DeviceAuth.approvedDevices; },
  get APP_PASSWORD_HASH() { return DeviceAuth.APP_PASSWORD_HASH; },
  set APP_PASSWORD_HASH(v) { DeviceAuth.APP_PASSWORD_HASH = v; },

  generateDeviceId:     () => DeviceAuth.generateDeviceId(),
  hashPassword:  (pw)   => DeviceAuth.hashPassword(pw),
  verifyPassword:(pw)   => DeviceAuth.verifyPassword(pw),
  setPassword:   (pw)   => DeviceAuth.setPassword(pw),
  _legacyHash:   (pw)   => DeviceAuth._legacyHash(pw),

  // initWithStatus() — alias for init(), used by AppWithAuth.checkAuth()
  initWithStatus: async function() {
    return this.init();
  },

  // init() — translates DeviceAuth return format to DeviceAuthManager format
  // DeviceAuth returns: { approved, admin, pending, error, ... }
  // DeviceAuthManager returns: { status, canAccess, isAdmin }
  init: async function() {
    // Ensure device ID is set before any Firebase operations
    DeviceAuth.generateDeviceId();
    DeviceAuth.getDeviceInfo();

    await DeviceAuth.loadPasswordHash();

    if (!firebaseDb || !isFirebaseConfigured) {
      return { status: 'no-firebase', canAccess: true };
    }

    // Wait for Firebase auth before checking device status
    try { await firebaseAuthReady; } catch(e) {}

    const result = await DeviceAuth.checkDeviceStatus();

    if (result.error) {
      return { status: 'error', canAccess: false, networkError: !!result.networkError };
    }
    if (result.approved) {
      return { status: 'approved', canAccess: true, isAdmin: result.admin || false };
    }
    if (result.recoveryRequired) {
      return { status: 'recovery-required', canAccess: false };
    }
    if (result.pending) {
      // Check if device is in denied state (uses REST fallback)
      try {
        const deniedResult = await firebaseRead('jmart-safety/devices/denied/' + DeviceAuth.deviceId);
        if (deniedResult.exists) {
          return { status: 'denied', canAccess: false };
        }
      } catch (e) { /* ignore */ }
      // Check if pending
      try {
        const pendingResult = await firebaseRead('jmart-safety/devices/pending/' + DeviceAuth.deviceId);
        if (pendingResult.exists) {
          return { status: 'pending', canAccess: false };
        }
      } catch (e) { /* ignore */ }
      return { status: 'new', canAccess: false };
    }
    return { status: 'new', canAccess: false };
  },

  registerDevice:    (name)   => DeviceAuth.registerDevice(name),
  approveAsAdmin:    ()       => DeviceAuth.approveAsAdmin(),
  approveDevice:     (id)     => DeviceAuth.approveDevice(id),
  denyDevice:        (id)     => DeviceAuth.denyDevice(id),
  removeDevice:      (id)     => DeviceAuth.removeDevice(id),
  renameDevice:      (id, n)  => DeviceAuth.renameDevice(id, n),
  listenToDevices:   (cb)     => DeviceAuth.listenToDevices(cb),
  updateLastSeen:    ()       => DeviceAuth.updateLastSeen(),
  getPendingCount:   ()       => DeviceAuth.getPendingCount()
};
