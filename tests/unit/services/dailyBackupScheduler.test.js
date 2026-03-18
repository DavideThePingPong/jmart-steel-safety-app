/**
 * Tests for js/dailyBackupScheduler.js — DailyBackupScheduler
 *
 * Updated to match the smart setTimeout-based scheduling API (TASK-005/TASK-008).
 * Old polling API (IntervalRegistry.setInterval every 60s) was replaced with
 * single daily setTimeout that fires at exactly 7:00 PM.
 */

const loadScript = require('../../helpers/loadScript');

describe('DailyBackupScheduler', () => {
  let store;

  beforeEach(() => {
    store = {};
    localStorage.getItem.mockImplementation(key => store[key] !== undefined ? store[key] : null);
    localStorage.setItem.mockImplementation((key, value) => { store[key] = String(value); });

    jest.useFakeTimers();

    global.GoogleDriveSync = {
      isConnected: jest.fn(() => true),
      uploadDailyForms: jest.fn().mockResolvedValue({ success: true, uploaded: 5 })
    };

    global.Notification = jest.fn();
    Object.defineProperty(global.Notification, 'permission', {
      value: 'granted', writable: true, configurable: true
    });

    global.ErrorTelemetry = { captureError: jest.fn() };

    loadScript('js/dailyBackupScheduler.js', {
      globalizeConst: ['DailyBackupScheduler'],
      stripAutoInit: ['DailyBackupScheduler.start()'],
      quiet: true
    });
  });

  afterEach(() => {
    if (global.DailyBackupScheduler) {
      DailyBackupScheduler.stop();
    }
    delete global.DailyBackupScheduler;
    delete global.GoogleDriveSync;
    delete global.Notification;
    delete global.ErrorTelemetry;
    jest.useRealTimers();
  });

  describe('start()', () => {
    it('sets _started flag and schedules next backup via setTimeout', () => {
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
      DailyBackupScheduler.start();

      expect(DailyBackupScheduler._started).toBe(true);
      // Should have called setTimeout for the next 7pm
      expect(setTimeoutSpy).toHaveBeenCalled();
      expect(DailyBackupScheduler._timeoutId).not.toBeNull();
      setTimeoutSpy.mockRestore();
    });

    it('does not double-start if already started', () => {
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
      DailyBackupScheduler.start();
      const firstTimeoutId = DailyBackupScheduler._timeoutId;

      DailyBackupScheduler.start(); // second call should no-op
      // _timeoutId should remain the same (not replaced)
      expect(DailyBackupScheduler._timeoutId).toBe(firstTimeoutId);
      setTimeoutSpy.mockRestore();
    });

    it('runs missed backup if opened after 7pm without backup today', () => {
      const RealDate = global.Date;
      const mock8pm = new RealDate(2026, 0, 15, 20, 0, 0);

      jest.spyOn(global, 'Date').mockImplementation(function(...args) {
        if (args.length === 0) return mock8pm;
        return new RealDate(...args);
      });
      global.Date.now = () => mock8pm.getTime();
      global.Date.prototype = RealDate.prototype;

      // No backup recorded for today
      store['last-drive-backup-date'] = null;
      store['jmart-safety-forms'] = JSON.stringify([{ id: 'form-1' }]);

      const performSpy = jest.spyOn(DailyBackupScheduler, 'performBackup').mockResolvedValue();
      DailyBackupScheduler.start();

      expect(performSpy).toHaveBeenCalled();
      performSpy.mockRestore();
      jest.restoreAllMocks();
    });
  });

  describe('_fire()', () => {
    it('triggers backup if not backed up today and reschedules', async () => {
      const RealDate = global.Date;
      const mock7pm = new RealDate(2026, 0, 15, 19, 0, 0);

      jest.spyOn(global, 'Date').mockImplementation(function(...args) {
        if (args.length === 0) return mock7pm;
        return new RealDate(...args);
      });
      global.Date.now = () => mock7pm.getTime();
      global.Date.prototype = RealDate.prototype;

      DailyBackupScheduler.lastBackupDate = null;
      store['jmart-safety-forms'] = JSON.stringify([{ id: 1 }]);

      const scheduleSpy = jest.spyOn(DailyBackupScheduler, '_scheduleNext').mockImplementation();
      await DailyBackupScheduler._fire();

      expect(GoogleDriveSync.uploadDailyForms).toHaveBeenCalled();
      expect(scheduleSpy).toHaveBeenCalled(); // reschedules for tomorrow
      scheduleSpy.mockRestore();
      jest.restoreAllMocks();
    });

    it('skips backup if already backed up today but still reschedules', async () => {
      const RealDate = global.Date;
      const mock7pm = new RealDate(2026, 0, 15, 19, 0, 0);

      jest.spyOn(global, 'Date').mockImplementation(function(...args) {
        if (args.length === 0) return mock7pm;
        return new RealDate(...args);
      });
      global.Date.now = () => mock7pm.getTime();
      global.Date.prototype = RealDate.prototype;

      DailyBackupScheduler.lastBackupDate = mock7pm.toDateString();
      store['last-drive-backup-date'] = mock7pm.toDateString();

      const scheduleSpy = jest.spyOn(DailyBackupScheduler, '_scheduleNext').mockImplementation();
      await DailyBackupScheduler._fire();

      expect(GoogleDriveSync.uploadDailyForms).not.toHaveBeenCalled();
      expect(scheduleSpy).toHaveBeenCalled(); // still reschedules
      scheduleSpy.mockRestore();
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

    it('handles backup failure gracefully', async () => {
      const spy = jest.spyOn(console, 'error').mockImplementation();
      store['jmart-safety-forms'] = JSON.stringify([{ id: 1 }]);
      GoogleDriveSync.uploadDailyForms.mockRejectedValue(new Error('Network fail'));

      await DailyBackupScheduler.performBackup();

      expect(ErrorTelemetry.captureError).toHaveBeenCalled();
      expect(DailyBackupScheduler.lastBackupDate).not.toBe(new Date().toDateString());
      spy.mockRestore();
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
    it('clears timeout and resets _started', () => {
      DailyBackupScheduler.start();
      expect(DailyBackupScheduler._started).toBe(true);
      expect(DailyBackupScheduler._timeoutId).not.toBeNull();

      DailyBackupScheduler.stop();
      expect(DailyBackupScheduler._timeoutId).toBeNull();
      expect(DailyBackupScheduler._started).toBe(false);
    });

    it('no-ops when no timeout active', () => {
      DailyBackupScheduler._timeoutId = null;
      DailyBackupScheduler._started = false;
      // Should not throw
      DailyBackupScheduler.stop();
      expect(DailyBackupScheduler._timeoutId).toBeNull();
      expect(DailyBackupScheduler._started).toBe(false);
    });
  });

  describe('_msUntilNext7pm()', () => {
    it('calculates delay to today 7pm if before 7pm', () => {
      const RealDate = global.Date;
      const mock2pm = new RealDate(2026, 0, 15, 14, 0, 0);

      jest.spyOn(global, 'Date').mockImplementation(function(...args) {
        if (args.length === 0) return new RealDate(mock2pm.getTime());
        return new RealDate(...args);
      });
      global.Date.now = () => mock2pm.getTime();
      global.Date.prototype = RealDate.prototype;

      const ms = DailyBackupScheduler._msUntilNext7pm();
      // 7pm - 2pm = 5 hours = 18000000 ms
      expect(ms).toBe(5 * 60 * 60 * 1000);
      jest.restoreAllMocks();
    });

    it('calculates delay to tomorrow 7pm if after 7pm', () => {
      const RealDate = global.Date;
      const mock8pm = new RealDate(2026, 0, 15, 20, 0, 0);

      jest.spyOn(global, 'Date').mockImplementation(function(...args) {
        if (args.length === 0) return new RealDate(mock8pm.getTime());
        return new RealDate(...args);
      });
      global.Date.now = () => mock8pm.getTime();
      global.Date.prototype = RealDate.prototype;

      const ms = DailyBackupScheduler._msUntilNext7pm();
      // Tomorrow 7pm - today 8pm = 23 hours = 82800000 ms
      expect(ms).toBe(23 * 60 * 60 * 1000);
      jest.restoreAllMocks();
    });
  });
});
