// Device Authorization System
// Extracted from index.html for maintainability
// ========================================
// DEVICE AUTHORIZATION SYSTEM
// ========================================
// Controls which devices can access the app
// First device to register becomes admin
// New devices require admin approval
// ========================================
const DeviceAuth = {
  AUTH_READ_TIMEOUT_MS: 1200,
  deviceId: null,
  deviceInfo: null,
  isApproved: false,
  isAdmin: false,
  canViewDevices: false,
  canRevokeDevices: false,
  pendingDevices: [],
  approvedDevices: [],
  statusListeners: [],
  notificationListeners: [],

  // Generate unique device fingerprint
  generateDeviceId: function() {
    const stored = localStorage.getItem('jmart-device-id');
    if (stored) {
      this.deviceId = stored;
      return stored;
    }

    // Create fingerprint from browser characteristics
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('JMart Device Fingerprint', 2, 2);
    const canvasData = canvas.toDataURL();

    // Stable fingerprint: only physical/hardware traits that don't change with
    // VPN exit nodes, browser updates, or locale switches.
    // EXCLUDED on purpose: navigator.userAgent (changes on browser update),
    // navigator.language (VPN/locale), getTimezoneOffset (VPN changes timezone).
    const fingerprint = [
      screen.width + 'x' + screen.height,
      screen.colorDepth,
      canvasData.slice(-50),
      navigator.hardwareConcurrency || 'unknown',
      navigator.platform
    ].join('|');

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }

    // Deterministic ID: same fingerprint => same DEV-ID, even after localStorage clear.
    // Previously included Date.now() which made every cache-clear a "new" device.
    this.deviceId = 'DEV-' + Math.abs(hash).toString(36).toUpperCase();
    localStorage.setItem('jmart-device-id', this.deviceId);
    return this.deviceId;
  },

  // Get device info for display
  getDeviceInfo: function() {
    const ua = navigator.userAgent;
    let deviceType = 'Unknown Device';
    let browser = 'Unknown Browser';

    // Detect device type
    if (/iPhone/i.test(ua)) deviceType = 'iPhone';
    else if (/iPad/i.test(ua)) deviceType = 'iPad';
    else if (/Android/i.test(ua) && /Mobile/i.test(ua)) deviceType = 'Android Phone';
    else if (/Android/i.test(ua)) deviceType = 'Android Tablet';
    else if (/Windows/i.test(ua)) deviceType = 'Windows PC';
    else if (/Mac/i.test(ua)) deviceType = 'Mac';
    else if (/Linux/i.test(ua)) deviceType = 'Linux PC';

    // Detect browser
    if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) browser = 'Chrome';
    else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
    else if (/Firefox/i.test(ua)) browser = 'Firefox';
    else if (/Edg/i.test(ua)) browser = 'Edge';

    this.deviceInfo = {
      id: this.deviceId,
      type: deviceType,
      browser: browser,
      screen: screen.width + 'x' + screen.height,
      registeredAt: new Date().toISOString(),
      lastSeen: new Date().toISOString()
    };

    return this.deviceInfo;
  },

  upsertAuthDeviceRecord: async function(deviceId, authUid, isAdmin, deviceInfo) {
    if (!firebaseDb || !authUid || !deviceId) return;
    var payload = {
      deviceId: deviceId,
      isAdmin: !!isAdmin,
      approvedAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      deviceType: deviceInfo && deviceInfo.type ? deviceInfo.type : (this.deviceInfo && this.deviceInfo.type) || 'Unknown Device',
      deviceName: localStorage.getItem('jmart-device-name') || null
    };
    await firebaseDb.ref('jmart-safety/authDevices/' + authUid).set(typeof sanitizeForFirebase === 'function' ? sanitizeForFirebase(payload) : payload);
  },

  removeAuthDeviceRecord: async function(authUid) {
    if (!firebaseDb || !authUid) return;
    await firebaseDb.ref('jmart-safety/authDevices/' + authUid).remove().catch(function() {});
  },

  // Initialize device auth
  init: async function() {
    this.generateDeviceId();
    this.getDeviceInfo();

    // SAFETY: Validate device ID is not null/undefined/empty — regenerate if corrupted
    if (!this.deviceId || this.deviceId === 'null' || this.deviceId === 'undefined' || this.deviceId.length < 5) {
      console.error('[DeviceAuth] Invalid device ID detected:', this.deviceId, '— regenerating');
      localStorage.removeItem('jmart-device-id');
      this.deviceId = null;
      this.generateDeviceId();
    }
    console.log('Device ID:', this.deviceId);

    if (!firebaseDb || !isFirebaseConfigured) {
      // No Firebase - approve locally (offline mode)
      this.isApproved = true;
      this.isAdmin = true;
      this.notifyStatusListeners();
      return { approved: true, admin: true, offline: true };
    }

    // Wait for Firebase anonymous auth to complete before checking device status
    // Without this, security rules block all reads (auth != null)
    try {
      await firebaseAuthReady;
      console.log('Firebase auth ready, uid:', firebaseAuthUid);
    } catch (e) {
      console.warn('Firebase auth wait failed:', e.message);
    }

    // Check if this device is approved (uses REST API fallback if SDK hangs)
    const result = await this.checkDeviceStatus();
    return result;
  },

  // Check device status in Firebase
  checkDeviceStatus: async function() {
    if (!firebaseDb) return { approved: false };
    var authReadTimeout = this.AUTH_READ_TIMEOUT_MS || 1200;

    // Safety: ensure deviceId is set before querying Firebase
    if (!this.deviceId) {
      this.generateDeviceId();
      if (!this.deviceId) {
        console.error('[DeviceAuth] Cannot check status: no device ID');
        return { approved: false, error: 'no-device-id' };
      }
    }

    try {
      const applyApprovedDevice = async (data) => {
        this.isApproved = true;
        this.isAdmin = data.isAdmin || false;
        this.canViewDevices = data.canViewDevices || false;
        this.canRevokeDevices = data.canRevokeDevices || false;

        // IMPORTANT: Register admin UID FIRST — Firebase rules gate all admin
        // writes on adminAuthUids. If UID changed (browser data cleared on Android),
        // we must register the new UID before any other write will succeed.
        if (this.isAdmin && firebaseAuthUid) {
          try {
            const adminUidResult = await firebaseRead('jmart-safety/adminAuthUids/' + firebaseAuthUid, authReadTimeout);
            if (!adminUidResult.exists) {
              await firebaseDb.ref('jmart-safety/adminAuthUids/' + firebaseAuthUid).set(true);
              console.log('Admin auth UID registered in adminAuthUids:', firebaseAuthUid);
            }
          } catch (e) {
            console.warn('Admin UID registration failed:', e.message);
          }
        }

        // Now update last seen and auth UID (succeeds because adminAuthUids is current)
        const updates = { lastSeen: new Date().toISOString() };
        if (firebaseAuthUid) updates.authUid = firebaseAuthUid;
        try {
          await firebaseDb.ref('jmart-safety/devices/approved/' + this.deviceId).update(updates);
        } catch (e) {
          console.warn('lastSeen/authUid update failed (non-fatal):', e.message);
        }
        if (firebaseAuthUid) {
          try {
            await this.upsertAuthDeviceRecord(this.deviceId, firebaseAuthUid, this.isAdmin, data);
          } catch (e) {
            console.warn('Auth device registration failed:', e.message);
          }
        }

        // SELF-HEALING: If this device is admin, clean up invalid entries
        if (this.isAdmin) {
          this._cleanupInvalidDevices().catch(e => console.warn('Device cleanup skipped:', e.message));
        }

        this.notifyStatusListeners();
        console.log('Device approved, admin:', this.isAdmin, 'canViewDevices:', this.canViewDevices, 'canRevokeDevices:', this.canRevokeDevices);
        return { approved: true, admin: this.isAdmin, canViewDevices: this.canViewDevices, canRevokeDevices: this.canRevokeDevices };
      };

      // Check the current approved path first — this is the normal startup path.
      let approvedResult = await firebaseRead('jmart-safety/devices/approved/' + this.deviceId, authReadTimeout);
      if (approvedResult.exists) {
        return await applyApprovedDevice(approvedResult.val);
      }

      // MIGRATION: Check for device in old flat structure only if the current
      // approved path did not match. This avoids a wasted extra read on every
      // approved-device startup.
      try {
        const oldDeviceResult = await firebaseRead('jmart-safety/devices/' + this.deviceId, authReadTimeout);
        if (oldDeviceResult.exists) {
          const oldData = oldDeviceResult.val;
          if (oldData.status && typeof oldData.status === 'string') {
            console.log('Migrating device from old path:', oldData.status);
            const targetPath = 'jmart-safety/devices/' + oldData.status + '/' + this.deviceId;
            await firebaseDb.ref(targetPath).set(typeof sanitizeForFirebase === 'function' ? sanitizeForFirebase({
              ...oldData,
              id: this.deviceId,
              migratedAt: new Date().toISOString()
            }) : {
              ...oldData,
              id: this.deviceId,
              migratedAt: new Date().toISOString()
            });
            await firebaseDb.ref('jmart-safety/devices/' + this.deviceId).remove();
            console.log('Migration complete for device:', this.deviceId);
          }
        }
      } catch (migrationErr) {
        console.warn('Device migration skipped (non-fatal):', migrationErr.message);
      }

      approvedResult = await firebaseRead('jmart-safety/devices/approved/' + this.deviceId, authReadTimeout);
      if (approvedResult.exists) {
        return await applyApprovedDevice(approvedResult.val);
      }

      // Attempt first-device bootstrap without reading the full approved-device list.
      // Firebase rules allow this write only when no approved devices exist.
      const bootstrapped = await this.registerAsApproved(true);
      if (bootstrapped) {
        console.log('First device - auto-approved as admin');
        return { approved: true, admin: true, firstDevice: true };
      }

      // Check if already pending
      const pendingResult = await firebaseRead('jmart-safety/devices/pending/' + this.deviceId, authReadTimeout);
      if (!pendingResult.exists) {
        await this.registerAsPending();
      }

      this.isApproved = false;
      this.notifyStatusListeners();
      return { approved: false, pending: true };

    } catch (error) {
      console.error('Error checking device status:', error);
      this.isApproved = false;
      return { approved: false, error: error.message, networkError: true };
    }
  },

  // Register device as pending approval
  registerAsPending: async function() {
    if (!firebaseDb) return;

    try {
      // Wait for auth to be fully ready
      await firebaseAuthReady;

      const deviceData = {
        ...this.deviceInfo,
        authUid: firebaseAuthUid || null,
        requestedAt: new Date().toISOString(),
        status: 'pending'
      };

      await firebaseDb.ref('jmart-safety/devices/pending/' + this.deviceId).set(typeof sanitizeForFirebase === 'function' ? sanitizeForFirebase(deviceData) : deviceData);
      console.log('Device registered as pending approval');
      if (this.isApproved && this.isAdmin) {
        this.notifyAdminsOfNewDevice(deviceData);
      }
    } catch (e) {
      // Non-fatal - app continues working, just won't auto-approve until manually approved
      console.log('[DeviceAuth] Registration skipped (auth timing):', e.message.substring(0, 100));
    }
  },

  // Self-healing: Remove invalid device entries (null, undefined, empty IDs)
  _cleanupInvalidDevices: async function() {
    if (!firebaseDb) return;
    try {
      // Use firebaseRead() (REST fallback) instead of .once() (SDK WebSocket)
      // to stay consistent with the rest of the app's read strategy
      const approvedResult = await firebaseRead('jmart-safety/devices/approved');
      const devices = approvedResult.val;
      if (!devices) return;

      const invalidKeys = ['null', 'undefined'];
      for (const key of invalidKeys) {
        if (devices[key]) {
          console.warn('[DeviceAuth] Removing invalid device entry:', JSON.stringify(key));
          await firebaseDb.ref('jmart-safety/devices/approved/' + key).remove();

          // Also remove any admin UID associated with invalid device
          const invalidDev = devices[key];
          if (invalidDev.authUid) {
            await firebaseDb.ref('jmart-safety/adminAuthUids/' + invalidDev.authUid).remove();
            await this.removeAuthDeviceRecord(invalidDev.authUid);
            console.warn('[DeviceAuth] Removed orphaned admin UID for invalid device:', invalidDev.authUid);
          }

          if (typeof AuditLogManager !== 'undefined') {
            AuditLogManager.log('cleanup', {
              action: 'Removed invalid device entry',
              invalidDeviceId: key,
              removedAuthUid: invalidDev.authUid || 'none'
            });
          }
        }
      }

      // Also clean up pending devices with invalid IDs
      const pendingResult = await firebaseRead('jmart-safety/devices/pending');
      const pending = pendingResult.val;
      if (pending) {
        for (const pKey of invalidKeys) {
          if (pending[pKey]) {
            await firebaseDb.ref('jmart-safety/devices/pending/' + pKey).remove();
            console.warn('[DeviceAuth] Removed invalid pending device:', pKey);
          }
        }
      }
    } catch (e) {
      console.warn('[DeviceAuth] Cleanup failed (non-fatal):', e.message);
    }
  },

  // Register device as approved
  registerAsApproved: async function(isAdmin = false) {
    if (!firebaseDb) return false;

    try {
      const deviceData = {
        ...this.deviceInfo,
        authUid: firebaseAuthUid || null,
        isAdmin: isAdmin,
        approvedAt: new Date().toISOString(),
        approvedBy: isAdmin ? 'SYSTEM (First Device)' : 'Admin',
        lastSeen: new Date().toISOString()
      };

      // Seed adminAuthUids before the first approved-device write so bootstrap
      // still works under locked-down rules.
      if (isAdmin && firebaseAuthUid) {
        await firebaseDb.ref('jmart-safety/adminAuthUids/' + firebaseAuthUid).set(true);
      }

      await firebaseDb.ref('jmart-safety/devices/approved/' + this.deviceId).set(typeof sanitizeForFirebase === 'function' ? sanitizeForFirebase(deviceData) : deviceData);

      // Register admin auth UID for Firebase rules enforcement
      if (isAdmin && firebaseAuthUid) {
        try {
          await firebaseDb.ref('jmart-safety/adminAuthUids/' + firebaseAuthUid).set(true);
          console.log('Admin auth UID registered:', firebaseAuthUid);
        } catch (e) {
          console.warn('Could not register admin auth UID (non-fatal):', e.message);
        }
      }
      if (firebaseAuthUid) {
        try {
          await this.upsertAuthDeviceRecord(this.deviceId, firebaseAuthUid, isAdmin, deviceData);
        } catch (e) {
          console.warn('Could not register auth device mapping (non-fatal):', e.message);
        }
      }

      // Remove from pending if exists
      await firebaseDb.ref('jmart-safety/devices/pending/' + this.deviceId).remove();
    } catch (e) {
      console.error('[DeviceAuth] registerAsApproved failed:', e.message);
      return false;
    }

    this.isApproved = true;
    this.isAdmin = isAdmin;
    this.notifyStatusListeners();
    console.log('Device registered as approved, admin:', isAdmin);
    return true;
  },

  // Approve a pending device (admin only)
  approveDevice: async function(deviceId, makeAdmin = false) {
    if (!this.isAdmin || !firebaseDb) {
      console.error('Only admins can approve devices');
      return false;
    }

    try {
      // Get pending device data (uses REST fallback — SDK .once() hangs on Android)
      const pendingResult = await firebaseRead('jmart-safety/devices/pending/' + deviceId);
      if (!pendingResult.exists) {
        console.error('Device not found in pending list');
        return false;
      }

      const deviceData = pendingResult.val;
      const approvedData = {
        ...deviceData,
        isAdmin: makeAdmin,
        approvedAt: new Date().toISOString(),
        approvedBy: this.deviceId,
        status: 'approved'
      };

      // Move to approved
      await firebaseDb.ref('jmart-safety/devices/approved/' + deviceId).set(typeof sanitizeForFirebase === 'function' ? sanitizeForFirebase(approvedData) : approvedData);
      await firebaseDb.ref('jmart-safety/devices/pending/' + deviceId).remove();

      // If making admin, register their auth UID for Firebase rules
      if (makeAdmin && approvedData.authUid) {
        try {
          await firebaseDb.ref('jmart-safety/adminAuthUids/' + approvedData.authUid).set(true);
        } catch (e) {
          console.warn('Could not register admin auth UID for approved device:', e.message);
        }
      }
      if (approvedData.authUid) {
        try {
          await this.upsertAuthDeviceRecord(deviceId, approvedData.authUid, makeAdmin, approvedData);
        } catch (e) {
          console.warn('Could not register auth device for approved device:', e.message);
        }
      }

      console.log('Device approved:', deviceId);
      return true;
    } catch (error) {
      console.error('Error approving device:', error);
      return false;
    }
  },

  // Deny/reject a pending device (admin only)
  denyDevice: async function(deviceId) {
    if (!this.isAdmin || !firebaseDb) {
      console.error('Only admins can deny devices');
      return false;
    }

    try {
      // Remove from pending and add to denied (uses REST fallback — SDK hangs on Android)
      const pendingResult = await firebaseRead('jmart-safety/devices/pending/' + deviceId);
      if (pendingResult.exists) {
        const deviceData = pendingResult.val;
        var deniedData = {
          ...deviceData,
          deniedAt: new Date().toISOString(),
          deniedBy: this.deviceId
        };
        await firebaseDb.ref('jmart-safety/devices/denied/' + deviceId).set(typeof sanitizeForFirebase === 'function' ? sanitizeForFirebase(deniedData) : deniedData);
        await firebaseDb.ref('jmart-safety/devices/pending/' + deviceId).remove();
        if (deviceData.authUid) {
          await this.removeAuthDeviceRecord(deviceData.authUid);
        }
      }

      console.log('Device denied:', deviceId);
      return true;
    } catch (error) {
      console.error('Error denying device:', error);
      return false;
    }
  },

  // Revoke an approved device (admin or devices with canRevokeDevices permission)
  revokeDevice: async function(deviceId) {
    if ((!this.isAdmin && !this.canRevokeDevices) || !firebaseDb) {
      console.error('Only admins or devices with revoke permission can revoke devices');
      return false;
    }

    // Cannot revoke self
    if (deviceId === this.deviceId) {
      console.error('Cannot revoke own device');
      return false;
    }

    try {
      // Remove admin auth UID if the revoked device was admin (uses REST fallback)
      const revokedResult = await firebaseRead('jmart-safety/devices/approved/' + deviceId);
      if (revokedResult.exists) {
        const revokedData = revokedResult.val;
        if (revokedData.isAdmin && revokedData.authUid) {
          await firebaseDb.ref('jmart-safety/adminAuthUids/' + revokedData.authUid).remove().catch(() => {});
        }
        if (revokedData.authUid) {
          await this.removeAuthDeviceRecord(revokedData.authUid);
        }
      }
      await firebaseDb.ref('jmart-safety/devices/approved/' + deviceId).remove();
      console.log('Device revoked:', deviceId);
      return true;
    } catch (error) {
      console.error('Error revoking device:', error);
      return false;
    }
  },

  // Listen for pending device changes (for admin notifications)
  listenForPendingDevices: function(callback) {
    if (!firebaseDb || !this.isAdmin) return () => {};

    const ref = firebaseDb.ref('jmart-safety/devices/pending');

    const valueHandler = (snapshot) => {
      const data = snapshot.val();
      this.pendingDevices = data ? Object.entries(data).map(([id, info]) => ({ id, ...info })) : [];
      callback(this.pendingDevices);
    };
    ref.on('value', valueHandler, function(err) { console.warn('[DeviceAuth] Pending listener error:', err.message); });

    // Also listen for child_added for new device notifications
    // Skip initial fire (child_added fires for all existing children on first attach)
    let initialLoadComplete = false;
    ref.once('value', () => { initialLoadComplete = true; });
    const childHandler = (snapshot) => {
      if (!initialLoadComplete) return;
      const newDevice = { id: snapshot.key, ...snapshot.val() };
      this.notifyNotificationListeners('new_device', newDevice);
    };
    ref.on('child_added', childHandler, function(err) { console.warn('[DeviceAuth] child_added listener error:', err.message); });

    return () => {
      ref.off('value', valueHandler);
      ref.off('child_added', childHandler);
    };
  },

  // Listen for approved devices
  listenForApprovedDevices: function(callback) {
    if (!firebaseDb) return () => {};

    const ref = firebaseDb.ref('jmart-safety/devices/approved');
    ref.on('value', (snapshot) => {
      const data = snapshot.val();
      this.approvedDevices = data ? Object.entries(data).map(([id, info]) => ({ id, ...info })) : [];
      callback(this.approvedDevices);
    }, function(err) { console.warn('[DeviceAuth] Approved listener error:', err.message); });

    return () => ref.off('value');
  },

  // Listen for own device status changes (in case revoked)
  listenForOwnDeviceStatus: function(callback) {
    if (!firebaseDb) return () => {};

    const ref = firebaseDb.ref('jmart-safety/devices/approved/' + this.deviceId);
    ref.on('value', (snapshot) => {
      if (!snapshot.exists() && this.isApproved) {
        // Device was revoked
        this.isApproved = false;
        this.isAdmin = false;
        callback({ revoked: true });
      }
    }, function(err) { console.warn('[DeviceAuth] Own device status listener error:', err.message); });

    return () => ref.off('value');
  },

  // Notify admins of new device request
  notifyAdminsOfNewDevice: async function(deviceData) {
    if (!firebaseDb || !this.isApproved) return;

    try {
      // Store notification in Firebase for all admins
      var notification = {
        type: 'new_device_request',
        device: deviceData,
        timestamp: new Date().toISOString(),
        read: false
      };

      await firebaseDb.ref('jmart-safety/notifications').push(typeof sanitizeForFirebase === 'function' ? sanitizeForFirebase(notification) : notification);
    } catch (e) {
      console.warn('[DeviceAuth] notifyAdmins failed (non-fatal):', e.message);
    }
  },

  // Add status listener
  onStatusChange: function(callback) {
    this.statusListeners.push(callback);
    // Immediately call with current status
    callback({ approved: this.isApproved, admin: this.isAdmin });
    return () => {
      this.statusListeners = this.statusListeners.filter(cb => cb !== callback);
    };
  },

  // Notify status listeners
  notifyStatusListeners: function() {
    this.statusListeners.forEach(cb => cb({ approved: this.isApproved, admin: this.isAdmin }));
  },

  // Add notification listener
  onNotification: function(callback) {
    this.notificationListeners.push(callback);
    return () => {
      this.notificationListeners = this.notificationListeners.filter(cb => cb !== callback);
    };
  },

  // Notify notification listeners
  notifyNotificationListeners: function(type, data) {
    this.notificationListeners.forEach(cb => cb(type, data));
  },

  // Request browser notification permission
  requestNotificationPermission: async function() {
    try {
      if (!('Notification' in window)) {
        console.log('Browser does not support notifications');
        return false;
      }

      if (Notification.permission === 'granted') {
        return true;
      }

      if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      }
    } catch (e) {
      // Silently skip — Notification API throws on some mobile browsers/PWAs
      console.log('[DeviceAuth] Notification permission unavailable:', e.message);
    }

    return false;
  },

  // Show browser notification for new device
  showBrowserNotification: function(title, body) {
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
          body: body,
          icon: '🛡️',
          tag: 'jmart-device-auth',
          requireInteraction: true
        });
      }
    } catch (e) {
      // Silently skip — Notification constructor throws on some mobile browsers/PWAs
      console.log('[DeviceAuth] Browser notification unavailable:', e.message);
    }
  },

  // ========================================
  // PASSWORD MANAGEMENT (consolidated from DeviceAuthManager)
  // ========================================
  APP_PASSWORD_HASH: null,

  // Legacy hash (DJB2) — kept only for migration verification
  _legacyHash: function(password) {
    let hash = 0;
    const str = password + 'jmart_salt_2024';
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return 'hash_' + Math.abs(hash).toString(16);
  },

  // Legacy SHA-256 hash — kept only for migration verification
  _hashPasswordSHA256: async function(password) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(password + 'jmart_salt_2024_v2');
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return 'sha256_' + hashArray.map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
    } catch (e) {
      return null;
    }
  },

  // Generate cryptographically random salt
  generateSalt: function() {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array).map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
  },

  // PBKDF2 hash with random salt (current standard)
  hashPasswordPBKDF2: async function(password, salt) {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: encoder.encode(salt),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    );
    const hashArray = Array.from(new Uint8Array(derivedBits));
    return hashArray.map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
  },

  // Hash password — uses PBKDF2 (primary) with SHA-256 fallback for older browsers
  hashPassword: async function(password) {
    try {
      const salt = this.generateSalt();
      const hash = await this.hashPasswordPBKDF2(password, salt);
      return JSON.stringify({ hash: hash, salt: salt, algorithm: 'pbkdf2', iterations: 100000 });
    } catch (e) {
      console.warn('PBKDF2 unavailable, falling back to SHA-256:', e.message);
      var sha256Result = await this._hashPasswordSHA256(password);
      return sha256Result || this._legacyHash(password);
    }
  },

  // Set initial password (first time setup)
  setPassword: async function(password) {
    if (!firebaseDb) return false;
    try {
      const hashData = await this.hashPassword(password);
      await firebaseDb.ref('jmart-safety/config/appPasswordHash').set(hashData);
      this.APP_PASSWORD_HASH = hashData;
      return true;
    } catch (error) {
      console.error('Error setting password:', error);
      return false;
    }
  },

  // Verify password (handles PBKDF2 JSON, SHA-256 string, and legacy DJB2 formats)
  verifyPassword: async function(password) {
    if (!this.APP_PASSWORD_HASH) return false;

    // Try PBKDF2 format (JSON string with salt)
    try {
      const stored = JSON.parse(this.APP_PASSWORD_HASH);
      if (stored.algorithm === 'pbkdf2' && stored.salt && stored.hash) {
        const hash = await this.hashPasswordPBKDF2(password, stored.salt);
        return hash === stored.hash;
      }
    } catch (e) {
      // Not JSON — fall through to legacy formats
    }

    // Try SHA-256 format (migration path)
    try {
      const sha256Hash = await this._hashPasswordSHA256(password);
      if (sha256Hash && sha256Hash === this.APP_PASSWORD_HASH) {
        console.log('Migrating password hash from SHA-256 to PBKDF2');
        try {
          const newHash = await this.hashPassword(password);
          await firebaseDb.ref('jmart-safety/config/appPasswordHash').set(newHash);
          this.APP_PASSWORD_HASH = newHash;
        } catch (migErr) {
          console.warn('Hash migration failed (non-fatal):', migErr.message);
        }
        return true;
      }
    } catch (e) { /* ignore */ }

    // Try legacy DJB2 format (migration path)
    if (this.APP_PASSWORD_HASH && this.APP_PASSWORD_HASH.startsWith('hash_')) {
      const oldHash = this._legacyHash(password);
      if (oldHash === this.APP_PASSWORD_HASH) {
        console.log('Migrating password hash from DJB2 to PBKDF2');
        try {
          const newHash = await this.hashPassword(password);
          await firebaseDb.ref('jmart-safety/config/appPasswordHash').set(newHash);
          this.APP_PASSWORD_HASH = newHash;
        } catch (migErr) {
          console.warn('Hash migration failed (non-fatal):', migErr.message);
        }
        return true;
      }
    }

    return false;
  },

  // Load password hash from Firebase (uses REST API fallback)
  // Caches locally so login works even when Firebase is slow/unavailable
  loadPasswordHash: async function() {
    // Always try local cache first for instant availability
    try {
      var cached = localStorage.getItem('jmart-password-hash');
      if (cached) {
        this.APP_PASSWORD_HASH = cached;
        console.log('[loadPasswordHash] Loaded from local cache');
      }
    } catch (e) { /* localStorage might not be available */ }

    if (!isFirebaseConfigured) return;
    try {
      var result = await firebaseRead('jmart-safety/config/appPasswordHash', this.AUTH_READ_TIMEOUT_MS || 1200);
      if (result.val) {
        this.APP_PASSWORD_HASH = result.val;
        // Cache locally for next time
        try { localStorage.setItem('jmart-password-hash', result.val); } catch (e) {}
        console.log('[loadPasswordHash] Loaded via', result.source, '(cached locally)');
      }
    } catch (e) {
      console.warn('Could not load password hash from Firebase:', e.message);
      if (this.APP_PASSWORD_HASH) {
        console.log('[loadPasswordHash] Using local cache as fallback');
      }
    }
  },

  // ========================================
  // DEVICE MANAGEMENT (consolidated from DeviceAuthManager)
  // ========================================

  // Register device with name (for login flow)
  registerDevice: async function(deviceName) {
    if (!firebaseDb) return false;
    try {
      const ua = navigator.userAgent;
      let deviceType = this.deviceInfo?.type || 'Unknown Device';
      let browser = this.deviceInfo?.browser || 'Unknown Browser';

      await firebaseDb.ref('jmart-safety/devices/pending/' + this.deviceId).set({
        id: this.deviceId,
        name: deviceName || 'Unknown Device',
        type: deviceType,
        browser: browser,
        screen: screen.width + 'x' + screen.height,
        authUid: firebaseAuthUid || null,
        status: 'pending',
        requestedAt: new Date().toISOString(),
        registeredAt: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        userAgent: ua.substring(0, 100)
      });
      return true;
    } catch (error) {
      console.error('Error registering device:', error);
      return false;
    }
  },

  // Approve as first admin device (during initial setup)
  approveAsAdmin: async function() {
    if (!firebaseDb) return false;
    try {
      await firebaseDb.ref('jmart-safety/devices/approved/' + this.deviceId).set({
        id: this.deviceId,
        type: this.deviceInfo?.type || 'Unknown Device',
        browser: this.deviceInfo?.browser || 'Unknown Browser',
        screen: screen.width + 'x' + screen.height,
        authUid: firebaseAuthUid || null,
        isAdmin: true,
        approvedAt: new Date().toISOString(),
        approvedBy: 'SYSTEM (First Device)',
        lastSeen: new Date().toISOString()
      });
      // Register admin auth UID for Firebase rules enforcement
      if (firebaseAuthUid) {
        await firebaseDb.ref('jmart-safety/adminAuthUids/' + firebaseAuthUid).set(true);
        await this.upsertAuthDeviceRecord(this.deviceId, firebaseAuthUid, true, this.deviceInfo || {});
      }
      await firebaseDb.ref('jmart-safety/devices/pending/' + this.deviceId).remove();
      this.isAdmin = true;
      return true;
    } catch (error) {
      console.error('Error approving as admin:', error);
      return false;
    }
  },

  // Remove an approved device (same as revokeDevice, aliased for compat)
  removeDevice: async function(deviceId) {
    return this.revokeDevice(deviceId);
  },

  // Rename a device. Admin/canRevokeDevices can rename any device;
  // any user can rename their OWN device.
  renameDevice: async function(targetDeviceId, newName) {
    if (!firebaseDb) return false;
    if (!newName || !newName.trim()) return false;
    const isSelfRename = targetDeviceId === this.deviceId;
    if (!this.isAdmin && !this.canRevokeDevices && !isSelfRename) return false;
    try {
      // Use firebaseRead (REST fallback) to check existence, then direct write for the update
      const approvedResult = await firebaseRead('jmart-safety/devices/approved/' + targetDeviceId);
      if (approvedResult.exists) {
        await firebaseDb.ref('jmart-safety/devices/approved/' + targetDeviceId + '/name').set(newName.trim());
        return true;
      }
      const pendingResult = await firebaseRead('jmart-safety/devices/pending/' + targetDeviceId);
      if (pendingResult.exists) {
        await firebaseDb.ref('jmart-safety/devices/pending/' + targetDeviceId + '/name').set(newName.trim());
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error renaming device:', error);
      return false;
    }
  },

  // Listen for all device changes (pending + approved + denied)
  listenToDevices: function(callback) {
    if (!firebaseDb) return () => {};

    const pendingRef = firebaseDb.ref('jmart-safety/devices/pending');
    const approvedRef = firebaseDb.ref('jmart-safety/devices/approved');
    const deniedRef = firebaseDb.ref('jmart-safety/devices/denied');
    let deniedDevices = [];

    const updateDevices = () => {
      callback({
        pending: this.pendingDevices,
        approved: this.approvedDevices,
        denied: deniedDevices
      });
    };

    pendingRef.on('value', (snapshot) => {
      const data = snapshot.val();
      this.pendingDevices = data ? Object.entries(data).map(([id, info]) => ({ id, ...info })) : [];
      updateDevices();
    }, function(err) { console.warn('[DeviceAuth] Pending devices listener error:', err.message); });

    approvedRef.on('value', (snapshot) => {
      const data = snapshot.val();
      this.approvedDevices = data ? Object.entries(data).map(([id, info]) => ({ id, ...info })) : [];
      updateDevices();
    }, function(err) { console.warn('[DeviceAuth] Approved devices listener error:', err.message); });

    deniedRef.on('value', (snapshot) => {
      const data = snapshot.val();
      deniedDevices = data ? Object.entries(data).map(([id, info]) => ({ id, ...info })) : [];
      updateDevices();
    }, function(err) { console.warn('[DeviceAuth] Denied devices listener error:', err.message); });

    return () => {
      pendingRef.off();
      approvedRef.off();
      deniedRef.off();
    };
  },

  // Update last seen timestamp
  updateLastSeen: async function() {
    if (!firebaseDb || !this.deviceId) return;
    try {
      await firebaseDb.ref('jmart-safety/devices/approved/' + this.deviceId + '/lastSeen').set(new Date().toISOString());
    } catch (error) { /* Silently fail */ }
  },

  // Get pending device count
  getPendingCount: function() {
    return this.pendingDevices.length;
  }
};
