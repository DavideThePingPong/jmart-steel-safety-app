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

  // init() — translates DeviceAuth return format to DeviceAuthManager format
  // DeviceAuth returns: { approved, admin, pending, error, ... }
  // DeviceAuthManager returns: { status, canAccess, isAdmin }
  init: async function() {
    await DeviceAuth.loadPasswordHash();

    if (!firebaseDb || !isFirebaseConfigured) {
      return { status: 'no-firebase', canAccess: true };
    }

    const result = await DeviceAuth.checkDeviceStatus();

    if (result.error) {
      return { status: 'error', canAccess: true };
    }
    if (result.approved) {
      return { status: 'approved', canAccess: true, isAdmin: result.admin || false };
    }
    if (result.pending) {
      // Check if device is in denied state
      try {
        const deniedSnap = await firebaseDb.ref('jmart-safety/devices/denied/' + DeviceAuth.deviceId).once('value');
        if (deniedSnap.exists()) {
          return { status: 'denied', canAccess: false };
        }
      } catch (e) { /* ignore */ }
      // Check if pending
      try {
        const pendingSnap = await firebaseDb.ref('jmart-safety/devices/pending/' + DeviceAuth.deviceId).once('value');
        if (pendingSnap.exists()) {
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
