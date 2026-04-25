// Daily Backup Scheduler
// Extracted from index.html for maintainability
// ========================================
// AUTOMATIC 7PM DAILY BACKUP SCHEDULER
// Uses smart scheduling instead of 60s polling to save Firebase quota.
// Calculates exact delay until next 7:00 PM, fires once, then reschedules.
// TASK-005: Replaced 60s polling (1440 polls/day) with single daily timeout.
// TASK-008: No longer auto-starts on script load. Call start() after auth ready.
// ========================================
const DailyBackupScheduler = {
  _timeoutId: null,
  _started: false,
  lastBackupDate: localStorage.getItem('last-drive-backup-date'),

  start: function() {
    if (this._started) return;
    this._started = true;

    // Check immediately in case we missed today's backup (e.g. app opened after 7pm)
    this._checkMissed();

    // Schedule next 7pm backup
    this._scheduleNext();
    console.log('Daily backup scheduler started - next backup at 7:00 PM');
  },

  _msUntilNext7pm: function() {
    var now = new Date();
    var target = new Date();
    target.setHours(19, 0, 0, 0);
    // If we're past 7pm today, schedule for tomorrow
    if (now >= target) {
      target.setDate(target.getDate() + 1);
    }
    return target.getTime() - now.getTime();
  },

  _scheduleNext: function() {
    // Clear any existing timeout
    if (this._timeoutId) {
      clearTimeout(this._timeoutId);
      this._timeoutId = null;
    }

    var delayMs = this._msUntilNext7pm();
    var delayHours = (delayMs / 3600000).toFixed(1);
    console.log('Backup scheduled in ' + delayHours + ' hours');

    var self = this;
    this._timeoutId = setTimeout(function() {
      self._fire();
    }, delayMs);
  },

  _checkMissed: function() {
    var now = new Date();
    var today = now.toDateString();
    this.lastBackupDate = localStorage.getItem('last-drive-backup-date');

    // Run backup if EITHER: it's past 7pm today and we haven't backed up,
    // OR the last backup was before yesterday (we missed entire prior days
    // because the device was offline/asleep at 7pm on those days).
    // Previously the >=19h check also gated the missed-day case, so a phone
    // closed at 5pm and reopened at 8am the next morning would skip the
    // missed day forever.
    var lastBackupMs = 0;
    if (this.lastBackupDate) {
      try { lastBackupMs = new Date(this.lastBackupDate).getTime(); } catch (e) { lastBackupMs = 0; }
    }
    var oneDayAgoMs = now.getTime() - 24 * 3600 * 1000;
    var missedPriorDay = !this.lastBackupDate || lastBackupMs < oneDayAgoMs;
    var pastSevenPmToday = now.getHours() >= 19 && this.lastBackupDate !== today;
    if (pastSevenPmToday || missedPriorDay) {
      console.log('Missed backup detected (priorDay=' + missedPriorDay + ', past7pm=' + pastSevenPmToday + ') — running now');
      this.performBackup();
    }
  },

  _fire: async function() {
    try {
      var today = new Date().toDateString();
      this.lastBackupDate = localStorage.getItem('last-drive-backup-date');

      if (this.lastBackupDate !== today) {
        console.log('7pm backup triggered!');
        await this.performBackup();
      }
    } catch (e) {
      console.error('[DailyBackup] _fire error (will reschedule):', e.message);
    }

    // Reschedule for tomorrow — always runs even if backup failed
    this._scheduleNext();
  },

  // Try to claim the distributed backup lock for today's date. Uses a Firebase
  // transaction so only one device wins per day across the team. Returns true
  // if we own the lock, false if another device already claimed it (we bail).
  // Without this, every device runs the 7pm backup independently — three
  // devices = three duplicate Drive uploads of every form, every night.
  _claimBackupLock: async function() {
    if (typeof firebaseDb === 'undefined' || !firebaseDb) return true; // no Firebase = can't coordinate, run anyway
    if (typeof DeviceAuthManager === 'undefined' || !DeviceAuthManager.deviceId) return true; // no identity = can't coordinate
    var dateKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC, stable across devices
    var deviceId = DeviceAuthManager.deviceId;
    try {
      var ref = firebaseDb.ref('jmart-safety/backupLock/' + dateKey);
      var result = await ref.transaction(function(current) {
        if (current === null) {
          return { deviceId: deviceId, claimedAt: Date.now() };
        }
        // Lock exists — abort transaction (returns undefined keeps existing).
        return undefined;
      });
      var winner = result && result.snapshot && result.snapshot.val();
      var weWon = winner && winner.deviceId === deviceId;
      if (!weWon) {
        console.log('[DailyBackup] Another device already claimed today\'s backup lock — skipping');
      }
      return !!weWon;
    } catch (e) {
      console.warn('[DailyBackup] Lock claim failed (running backup anyway):', e.message);
      return true; // fail-open: better duplicate uploads than missed backup
    }
  },

  performBackup: async function() {
    if (typeof GoogleDriveSync === 'undefined' || !GoogleDriveSync.isConnected()) {
      console.log('Google Drive not connected - skipping backup');
      return;
    }

    // Distributed lock: only one device per day actually performs the backup.
    var weHoldLock = await this._claimBackupLock();
    if (!weHoldLock) {
      // Mark locally as done so we don't re-attempt today; another device handled it.
      this.lastBackupDate = new Date().toDateString();
      localStorage.setItem('last-drive-backup-date', this.lastBackupDate);
      return;
    }

    // Get forms from localStorage
    var formsJson = localStorage.getItem('jmart-safety-forms');
    if (!formsJson) {
      console.log('No forms to backup');
      return;
    }

    var forms;
    try {
      forms = JSON.parse(formsJson);
    } catch (e) {
      console.error('Daily backup: corrupt forms data in localStorage:', e.message);
      return;
    }
    if (!Array.isArray(forms) || forms.length === 0) {
      console.log('No valid forms to backup');
      return;
    }
    var result;
    try {
      result = await GoogleDriveSync.uploadDailyForms(forms);
    } catch (backupErr) {
      console.error('Daily backup failed:', backupErr);
      if (typeof ErrorTelemetry !== 'undefined') ErrorTelemetry.captureError(backupErr, 'daily-backup');
      return;
    }

    if (result && result.success) {
      this.lastBackupDate = new Date().toDateString();
      localStorage.setItem('last-drive-backup-date', this.lastBackupDate);
      console.log('Daily backup complete: ' + result.uploaded + ' forms uploaded');

      // Show notification if available
      try {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('JMart Safety Backup', {
            body: result.uploaded + ' forms backed up to Google Drive',
            icon: '/icons/icon-192.png'
          });
        }
      } catch (e) {
        // Silently skip — Notification constructor throws on some mobile browsers/PWAs
      }
    }
  },

  // Manual backup trigger
  backupNow: async function() {
    return await this.performBackup();
  },

  stop: function() {
    if (this._timeoutId) {
      clearTimeout(this._timeoutId);
      this._timeoutId = null;
    }
    this._started = false;
    console.log('Daily backup scheduler stopped');
  }
};

// TASK-008: Do NOT auto-start here. The app must call
// DailyBackupScheduler.start() after authentication is ready.
// This prevents Firebase queries before the user is signed in.
