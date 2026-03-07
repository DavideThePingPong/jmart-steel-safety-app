/**
 * Tests for js/dailyBackupScheduler.js — DailyBackupScheduler
 *
 * Note: setupTests.js provides jest.fn() mocks for localStorage.
 */

const loadScript = require('../../helpers/loadScript');

describe('DailyBackupScheduler', () => {
  let mockIntervalId;
  let store;

  beforeEach(() => {
    store = {};
    localStorage.getItem.mockImplementation(key => store[key] !== undefined ? store[key] : null);
    localStorage.setItem.mockImplementation((key, value) => { store[key] = String(value); });

    mockIntervalId = 77;
    global.IntervalRegistry = {
      setInterval: jest.fn(() => mockIntervalId),
      clearInterval: jest.fn()
    };

    global.GoogleDriveSync = {
      isConnected: jest.fn(() => true),
      uploadDailyForms: jest.fn().mockResolvedValue({ success: true, uploaded: 5 })
    };

    global.Notification = jest.fn();
    Object.defineProperty(global.Notification, 'permission', {
      value: 'granted', writable: true, configurable: true
    });

    loadScript('js/dailyBackupScheduler.js', {
      globalizeConst: ['DailyBackupScheduler'],
      stripAutoInit: ['DailyBackupScheduler.start()'],
      quiet: true
    });
  });

  afterEach(() => {
    delete global.DailyBackupScheduler;
    delete global.IntervalRegistry;
    delete global.GoogleDriveSync;
    delete global.Notification;
  });

  describe('start()', () => {
    it('registers 60s interval', () => {
      DailyBackupScheduler.start();
      expect(IntervalRegistry.setInterval).toHaveBeenCalledWith(
        expect.any(Function), 60000, 'DailyBackupScheduler'
      );
      expect(DailyBackupScheduler.checkInterval).toBe(mockIntervalId);
    });
  });

  describe('checkAndBackup()', () => {
    it('triggers at 7pm if not backed up today', async () => {
      const RealDate = global.Date;
      const mock7pm = new RealDate(2026, 0, 15, 19, 30, 0);
      jest.spyOn(global, 'Date').mockImplementation(function() { return mock7pm; });
      global.Date.now = RealDate.now;

      DailyBackupScheduler.lastBackupDate = null;
      store['jmart-safety-forms'] = JSON.stringify([{ id: 1 }]);

      await DailyBackupScheduler.checkAndBackup();
      expect(GoogleDriveSync.uploadDailyForms).toHaveBeenCalled();
      jest.restoreAllMocks();
    });

    it('skips if already backed up today', async () => {
      const RealDate = global.Date;
      const mock7pm = new RealDate(2026, 0, 15, 19, 0, 0);
      jest.spyOn(global, 'Date').mockImplementation(function() { return mock7pm; });
      global.Date.now = RealDate.now;

      DailyBackupScheduler.lastBackupDate = mock7pm.toDateString();
      await DailyBackupScheduler.checkAndBackup();
      expect(GoogleDriveSync.uploadDailyForms).not.toHaveBeenCalled();
      jest.restoreAllMocks();
    });

    it('skips outside 7pm', async () => {
      const RealDate = global.Date;
      const mock2pm = new RealDate(2026, 0, 15, 14, 0, 0);
      jest.spyOn(global, 'Date').mockImplementation(function() { return mock2pm; });
      global.Date.now = RealDate.now;

      DailyBackupScheduler.lastBackupDate = null;
      await DailyBackupScheduler.checkAndBackup();
      expect(GoogleDriveSync.uploadDailyForms).not.toHaveBeenCalled();
      jest.restoreAllMocks();
    });
  });

  describe('performBackup()', () => {
    it('skips when Drive not connected', async () => {
      GoogleDriveSync.isConnected.mockReturnValue(false);
      await DailyBackupScheduler.performBackup();
      expect(GoogleDriveSync.uploadDailyForms).not.toHaveBeenCalled();
    });

    it('skips when no forms', async () => {
      await DailyBackupScheduler.performBackup();
      expect(GoogleDriveSync.uploadDailyForms).not.toHaveBeenCalled();
    });

    it('skips empty forms array', async () => {
      store['jmart-safety-forms'] = '[]';
      await DailyBackupScheduler.performBackup();
      expect(GoogleDriveSync.uploadDailyForms).not.toHaveBeenCalled();
    });

    it('handles corrupt JSON', async () => {
      const spy = jest.spyOn(console, 'error').mockImplementation();
      store['jmart-safety-forms'] = 'not-json';
      await DailyBackupScheduler.performBackup();
      expect(GoogleDriveSync.uploadDailyForms).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it('uploads and records date on success', async () => {
      const forms = [{ id: 1 }, { id: 2 }];
      store['jmart-safety-forms'] = JSON.stringify(forms);
      await DailyBackupScheduler.performBackup();
      expect(GoogleDriveSync.uploadDailyForms).toHaveBeenCalledWith(forms);
      expect(DailyBackupScheduler.lastBackupDate).toBeTruthy();
      expect(store['last-drive-backup-date']).toBeTruthy();
    });

    it('shows Notification on success', async () => {
      store['jmart-safety-forms'] = JSON.stringify([{ id: 1 }]);
      await DailyBackupScheduler.performBackup();
      expect(Notification).toHaveBeenCalledWith('JMart Safety Backup', expect.objectContaining({
        body: expect.stringContaining('5 forms backed up')
      }));
    });
  });

  describe('backupNow()', () => {
    it('delegates to performBackup', async () => {
      const spy = jest.spyOn(DailyBackupScheduler, 'performBackup').mockResolvedValue();
      await DailyBackupScheduler.backupNow();
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('stop()', () => {
    it('clears interval', () => {
      DailyBackupScheduler.checkInterval = 42;
      DailyBackupScheduler.stop();
      expect(IntervalRegistry.clearInterval).toHaveBeenCalledWith(42);
      expect(DailyBackupScheduler.checkInterval).toBeNull();
    });

    it('no-ops when no interval', () => {
      DailyBackupScheduler.checkInterval = null;
      DailyBackupScheduler.stop();
      expect(IntervalRegistry.clearInterval).not.toHaveBeenCalled();
    });
  });
});
