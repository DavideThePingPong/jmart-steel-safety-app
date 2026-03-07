/**
 * Tests for js/toastNotifier.js — ToastNotifier
 */

const fs = require('fs');
const path = require('path');

const SCRIPT = path.resolve(__dirname, '..', '..', '..', 'js', 'toastNotifier.js');

function loadToastNotifier() {
  let code = fs.readFileSync(SCRIPT, 'utf-8');
  code = code.replace(/^const ToastNotifier\s*=/m, 'global.ToastNotifier =');
  // Remove everything from "// Auto-initialize" to end of file
  code = code.replace(/\/\/ Auto-initialize when DOM is ready[\s\S]*$/, '');

  // Use new Function to avoid strict mode issues
  const fn = new Function(code);
  fn.call(global);
}

describe('ToastNotifier', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 0));
    loadToastNotifier();
  });

  afterEach(() => {
    delete global.ToastNotifier;
    delete global.requestAnimationFrame;
    document.body.innerHTML = '';
  });

  describe('init()', () => {
    it('creates container element', () => {
      ToastNotifier.container = null;
      ToastNotifier.init();
      expect(ToastNotifier.container).toBeTruthy();
      expect(ToastNotifier.container.id).toBe('jmart-toast-container');
    });

    it('does not create duplicate containers', () => {
      ToastNotifier.init();
      const first = ToastNotifier.container;
      ToastNotifier.init();
      expect(ToastNotifier.container).toBe(first);
    });
  });

  describe('show()', () => {
    beforeEach(() => { ToastNotifier.init(); });

    it('creates toast with message', () => {
      const toast = ToastNotifier.show('success', 'Test message');
      expect(toast).toBeTruthy();
      expect(toast.textContent).toContain('Test message');
    });

    it('handles all types', () => {
      ['success', 'error', 'warning', 'info', 'sync'].forEach(type => {
        ToastNotifier.toasts = [];
        ToastNotifier.container.innerHTML = '';
        const toast = ToastNotifier.show(type, 'msg');
        expect(toast.style.background).toBeTruthy();
      });
    });

    it('adds to toasts array', () => {
      ToastNotifier.show('info', 'test');
      expect(ToastNotifier.toasts).toHaveLength(1);
    });

    it('creates action button', () => {
      const toast = ToastNotifier.show('info', 'test', {
        action: jest.fn(), actionLabel: 'Retry'
      });
      const btn = toast.querySelector('button');
      expect(btn).toBeTruthy();
      expect(btn.textContent).toBe('Retry');
    });

    it('action button triggers callback', () => {
      const action = jest.fn();
      const toast = ToastNotifier.show('info', 'test', { action, actionLabel: 'Go' });
      const btn = toast.querySelector('button');
      btn.onclick({ stopPropagation: jest.fn() });
      expect(action).toHaveBeenCalled();
    });
  });

  describe('dismiss()', () => {
    it('handles null gracefully', () => {
      expect(() => ToastNotifier.dismiss(null)).not.toThrow();
    });

    it('handles detached element', () => {
      expect(() => ToastNotifier.dismiss(document.createElement('div'))).not.toThrow();
    });
  });

  describe('convenience methods', () => {
    beforeEach(() => { ToastNotifier.init(); });

    it.each(['success', 'error', 'warning', 'info', 'sync'])('%s() delegates to show()', (method) => {
      const spy = jest.spyOn(ToastNotifier, 'show');
      ToastNotifier[method]('msg');
      expect(spy).toHaveBeenCalledWith(method, 'msg', undefined);
      spy.mockRestore();
    });
  });

  describe('wireFirebaseSync()', () => {
    it('registers callback', () => {
      global.FirebaseSync = { onSyncStatusChange: jest.fn() };
      ToastNotifier.init();
      ToastNotifier.wireFirebaseSync();
      expect(global.FirebaseSync.onSyncStatusChange).toHaveBeenCalledWith(expect.any(Function));
      delete global.FirebaseSync;
    });

    it('skips when undefined', () => {
      delete global.FirebaseSync;
      expect(() => ToastNotifier.wireFirebaseSync()).not.toThrow();
    });

    it('handles synced status', () => {
      let cb;
      global.FirebaseSync = { onSyncStatusChange: jest.fn(f => { cb = f; }) };
      ToastNotifier.init();
      const spy = jest.spyOn(ToastNotifier, 'success');
      ToastNotifier.wireFirebaseSync();
      cb('synced', { pending: 0 });
      expect(spy).toHaveBeenCalledWith('All forms synced');
      spy.mockRestore();
      delete global.FirebaseSync;
    });

    it('handles error status', () => {
      let cb;
      global.FirebaseSync = { onSyncStatusChange: jest.fn(f => { cb = f; }) };
      ToastNotifier.init();
      const spy = jest.spyOn(ToastNotifier, 'error');
      ToastNotifier.wireFirebaseSync();
      cb('error');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
      delete global.FirebaseSync;
    });

    it('handles failed status with retry', () => {
      let cb;
      global.FirebaseSync = { onSyncStatusChange: jest.fn(f => { cb = f; }), retryAll: jest.fn() };
      ToastNotifier.init();
      const spy = jest.spyOn(ToastNotifier, 'error');
      ToastNotifier.wireFirebaseSync();
      cb('failed');
      expect(spy).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ actionLabel: 'Retry' }));
      spy.mockRestore();
      delete global.FirebaseSync;
    });

    it('handles circuit_open', () => {
      let cb;
      global.FirebaseSync = { onSyncStatusChange: jest.fn(f => { cb = f; }), resetCircuitBreaker: jest.fn() };
      ToastNotifier.init();
      const spy = jest.spyOn(ToastNotifier, 'warning');
      ToastNotifier.wireFirebaseSync();
      cb('circuit_open');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
      delete global.FirebaseSync;
    });

    it('handles circuit_reset', () => {
      let cb;
      global.FirebaseSync = { onSyncStatusChange: jest.fn(f => { cb = f; }) };
      ToastNotifier.init();
      const spy = jest.spyOn(ToastNotifier, 'info');
      ToastNotifier.wireFirebaseSync();
      cb('circuit_reset');
      expect(spy).toHaveBeenCalledWith('Sync resumed');
      spy.mockRestore();
      delete global.FirebaseSync;
    });
  });

  describe('wireStorageQuota()', () => {
    it('registers callback', () => {
      global.StorageQuotaManager = { onStorageChange: jest.fn() };
      ToastNotifier.init();
      ToastNotifier.wireStorageQuota();
      expect(global.StorageQuotaManager.onStorageChange).toHaveBeenCalled();
      delete global.StorageQuotaManager;
    });

    it('skips when undefined', () => {
      delete global.StorageQuotaManager;
      expect(() => ToastNotifier.wireStorageQuota()).not.toThrow();
    });

    it('shows error on quota_exceeded', () => {
      let cb;
      global.StorageQuotaManager = { onStorageChange: jest.fn(f => { cb = f; }) };
      ToastNotifier.init();
      const spy = jest.spyOn(ToastNotifier, 'error');
      ToastNotifier.wireStorageQuota();
      cb({ error: 'quota_exceeded' });
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('Storage full'), expect.any(Object));
      spy.mockRestore();
      delete global.StorageQuotaManager;
    });
  });

  describe('wireNetworkStatus()', () => {
    it('registers callback', () => {
      global.NetworkStatus = { subscribe: jest.fn() };
      ToastNotifier.init();
      ToastNotifier.wireNetworkStatus();
      expect(global.NetworkStatus.subscribe).toHaveBeenCalled();
      delete global.NetworkStatus;
    });

    it('shows warning when offline', () => {
      let cb;
      global.NetworkStatus = { subscribe: jest.fn(f => { cb = f; }) };
      ToastNotifier.init();
      const spy = jest.spyOn(ToastNotifier, 'warning');
      ToastNotifier.wireNetworkStatus();
      cb(false);
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('Offline'));
      spy.mockRestore();
      delete global.NetworkStatus;
    });

    it('shows success when back online', () => {
      let cb;
      global.NetworkStatus = { subscribe: jest.fn(f => { cb = f; }) };
      ToastNotifier.init();
      const spy = jest.spyOn(ToastNotifier, 'success');
      ToastNotifier.wireNetworkStatus();
      cb(false);
      cb(true);
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('Back online'));
      spy.mockRestore();
      delete global.NetworkStatus;
    });
  });

  describe('wireAll()', () => {
    it('calls all wire methods', () => {
      const s1 = jest.spyOn(ToastNotifier, 'wireFirebaseSync').mockImplementation();
      const s2 = jest.spyOn(ToastNotifier, 'wireStorageQuota').mockImplementation();
      const s3 = jest.spyOn(ToastNotifier, 'wireNetworkStatus').mockImplementation();
      ToastNotifier.wireAll();
      expect(s1).toHaveBeenCalled();
      expect(s2).toHaveBeenCalled();
      expect(s3).toHaveBeenCalled();
      s1.mockRestore(); s2.mockRestore(); s3.mockRestore();
    });
  });
});
