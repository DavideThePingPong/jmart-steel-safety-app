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

    // If it's already past 7pm and we haven't backed up today, do it now
    if (now.getHours() >= 19 && this.lastBackupDate !== today) {
      console.log('Missed backup detected - running now');
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

  performBackup: async function() {
    if (typeof GoogleDriveSync === 'undefined' || !GoogleDriveSync.isConnected()) {
      console.log('Google Drive not connected - skipping backup');
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
