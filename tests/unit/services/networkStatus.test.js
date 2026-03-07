/**
 * Tests for js/networkStatus.js — NetworkStatus
 *
 * Note: setupTests.js already sets navigator.onLine as writable.
 */

const loadScript = require('../../helpers/loadScript');

describe('NetworkStatus', () => {
  let eventListeners;
  let mockIntervalId;

  beforeEach(() => {
    eventListeners = {};
    jest.spyOn(window, 'addEventListener').mockImplementation((event, handler) => {
      eventListeners[event] = eventListeners[event] || [];
      eventListeners[event].push(handler);
    });

    navigator.onLine = true;

    mockIntervalId = 42;
    global.IntervalRegistry = {
      setInterval: jest.fn(() => mockIntervalId),
      clearInterval: jest.fn()
    };

    global.firebaseDb = null;
    global.isFirebaseConfigured = false;

    loadScript('js/networkStatus.js', {
      globalizeConst: ['NetworkStatus'],
      stripAutoInit: ['NetworkStatus.init()'],
      quiet: true
    });
  });

  afterEach(() => {
    delete global.NetworkStatus;
    delete global.IntervalRegistry;
  });

  describe('init()', () => {
    it('registers online and offline listeners', () => {
      NetworkStatus.init();
      expect(window.addEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(window.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
    });

    it('starts heartbeat when online', () => {
      navigator.onLine = true;
      NetworkStatus.init();
      expect(IntervalRegistry.setInterval).toHaveBeenCalledWith(
        expect.any(Function), 60000, 'NetworkHeartbeat'
      );
    });

    it('skips heartbeat when offline', () => {
      navigator.onLine = false;
      NetworkStatus.heartbeatInterval = null;
      NetworkStatus.init();
      expect(NetworkStatus.heartbeatInterval).toBeNull();
    });
  });

  describe('online/offline events', () => {
    beforeEach(() => { NetworkStatus.init(); });

    it('sets flags true on online', () => {
      NetworkStatus.isOnline = false;
      NetworkStatus.isActuallyOnline = false;
      eventListeners['online'][0]();
      expect(NetworkStatus.isOnline).toBe(true);
      expect(NetworkStatus.isActuallyOnline).toBe(true);
    });

    it('sets flags false on offline', () => {
      eventListeners['offline'][0]();
      expect(NetworkStatus.isOnline).toBe(false);
      expect(NetworkStatus.isActuallyOnline).toBe(false);
    });

    it('notifies listeners on online', () => {
      const listener = jest.fn();
      NetworkStatus.listeners = [listener];
      eventListeners['online'][0]();
      expect(listener).toHaveBeenCalledWith(true);
    });

    it('notifies listeners on offline', () => {
      const listener = jest.fn();
      NetworkStatus.listeners = [listener];
      eventListeners['offline'][0]();
      expect(listener).toHaveBeenCalledWith(false);
    });

    it('resets consecutiveFailures on online', () => {
      NetworkStatus.consecutiveFailures = 5;
      eventListeners['online'][0]();
      expect(NetworkStatus.consecutiveFailures).toBe(0);
    });

    it('stops heartbeat on offline', () => {
      NetworkStatus.heartbeatInterval = 99;
      eventListeners['offline'][0]();
      expect(IntervalRegistry.clearInterval).toHaveBeenCalledWith(99);
      expect(NetworkStatus.heartbeatInterval).toBeNull();
    });
  });

  describe('subscribe()', () => {
    it('adds listener and calls immediately', () => {
      NetworkStatus.isActuallyOnline = true;
      const listener = jest.fn();
      NetworkStatus.subscribe(listener);
      expect(listener).toHaveBeenCalledWith(true);
      expect(NetworkStatus.listeners).toContain(listener);
    });

    it('returns unsubscribe function', () => {
      const listener = jest.fn();
      const unsub = NetworkStatus.subscribe(listener);
      unsub();
      expect(NetworkStatus.listeners).not.toContain(listener);
    });
  });

  describe('notifyListeners()', () => {
    it('calls all listeners', () => {
      const l1 = jest.fn(), l2 = jest.fn();
      NetworkStatus.listeners = [l1, l2];
      NetworkStatus.isActuallyOnline = false;
      NetworkStatus.notifyListeners();
      expect(l1).toHaveBeenCalledWith(false);
      expect(l2).toHaveBeenCalledWith(false);
    });
  });

  describe('startHeartbeat()', () => {
    it('registers interval', () => {
      NetworkStatus.heartbeatInterval = null;
      NetworkStatus.startHeartbeat();
      expect(IntervalRegistry.setInterval).toHaveBeenCalledWith(
        expect.any(Function), 60000, 'NetworkHeartbeat'
      );
      expect(NetworkStatus.heartbeatInterval).toBe(mockIntervalId);
    });

    it('skips if already running', () => {
      NetworkStatus.heartbeatInterval = 'existing';
      NetworkStatus.startHeartbeat();
      expect(IntervalRegistry.setInterval).not.toHaveBeenCalled();
    });
  });

  describe('stopHeartbeat()', () => {
    it('clears interval', () => {
      NetworkStatus.heartbeatInterval = 42;
      NetworkStatus.stopHeartbeat();
      expect(IntervalRegistry.clearInterval).toHaveBeenCalledWith(42);
      expect(NetworkStatus.heartbeatInterval).toBeNull();
    });

    it('no-ops when not running', () => {
      NetworkStatus.heartbeatInterval = null;
      NetworkStatus.stopHeartbeat();
      expect(IntervalRegistry.clearInterval).not.toHaveBeenCalled();
    });
  });

  describe('checkHeartbeat()', () => {
    it('skips when offline', async () => {
      navigator.onLine = false;
      await NetworkStatus.checkHeartbeat();
    });

    it('detects lie-fi after consecutive failures', async () => {
      navigator.onLine = true;
      global.firebaseDb = {
        ref: jest.fn(() => ({
          once: jest.fn((_, cb) => cb({ val: () => false })),
          off: jest.fn()
        }))
      };
      global.isFirebaseConfigured = true;

      NetworkStatus.isActuallyOnline = true;
      NetworkStatus.consecutiveFailures = 0;
      const listener = jest.fn();
      NetworkStatus.listeners = [listener];

      await NetworkStatus.checkHeartbeat();
      expect(NetworkStatus.consecutiveFailures).toBe(1);
      expect(NetworkStatus.isActuallyOnline).toBe(true);

      await NetworkStatus.checkHeartbeat();
      expect(NetworkStatus.consecutiveFailures).toBe(2);
      expect(NetworkStatus.isActuallyOnline).toBe(false);
      expect(listener).toHaveBeenCalledWith(false);
    });

    it('restores after successful heartbeat', async () => {
      navigator.onLine = true;
      global.firebaseDb = {
        ref: jest.fn(() => ({
          once: jest.fn((_, cb) => cb({ val: () => true })),
          off: jest.fn()
        }))
      };
      global.isFirebaseConfigured = true;

      NetworkStatus.isActuallyOnline = false;
      NetworkStatus.consecutiveFailures = 3;
      const listener = jest.fn();
      NetworkStatus.listeners = [listener];

      await NetworkStatus.checkHeartbeat();
      expect(NetworkStatus.consecutiveFailures).toBe(0);
      expect(NetworkStatus.isActuallyOnline).toBe(true);
      expect(listener).toHaveBeenCalledWith(true);
    });
  });
});
