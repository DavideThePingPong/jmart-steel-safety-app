// Daily Backup Scheduler
// Extracted from index.html for maintainability
// ========================================
// AUTOMATIC 7PM DAILY BACKUP SCHEDULER
// ========================================
const DailyBackupScheduler = {
  checkInterval: null,
  lastBackupDate: localStorage.getItem('last-drive-backup-date'),

  start: function() {
    // Check every minute if it's 7pm
    this.checkInterval = IntervalRegistry.setInterval(() => this.checkAndBackup(), 60000, 'DailyBackupScheduler');
    console.log('Daily backup scheduler started - backups at 7:00 PM');

    // Also check immediately in case we missed today's backup
    this.checkAndBackup();
  },

  checkAndBackup: async function() {
    const now = new Date();
    const today = now.toDateString();
    const hour = now.getHours();
    const minute = now.getMinutes();

    // Check if it's 7pm (19:00) and we haven't backed up today
    if (hour === 19 && minute === 0 && this.lastBackupDate !== today) {
      console.log('7pm backup triggered!');
      await this.performBackup();
    }
  },

  performBackup: async function() {
    if (!GoogleDriveSync.isConnected()) {
      console.log('Google Drive not connected - skipping backup');
      return;
    }

    // Get forms from localStorage
    const formsJson = localStorage.getItem('jmart-safety-forms');
    if (!formsJson) {
      console.log('No forms to backup');
      return;
    }

    const forms = JSON.parse(formsJson);
    const result = await GoogleDriveSync.uploadDailyForms(forms);

    if (result.success) {
      this.lastBackupDate = new Date().toDateString();
      localStorage.setItem('last-drive-backup-date', this.lastBackupDate);
      console.log(`Daily backup complete: ${result.uploaded} forms uploaded`);

      // Show notification if available
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('JMart Safety Backup', {
          body: `${result.uploaded} forms backed up to Google Drive`,
          icon: '🛡️'
        });
      }
    }
  },

  // Manual backup trigger
  backupNow: async function() {
    return await this.performBackup();
  },

  stop: function() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      console.log('Daily backup scheduler stopped');
    }
  }
};

// Start the scheduler
DailyBackupScheduler.start();
