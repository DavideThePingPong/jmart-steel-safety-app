/**
 * Tests for js/errorTelemetry.js — ErrorTelemetry service
 *
 * Tests: ring buffer, global handlers, toast rate limiting,
 * localStorage persistence, Firebase sync, health status.
 */

const loadScript = require('../../helpers/loadScript');

describe('ErrorTelemetry', () => {
  let store;
  let mockFirebaseSet;

  beforeEach(() => {
    jest.useFakeTimers();

    store = {};
    localStorage.getItem.mockImplementation(key => store[key] !== undefined ? store[key] : null);
    localStorage.setItem.mockImplementation((key, value) => { store[key] = String(value); });

    // Firebase mocks
    mockFirebaseSet = jest.fn().mockResolvedValue(undefined);
    global.firebaseDb = { ref: jest.fn(() => ({ set: mockFirebaseSet })) };
    global.isFirebaseConfigured = true;
    global.DeviceAuthManager = { deviceId: 'test-device-123' };

    // ToastNotifier mock
    global.ToastNotifier = { error: jest.fn(), warning: jest.fn(), info: jest.fn() };

    // FirebaseSync mock
    global.FirebaseSync = { circuitOpen: false, getPendingCount: jest.fn(() => 0) };

    // IntervalRegistry mock (optional)
    global.IntervalRegistry = {
      setTimeout: jest.fn((fn, delay) => setTimeout(fn, delay))
    };

    // Clean window.__appErrors
    window.__appErrors = [];

    loadScript('js/errorTelemetry.js', {
      globalizeConst: ['ErrorTelemetry'],
      stripAutoInit: ['ErrorTelemetry.init()'],
      quiet: true
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    delete global.ErrorTelemetry;
    delete global.firebaseDb;
    delete global.isFirebaseConfigured;
    delete global.DeviceAuthManager;
    delete global.ToastNotifier;
    delete global.FirebaseSync;
    delete global.IntervalRegistry;
    window.__appErrors = [];
    window.onerror = null;
    window.onunhandledrejection = null;
  });

  // =========================================================================
  // Initialization
  // =========================================================================
  describe('init()', () => {
    it('should initialize without errors', () => {
      expect(() => ErrorTelemetry.init()).not.toThrow();
    });

    it('should only initialize once (idempotent)', () => {
      ErrorTelemetry.init();
      const handlerBefore = window.onerror;
      ErrorTelemetry.init(); // second call
      expect(window.onerror).toBe(handlerBefore);
    });

    it('should import bootstrap errors from window.__appErrors', () => {
      window.__appErrors = [
        { msg: 'Boot error 1', src: 'boot.js', stack: '', ts: 1000 },
        { msg: 'Boot error 2', src: 'init.js', stack: 'stack trace', ts: 2000 }
      ];
      ErrorTelemetry.init();
      expect(ErrorTelemetry.getErrorCount()).toBe(2);
      const recent = ErrorTelemetry.getRecentErrors(5);
      expect(recent[0].message).toBe('Boot error 2');
      expect(recent[1].message).toBe('Boot error 1');
    });

    it('should clear window.__appErrors after import', () => {
      window.__appErrors = [{ msg: 'test', src: '', stack: '', ts: 1000 }];
      ErrorTelemetry.init();
      expect(window.__appErrors).toEqual([]);
    });

    it('should load persisted errors from localStorage', () => {
      store['jmart-error-log'] = JSON.stringify([
        { message: 'Saved error', context: 'test', timestamp: 5000 }
      ]);
      ErrorTelemetry.init();
      expect(ErrorTelemetry.getErrorCount()).toBe(1);
    });

    it('should handle corrupt localStorage gracefully', () => {
      store['jmart-error-log'] = 'not-json!!!';
      expect(() => ErrorTelemetry.init()).not.toThrow();
      expect(ErrorTelemetry.getErrorCount()).toBe(0);
    });

    it('should install global error handler via addEventListener', () => {
      const spy = jest.spyOn(window, 'addEventListener');
      ErrorTelemetry.init();
      expect(spy).toHaveBeenCalledWith('error', expect.any(Function));
      spy.mockRestore();
    });

    it('should install unhandledrejection handler via addEventListener', () => {
      const spy = jest.spyOn(window, 'addEventListener');
      ErrorTelemetry.init();
      expect(spy).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
      spy.mockRestore();
    });
  });

  // =========================================================================
  // captureError
  // =========================================================================
  describe('captureError()', () => {
    beforeEach(() => ErrorTelemetry.init());

    it('should capture a string error', () => {
      ErrorTelemetry.captureError('Something went wrong', 'test-context');
      expect(ErrorTelemetry.getErrorCount()).toBe(1);
      const recent = ErrorTelemetry.getRecentErrors(1);
      expect(recent[0].message).toBe('Something went wrong');
      expect(recent[0].context).toBe('test-context');
    });

    it('should capture an Error instance', () => {
      const err = new Error('Test error message');
      ErrorTelemetry.captureError(err, 'error-instance');
      const recent = ErrorTelemetry.getRecentErrors(1);
      expect(recent[0].message).toBe('Test error message');
      expect(recent[0].context).toBe('error-instance');
      expect(recent[0].stack.length).toBeGreaterThan(0);
    });

    it('should capture an object error', () => {
      ErrorTelemetry.captureError({ message: 'Object error', source: 'api', context: 'fetch' });
      const recent = ErrorTelemetry.getRecentErrors(1);
      expect(recent[0].message).toBe('Object error');
      expect(recent[0].source).toBe('api');
    });

    it('should capture non-string/non-object values', () => {
      ErrorTelemetry.captureError(42, 'number-error');
      const recent = ErrorTelemetry.getRecentErrors(1);
      expect(recent[0].message).toBe('42');
    });

    it('should add timestamp to entries', () => {
      const before = Date.now();
      ErrorTelemetry.captureError('Timestamped', 'test');
      const recent = ErrorTelemetry.getRecentErrors(1);
      expect(recent[0].timestamp).toBeGreaterThanOrEqual(before);
    });

    it('should persist to localStorage after capture', () => {
      ErrorTelemetry.captureError('persist me', 'test');
      expect(store['jmart-error-log']).toBeDefined();
      const saved = JSON.parse(store['jmart-error-log']);
      expect(saved.length).toBe(1);
      expect(saved[0].message).toBe('persist me');
    });
  });

  // =========================================================================
  // Ring buffer
  // =========================================================================
  describe('Ring buffer', () => {
    beforeEach(() => ErrorTelemetry.init());

    it('should cap at MAX_MEMORY (50) errors', () => {
      for (let i = 0; i < 60; i++) {
        ErrorTelemetry.captureError('Error ' + i, 'test');
      }
      expect(ErrorTelemetry.getErrorCount()).toBe(50);
    });

    it('should keep the most recent errors when buffer overflows', () => {
      for (let i = 0; i < 60; i++) {
        ErrorTelemetry.captureError('Error ' + i, 'test');
      }
      const recent = ErrorTelemetry.getRecentErrors(1);
      expect(recent[0].message).toBe('Error 59');
    });

    it('should save only MAX_LOCAL (20) errors to localStorage', () => {
      for (let i = 0; i < 30; i++) {
        ErrorTelemetry.captureError('Error ' + i, 'test');
      }
      const saved = JSON.parse(store['jmart-error-log']);
      expect(saved.length).toBe(20);
    });
  });

  // =========================================================================
  // Toast rate limiting
  // =========================================================================
  describe('Toast rate limiting', () => {
    beforeEach(() => ErrorTelemetry.init());

    it('should show toast on first error', () => {
      ErrorTelemetry.captureError('First error', 'test');
      expect(ToastNotifier.error).toHaveBeenCalledWith('First error');
    });

    it('should suppress toast within cooldown window (10s)', () => {
      ErrorTelemetry.captureError('Error 1', 'test');
      ToastNotifier.error.mockClear();

      // Advance 5 seconds (within cooldown)
      jest.advanceTimersByTime(5000);
      ErrorTelemetry.captureError('Error 2', 'test');
      expect(ToastNotifier.error).not.toHaveBeenCalled();
    });

    it('should show toast again after cooldown expires', () => {
      ErrorTelemetry.captureError('Error 1', 'test');
      ToastNotifier.error.mockClear();

      // Advance past 10s cooldown
      jest.advanceTimersByTime(11000);
      ErrorTelemetry.captureError('Error 2', 'test');
      expect(ToastNotifier.error).toHaveBeenCalledWith('Error 2');
    });

    it('should not throw if ToastNotifier is undefined', () => {
      delete global.ToastNotifier;
      expect(() => ErrorTelemetry.captureError('No toast', 'test')).not.toThrow();
    });
  });

  // =========================================================================
  // Firebase sync
  // =========================================================================
  describe('Firebase sync', () => {
    beforeEach(() => ErrorTelemetry.init());

    it('should schedule Firebase sync on capture', () => {
      ErrorTelemetry.captureError('Sync me', 'test');
      expect(ErrorTelemetry._pendingSyncBatch.length).toBeGreaterThanOrEqual(0);
      // Timer should have been scheduled
      expect(IntervalRegistry.setTimeout).toHaveBeenCalled();
    });

    it('should batch errors and sync after cooldown', () => {
      ErrorTelemetry.captureError('Error A', 'test');
      ErrorTelemetry.captureError('Error B', 'test');

      // Advance to trigger sync
      jest.advanceTimersByTime(31000);

      expect(firebaseDb.ref).toHaveBeenCalled();
      expect(mockFirebaseSet).toHaveBeenCalled();

      // Verify payload shape
      const payload = mockFirebaseSet.mock.calls[0][0];
      expect(payload.device).toBe('test-device-123');
      expect(payload.count).toBe(2);
      expect(payload.errors).toHaveLength(2);
    });

    it('should skip Firebase sync if not configured', () => {
      global.isFirebaseConfigured = false;
      ErrorTelemetry.captureError('No firebase', 'test');
      jest.advanceTimersByTime(31000);
      expect(mockFirebaseSet).not.toHaveBeenCalled();
    });

    it('should not throw if Firebase write fails', () => {
      mockFirebaseSet.mockImplementation(() => { throw new Error('Firebase down'); });
      ErrorTelemetry.captureError('Firebase fail', 'test');
      expect(() => jest.advanceTimersByTime(31000)).not.toThrow();
    });
  });

  // =========================================================================
  // Global handlers
  // =========================================================================
  describe('Global handlers', () => {
    beforeEach(() => ErrorTelemetry.init());

    it('error event listener should capture errors', () => {
      const evt = new ErrorEvent('error', { message: 'Test error', filename: 'app.js', lineno: 10, colno: 5, error: new Error('Test') });
      window.dispatchEvent(evt);
      expect(ErrorTelemetry.getErrorCount()).toBe(1);
      const recent = ErrorTelemetry.getRecentErrors(1);
      expect(recent[0].message).toBe('Test error');
      expect(recent[0].source).toContain('app.js');
    });

    it('error event listener should capture errors without error object', () => {
      const evt = new ErrorEvent('error', { message: 'Test', filename: 'file.js', lineno: 1, colno: 1 });
      window.dispatchEvent(evt);
      expect(ErrorTelemetry.getErrorCount()).toBe(1);
    });

    it('unhandledrejection listener should capture promise errors', () => {
      const evt = new Event('unhandledrejection');
      evt.reason = new Error('Promise failed');
      window.dispatchEvent(evt);
      expect(ErrorTelemetry.getErrorCount()).toBe(1);
      const recent = ErrorTelemetry.getRecentErrors(1);
      expect(recent[0].message).toContain('Promise failed');
      expect(recent[0].context).toBe('unhandled-rejection');
    });

    it('unhandledrejection listener should handle non-Error reasons', () => {
      const evt = new Event('unhandledrejection');
      evt.reason = 'string rejection';
      window.dispatchEvent(evt);
      const recent = ErrorTelemetry.getRecentErrors(1);
      expect(recent[0].message).toContain('string rejection');
    });
  });

  // =========================================================================
  // Health status
  // =========================================================================
  describe('getHealth()', () => {
    beforeEach(() => ErrorTelemetry.init());

    it('should return healthy when no errors', () => {
      const health = ErrorTelemetry.getHealth();
      expect(health.status).toBe('healthy');
      expect(health.errorsLastHour).toBe(0);
      expect(health.totalErrors).toBe(0);
    });

    it('should return degraded when 5+ errors in last hour', () => {
      for (let i = 0; i < 5; i++) {
        ErrorTelemetry.captureError('Error ' + i, 'test');
      }
      const health = ErrorTelemetry.getHealth();
      expect(health.status).toBe('degraded');
      expect(health.errorsLastHour).toBe(5);
    });

    it('should return critical when 21+ errors in last hour', () => {
      for (let i = 0; i < 21; i++) {
        ErrorTelemetry.captureError('Error ' + i, 'test');
      }
      const health = ErrorTelemetry.getHealth();
      expect(health.status).toBe('critical');
    });

    it('should return critical when circuit breaker is open', () => {
      FirebaseSync.circuitOpen = true;
      const health = ErrorTelemetry.getHealth();
      expect(health.status).toBe('critical');
      expect(health.circuitBreakerState).toBe('open');
    });

    it('should include sync queue size from FirebaseSync', () => {
      FirebaseSync.getPendingCount.mockReturnValue(7);
      const health = ErrorTelemetry.getHealth();
      expect(health.syncQueueSize).toBe(7);
    });

    it('should include last sync time from localStorage', () => {
      const syncTime = Date.now() - 60000;
      store['jmart-last-sync'] = String(syncTime);
      const health = ErrorTelemetry.getHealth();
      expect(health.lastSyncTime).toBe(syncTime);
    });

    it('should include totalErrors count', () => {
      ErrorTelemetry.captureError('E1', 'test');
      ErrorTelemetry.captureError('E2', 'test');
      const health = ErrorTelemetry.getHealth();
      expect(health.totalErrors).toBe(2);
    });
  });

  // =========================================================================
  // getRecentErrors
  // =========================================================================
  describe('getRecentErrors()', () => {
    beforeEach(() => ErrorTelemetry.init());

    it('should return errors in reverse chronological order', () => {
      ErrorTelemetry.captureError('First', 'test');
      ErrorTelemetry.captureError('Second', 'test');
      ErrorTelemetry.captureError('Third', 'test');
      const recent = ErrorTelemetry.getRecentErrors(3);
      expect(recent[0].message).toBe('Third');
      expect(recent[1].message).toBe('Second');
      expect(recent[2].message).toBe('First');
    });

    it('should respect the limit parameter', () => {
      for (let i = 0; i < 10; i++) {
        ErrorTelemetry.captureError('Error ' + i, 'test');
      }
      expect(ErrorTelemetry.getRecentErrors(3)).toHaveLength(3);
    });

    it('should default to 20 when no limit given', () => {
      for (let i = 0; i < 25; i++) {
        ErrorTelemetry.captureError('Error ' + i, 'test');
      }
      expect(ErrorTelemetry.getRecentErrors()).toHaveLength(20);
    });

    it('should return empty array when no errors', () => {
      expect(ErrorTelemetry.getRecentErrors()).toEqual([]);
    });
  });

  // =========================================================================
  // Edge cases
  // =========================================================================
  describe('Edge cases', () => {
    it('should work without FirebaseSync defined', () => {
      delete global.FirebaseSync;
      ErrorTelemetry.init();
      expect(() => ErrorTelemetry.getHealth()).not.toThrow();
      const health = ErrorTelemetry.getHealth();
      expect(health.circuitBreakerState).toBe('closed');
      expect(health.syncQueueSize).toBe(0);
    });

    it('should work without DeviceAuthManager', () => {
      delete global.DeviceAuthManager;
      ErrorTelemetry.init();
      ErrorTelemetry.captureError('No device', 'test');
      jest.advanceTimersByTime(31000);
      const payload = mockFirebaseSet.mock.calls[0][0];
      expect(payload.device).toBe('unknown');
    });

    it('should handle localStorage.setItem failure gracefully', () => {
      localStorage.setItem.mockImplementation(() => { throw new Error('Quota exceeded'); });
      ErrorTelemetry.init();
      expect(() => ErrorTelemetry.captureError('Storage full', 'test')).not.toThrow();
      expect(ErrorTelemetry.getErrorCount()).toBe(1);
    });

    it('should work without IntervalRegistry', () => {
      delete global.IntervalRegistry;
      ErrorTelemetry.init();
      expect(() => ErrorTelemetry.captureError('No registry', 'test')).not.toThrow();
    });
  });
});
