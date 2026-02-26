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

    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
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

    this.deviceId = 'DEV-' + Math.abs(hash).toString(36).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();
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

  // Initialize device auth
  init: async function() {
    this.generateDeviceId();
    this.getDeviceInfo();
    console.log('Device ID:', this.deviceId);

    if (!firebaseDb || !isFirebaseConfigured) {
      // No Firebase - approve locally (offline mode)
      this.isApproved = true;
      this.isAdmin = true;
      this.notifyStatusListeners();
      return { approved: true, admin: true, offline: true };
    }

    // Check if this device is approved
    const result = await this.checkDeviceStatus();
    return result;
  },

  // Check device status in Firebase
  checkDeviceStatus: async function() {
    if (!firebaseDb) return { approved: false };

    try {
      // MIGRATION: Check for device in old flat structure and migrate
      // Wrapped in its own try-catch so migration errors don't block auth
      try {
        const oldDeviceSnap = await firebaseDb.ref('jmart-safety/devices/' + this.deviceId).once('value');
        if (oldDeviceSnap.exists()) {
          const oldData = oldDeviceSnap.val();
          if (oldData.status && typeof oldData.status === 'string') {
            console.log('Migrating device from old path:', oldData.status);
            const targetPath = 'jmart-safety/devices/' + oldData.status + '/' + this.deviceId;
            await firebaseDb.ref(targetPath).set({
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

      // Bulk migration removed — reading all devices at once is blocked by
      // Firebase rules (only individual device reads are allowed).
      // Old-format devices are migrated individually above when they connect.

      // Check approved devices
      const approvedSnap = await firebaseDb.ref('jmart-safety/devices/approved/' + this.deviceId).once('value');
      if (approvedSnap.exists()) {
        const data = approvedSnap.val();
        this.isApproved = true;
        this.isAdmin = data.isAdmin || false;
        this.canViewDevices = data.canViewDevices || false;
        this.canRevokeDevices = data.canRevokeDevices || false;

        // Update last seen and auth UID (links Firebase Auth to device)
        const updates = { lastSeen: new Date().toISOString() };
        if (firebaseAuthUid) updates.authUid = firebaseAuthUid;
        await firebaseDb.ref('jmart-safety/devices/approved/' + this.deviceId).update(updates);

        this.notifyStatusListeners();
        console.log('Device approved, admin:', this.isAdmin, 'canViewDevices:', this.canViewDevices, 'canRevokeDevices:', this.canRevokeDevices);
        return { approved: true, admin: this.isAdmin, canViewDevices: this.canViewDevices, canRevokeDevices: this.canRevokeDevices };
      }

      // Check if any devices exist (first device becomes admin)
      const allApprovedSnap = await firebaseDb.ref('jmart-safety/devices/approved').once('value');
      if (!allApprovedSnap.exists() || allApprovedSnap.numChildren() === 0) {
        // First device - auto approve as admin
        console.log('First device - auto-approving as admin');
        await this.registerAsApproved(true);
        return { approved: true, admin: true, firstDevice: true };
      }

      // ADMIN RECOVERY: Check if all approved devices are orphaned (no recent activity)
      // If all admins have lastSeen older than 7 days and this device has verified the
      // app password, it can reclaim admin. This handles the case where browser cache
      // was cleared on all admin devices, leaving them orphaned in Firebase.
      const approvedDevices = allApprovedSnap.val();
      const now = Date.now();
      const ORPHAN_THRESHOLD = 7 * 24 * 60 * 60 * 1000; // 7 days
      let hasActiveAdmin = false;

      if (approvedDevices) {
        Object.values(approvedDevices).forEach(dev => {
          if (dev && dev.isAdmin) {
            const lastSeen = dev.lastSeen ? new Date(dev.lastSeen).getTime() : 0;
            if ((now - lastSeen) < ORPHAN_THRESHOLD) {
              hasActiveAdmin = true;
            }
          }
        });
      }

      if (!hasActiveAdmin) {
        // All admin devices are orphaned — auto-approve this device as admin
        // (user already passed the password gate to get here)
        console.log('ADMIN RECOVERY: No active admin devices found. Reclaiming admin for this device.');

        // Clean up orphaned approved devices that haven't been seen in 30+ days
        // NEVER remove permanently approved devices (Mac, S.s, Admin Android)
        const CLEANUP_THRESHOLD = 30 * 24 * 60 * 60 * 1000;
        if (approvedDevices) {
          for (const [devId, dev] of Object.entries(approvedDevices)) {
            // Skip permanently approved devices — they stay forever
            if (dev && dev.permanentlyApproved) {
              console.log('Skipping cleanup of permanently approved device:', devId, dev.name || 'unknown');
              continue;
            }
            const lastSeen = dev && dev.lastSeen ? new Date(dev.lastSeen).getTime() : 0;
            if ((now - lastSeen) > CLEANUP_THRESHOLD) {
              console.log('Cleaning up orphaned device:', devId, dev.name || dev.type || 'unknown');
              await firebaseDb.ref('jmart-safety/devices/approved/' + devId).remove().catch(() => {});
            }
          }
        }

        await this.registerAsApproved(true);
        return { approved: true, admin: true, adminRecovery: true };
      }

      // HARDCODED ALWAYS-APPROVED DEVICES (per CLAUDE.md rules)
      // These devices are auto-approved on every registration, even after cache clear
      const ua = navigator.userAgent;
      const isMac = /Mac/i.test(ua) && !/iPhone|iPad/i.test(ua);
      const isIPhone = /iPhone/i.test(ua);

      if (isMac || isIPhone) {
        const autoName = isMac ? "Davide's Mac" : 'S.s';
        console.log('ALWAYS-APPROVED: ' + autoName + ' detected — auto-approving');
        await this.registerAsApproved(false);
        await firebaseDb.ref('jmart-safety/devices/approved/' + this.deviceId + '/permanentlyApproved').set(true);
        await firebaseDb.ref('jmart-safety/devices/approved/' + this.deviceId + '/name').set(autoName);
        // Remove from pending/denied if present
        await firebaseDb.ref('jmart-safety/devices/pending/' + this.deviceId).remove().catch(() => {});
        await firebaseDb.ref('jmart-safety/devices/denied/' + this.deviceId).remove().catch(() => {});
        return { approved: true, admin: false, autoApproved: true };
      }

      // Check if already pending
      const pendingSnap = await firebaseDb.ref('jmart-safety/devices/pending/' + this.deviceId).once('value');
      if (!pendingSnap.exists()) {
        // Register as pending
        await this.registerAsPending();
      }

      this.isApproved = false;
      this.notifyStatusListeners();
      return { approved: false, pending: true };

    } catch (error) {
      console.error('Error checking device status:', error);
      // On error, allow access (don't lock out users due to network issues)
      // This matches STEEL Command Center behavior
      this.isApproved = true;
      return { approved: true, error: error.message };
    }
  },

  // Register device as pending approval
  registerAsPending: async function() {
    if (!firebaseDb) return;

    const deviceData = {
      ...this.deviceInfo,
      authUid: firebaseAuthUid || null,
      requestedAt: new Date().toISOString(),
      status: 'pending'
    };

    await firebaseDb.ref('jmart-safety/devices/pending/' + this.deviceId).set(deviceData);
    console.log('Device registered as pending approval');

    // Notify all admins of new device request
    this.notifyAdminsOfNewDevice(deviceData);
  },

  // Register device as approved
  registerAsApproved: async function(isAdmin = false) {
    if (!firebaseDb) return;

    const deviceData = {
      ...this.deviceInfo,
      authUid: firebaseAuthUid || null,
      isAdmin: isAdmin,
      approvedAt: new Date().toISOString(),
      approvedBy: isAdmin ? 'SYSTEM (First Device)' : 'Admin',
      lastSeen: new Date().toISOString()
    };

    await firebaseDb.ref('jmart-safety/devices/approved/' + this.deviceId).set(deviceData);

    // Remove from pending if exists
    await firebaseDb.ref('jmart-safety/devices/pending/' + this.deviceId).remove();

    this.isApproved = true;
    this.isAdmin = isAdmin;
    this.notifyStatusListeners();
    console.log('Device registered as approved, admin:', isAdmin);
  },

  // Approve a pending device (admin only)
  approveDevice: async function(deviceId, makeAdmin = false) {
    if (!this.isAdmin || !firebaseDb) {
      console.error('Only admins can approve devices');
      return false;
    }

    try {
      // Get pending device data
      const pendingSnap = await firebaseDb.ref('jmart-safety/devices/pending/' + deviceId).once('value');
      if (!pendingSnap.exists()) {
        console.error('Device not found in pending list');
        return false;
      }

      const deviceData = pendingSnap.val();
      const approvedData = {
        ...deviceData,
        isAdmin: makeAdmin,
        approvedAt: new Date().toISOString(),
        approvedBy: this.deviceId,
        status: 'approved'
      };

      // Move to approved
      await firebaseDb.ref('jmart-safety/devices/approved/' + deviceId).set(approvedData);
      await firebaseDb.ref('jmart-safety/devices/pending/' + deviceId).remove();

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
      // Remove from pending and add to denied
      const pendingSnap = await firebaseDb.ref('jmart-safety/devices/pending/' + deviceId).once('value');
      if (pendingSnap.exists()) {
        const deviceData = pendingSnap.val();
        await firebaseDb.ref('jmart-safety/devices/denied/' + deviceId).set({
          ...deviceData,
          deniedAt: new Date().toISOString(),
          deniedBy: this.deviceId
        });
        await firebaseDb.ref('jmart-safety/devices/pending/' + deviceId).remove();
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

    ref.on('value', (snapshot) => {
      const data = snapshot.val();
      this.pendingDevices = data ? Object.entries(data).map(([id, info]) => ({ id, ...info })) : [];
      callback(this.pendingDevices);
    });

    // Also listen for child_added for new device notifications
    ref.on('child_added', (snapshot) => {
      const newDevice = { id: snapshot.key, ...snapshot.val() };
      this.notifyNotificationListeners('new_device', newDevice);
    });

    return () => {
      ref.off('value');
      ref.off('child_added');
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
    });

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
    });

    return () => ref.off('value');
  },

  // Notify admins of new device request
  notifyAdminsOfNewDevice: async function(deviceData) {
    if (!firebaseDb) return;

    // Store notification in Firebase for all admins
    const notification = {
      type: 'new_device_request',
      device: deviceData,
      timestamp: new Date().toISOString(),
      read: false
    };

    await firebaseDb.ref('jmart-safety/notifications').push(notification);
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

    return false;
  },

  // Show browser notification for new device
  showBrowserNotification: function(title, body) {
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body: body,
        icon: '🛡️',
        tag: 'jmart-device-auth',
        requireInteraction: true
      });
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

  // Hash password using browser's built-in SHA-256 (async)
  hashPassword: async function(password) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(password + 'jmart_salt_2024_v2');
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return 'sha256_' + hashArray.map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
    } catch (e) {
      console.warn('SHA-256 unavailable, falling back to legacy hash:', e.message);
      return this._legacyHash(password);
    }
  },

  // Set initial password (first time setup)
  setPassword: async function(password) {
    if (!firebaseDb) return false;
    const hash = await this.hashPassword(password);
    try {
      await firebaseDb.ref('jmart-safety/config/appPasswordHash').set(hash);
      this.APP_PASSWORD_HASH = hash;
      return true;
    } catch (error) {
      console.error('Error setting password:', error);
      return false;
    }
  },

  // Verify password (with automatic migration from old hash format)
  verifyPassword: async function(password) {
    const newHash = await this.hashPassword(password);
    if (newHash === this.APP_PASSWORD_HASH) return true;
    if (this.APP_PASSWORD_HASH && this.APP_PASSWORD_HASH.startsWith('hash_')) {
      const oldHash = this._legacyHash(password);
      if (oldHash === this.APP_PASSWORD_HASH) {
        console.log('Migrating password hash from DJB2 to SHA-256');
        try {
          await firebaseDb.ref('jmart-safety/config/appPasswordHash').set(newHash);
          this.APP_PASSWORD_HASH = newHash;
        } catch (e) {
          console.warn('Hash migration failed (non-fatal):', e.message);
        }
        return true;
      }
    }
    return false;
  },

  // Load password hash from Firebase
  loadPasswordHash: async function() {
    if (!firebaseDb || !isFirebaseConfigured) return;
    try {
      const configSnap = await firebaseDb.ref('jmart-safety/config/appPasswordHash').once('value');
      this.APP_PASSWORD_HASH = configSnap.val();
    } catch (e) {
      console.warn('Could not load password hash:', e.message);
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
        isAdmin: true,
        approvedAt: new Date().toISOString(),
        approvedBy: 'SYSTEM (First Device)',
        lastSeen: new Date().toISOString()
      });
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

  // Rename a device (admin only)
  renameDevice: async function(targetDeviceId, newName) {
    if (!firebaseDb || (!this.isAdmin && !this.canRevokeDevices)) return false;
    if (!newName || !newName.trim()) return false;
    try {
      const approvedRef = firebaseDb.ref('jmart-safety/devices/approved/' + targetDeviceId);
      const approvedSnap = await approvedRef.once('value');
      if (approvedSnap.exists()) {
        await approvedRef.child('name').set(newName.trim());
        return true;
      }
      const pendingRef = firebaseDb.ref('jmart-safety/devices/pending/' + targetDeviceId);
      const pendingSnap = await pendingRef.once('value');
      if (pendingSnap.exists()) {
        await pendingRef.child('name').set(newName.trim());
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
    });

    approvedRef.on('value', (snapshot) => {
      const data = snapshot.val();
      this.approvedDevices = data ? Object.entries(data).map(([id, info]) => ({ id, ...info })) : [];
      updateDevices();
    });

    deniedRef.on('value', (snapshot) => {
      const data = snapshot.val();
      deniedDevices = data ? Object.entries(data).map(([id, info]) => ({ id, ...info })) : [];
      updateDevices();
    });

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
