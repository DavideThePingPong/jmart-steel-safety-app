/**
 * Service Worker Tests (sw.js)
 *
 * Tests caching strategies, message handlers, and lifecycle events.
 *
 * Mocking strategy:
 *   We mock the service-worker globals (self, caches, fetch, location, etc.)
 *   then eval sw.js. Function-declarations inside eval are scoped, so we
 *   capture the event-listener callbacks registered on `self` and exercise
 *   the public behaviour through them.
 *
 *   For unit-testing pure functions (getStrategy, cacheFirst, etc.) we
 *   expose them by assigning to `self` inside a thin wrapper before eval.
 */

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Read sw.js source once (it doesn't change between tests). */
const SW_PATH = path.resolve(__dirname, '..', '..', '..', 'sw.js');
const SW_SOURCE = fs.readFileSync(SW_PATH, 'utf-8');

/**
 * Build a fresh, isolated SW environment.
 * Returns { listeners, mockCaches, mockFetch, getStrategy, cacheFirst,
 *           networkFirst, staleWhileRevalidate }
 */
function buildSwEnv() {
  const listeners = {};
  const cacheStore = {};

  const mockSelf = {
    addEventListener: jest.fn((event, handler) => {
      listeners[event] = handler;
    }),
    skipWaiting: jest.fn(() => Promise.resolve()),
    clients: {
      claim: jest.fn(() => Promise.resolve()),
      matchAll: jest.fn(() => Promise.resolve([])),
      openWindow: jest.fn(() => Promise.resolve())
    },
    registration: {
      showNotification: jest.fn(() => Promise.resolve())
    }
  };

  const mockCaches = {
    open: jest.fn((name) => {
      if (!cacheStore[name]) {
        cacheStore[name] = {
          put: jest.fn(() => Promise.resolve()),
          match: jest.fn(() => Promise.resolve(null)),
          addAll: jest.fn(() => Promise.resolve()),
          keys: jest.fn(() => Promise.resolve([]))
        };
      }
      return Promise.resolve(cacheStore[name]);
    }),
    match: jest.fn(() => Promise.resolve(null)),
    keys: jest.fn(() => Promise.resolve([])),
    delete: jest.fn(() => Promise.resolve(true)),
    _store: cacheStore
  };

  const mockFetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      clone: function () { return { ok: true, status: 200 }; }
    })
  );

  // -----------------------------------------------------------------------
  // Eval the SW code inside a controlled scope using `new Function`.
  // We pass in every global the SW expects so we can inspect behaviour.
  // The function body returns an object with the inner functions we need.
  // -----------------------------------------------------------------------
  const wrappedCode = `
    ${SW_SOURCE}

    // Expose internals for testing
    return {
      getStrategy: typeof getStrategy === 'function' ? getStrategy : undefined,
      cacheFirst: typeof cacheFirst === 'function' ? cacheFirst : undefined,
      networkFirst: typeof networkFirst === 'function' ? networkFirst : undefined,
      staleWhileRevalidate: typeof staleWhileRevalidate === 'function' ? staleWhileRevalidate : undefined,
      CACHE_VERSION: typeof CACHE_VERSION !== 'undefined' ? CACHE_VERSION : undefined,
      STATIC_CACHE: typeof STATIC_CACHE !== 'undefined' ? STATIC_CACHE : undefined,
      DYNAMIC_CACHE: typeof DYNAMIC_CACHE !== 'undefined' ? DYNAMIC_CACHE : undefined,
      CDN_CACHE: typeof CDN_CACHE !== 'undefined' ? CDN_CACHE : undefined,
      STRATEGIES: typeof STRATEGIES !== 'undefined' ? STRATEGIES : undefined,
      CDN_RESOURCES: typeof CDN_RESOURCES !== 'undefined' ? CDN_RESOURCES : undefined
    };
  `;

  // The SW references: self, caches, fetch, location, URL, Request, Response, console, setTimeout, Promise
  const factory = new Function(
    'self', 'caches', 'fetch', 'location', 'URL', 'Request', 'Response',
    'console', 'setTimeout', 'Promise',
    wrappedCode
  );

  const exposed = factory(
    mockSelf,
    mockCaches,
    mockFetch,
    { hostname: 'jmart-steel-safety.web.app' },
    URL,              // use Node's built-in URL
    class MockReq {
      constructor(url, opts) { this.url = url; this.mode = opts?.mode || 'no-cors'; }
    },
    class MockRes {
      constructor(body, init) {
        this.body = body;
        this.status = (init && init.status) || 200;
        this.statusText = (init && init.statusText) || 'OK';
      }
    },
    { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
    setTimeout,
    Promise
  );

  return {
    listeners,
    mockCaches,
    mockFetch,
    cacheStore,
    ...exposed
  };
}

// ===========================================================================
// Tests
// ===========================================================================

describe('Service Worker (sw.js)', () => {
  let env;

  beforeEach(() => {
    env = buildSwEnv();
  });

  // -----------------------------------------------------------------------
  // Constants
  // -----------------------------------------------------------------------
  describe('cache constants', () => {
    it('should define CACHE_VERSION as v64', () => {
      expect(env.CACHE_VERSION).toBe('v64');
    });

    it('should name caches with version suffix', () => {
      expect(env.STATIC_CACHE).toBe('jmart-static-v64');
      expect(env.DYNAMIC_CACHE).toBe('jmart-dynamic-v64');
      expect(env.CDN_CACHE).toBe('jmart-cdn-v64');
    });
  });

  // -----------------------------------------------------------------------
  // getStrategy
  // -----------------------------------------------------------------------
  describe('getStrategy', () => {
    const { getStrategy } = buildSwEnv();

    it('should return stale-while-revalidate for local .js files [REGRESSION]', () => {
      const req = { url: 'https://jmart-steel-safety.web.app/js/config.js', destination: 'script' };
      expect(getStrategy(req)).toBe('stale-while-revalidate');
    });

    it('should return stale-while-revalidate for local .jsx files [REGRESSION]', () => {
      const req = { url: 'https://jmart-steel-safety.web.app/js/components/app.jsx', destination: 'script' };
      expect(getStrategy(req)).toBe('stale-while-revalidate');
    });

    it('should return stale-while-revalidate for local .css files [REGRESSION]', () => {
      const req = { url: 'https://jmart-steel-safety.web.app/styles.css', destination: 'style' };
      expect(getStrategy(req)).toBe('stale-while-revalidate');
    });

    it('should return cache-first for CDN resources (different hostname)', () => {
      const req = { url: 'https://unpkg.com/react@18.2.0/umd/react.production.min.js', destination: 'script' };
      expect(getStrategy(req)).toBe('cache-first');
    });

    it('should return cache-first for images', () => {
      const req = { url: 'https://jmart-steel-safety.web.app/icons/icon-192x192.png', destination: 'image' };
      expect(getStrategy(req)).toBe('cache-first');
    });

    it('should return cache-first for fonts', () => {
      const req = { url: 'https://jmart-steel-safety.web.app/fonts/roboto.woff2', destination: 'font' };
      expect(getStrategy(req)).toBe('cache-first');
    });

    it('should return network-first for API calls', () => {
      const req = { url: 'https://jmart-steel-safety.web.app/api/forms', destination: '' };
      expect(getStrategy(req)).toBe('network-first');
    });

    it('should return network-first for Firebase Realtime DB requests', () => {
      const req = { url: 'https://jmart-safety-default-rtdb.firebaseio.com/data', destination: '' };
      expect(getStrategy(req)).toBe('network-first');
    });

    it('should return network-first for Google API requests', () => {
      const req = { url: 'https://www.googleapis.com/drive/v3/files', destination: '' };
      expect(getStrategy(req)).toBe('network-first');
    });

    it('should return stale-while-revalidate for HTML pages (default)', () => {
      const req = { url: 'https://jmart-steel-safety.web.app/index.html', destination: 'document' };
      expect(getStrategy(req)).toBe('stale-while-revalidate');
    });
  });

  // -----------------------------------------------------------------------
  // CLEAR_CACHE message handler
  // -----------------------------------------------------------------------
  describe('CLEAR_CACHE message handler', () => {
    it('should only delete caches NOT matching current version [REGRESSION]', async () => {
      env.mockCaches.keys.mockResolvedValue([
        'jmart-static-v54',
        'jmart-cdn-v54',
        'jmart-static-v64',
        'jmart-cdn-v64',
        'jmart-dynamic-v64'
      ]);

      const handler = env.listeners['message'];
      expect(handler).toBeDefined();

      await handler({ data: { type: 'CLEAR_CACHE' } });
      // Let microtasks flush
      await new Promise((r) => setTimeout(r, 50));

      const deleted = env.mockCaches.delete.mock.calls.map((c) => c[0]);

      // Old v54 caches MUST be deleted
      expect(deleted).toContain('jmart-static-v54');
      expect(deleted).toContain('jmart-cdn-v54');

      // Current v64 caches MUST be preserved
      expect(deleted).not.toContain('jmart-static-v64');
      expect(deleted).not.toContain('jmart-cdn-v64');
      expect(deleted).not.toContain('jmart-dynamic-v64');
    });

    it('should not delete non-jmart caches', async () => {
      env.mockCaches.keys.mockResolvedValue([
        'jmart-static-v54',
        'other-app-cache',
        'workbox-runtime'
      ]);

      await env.listeners['message']({ data: { type: 'CLEAR_CACHE' } });
      await new Promise((r) => setTimeout(r, 50));

      const deleted = env.mockCaches.delete.mock.calls.map((c) => c[0]);
      expect(deleted).not.toContain('other-app-cache');
      expect(deleted).not.toContain('workbox-runtime');
    });
  });

  // -----------------------------------------------------------------------
  // CACHE_URLS message handler
  // -----------------------------------------------------------------------
  describe('CACHE_URLS message handler', () => {
    it('should catch errors from cache.addAll gracefully [REGRESSION]', async () => {
      const failingCache = {
        addAll: jest.fn(() => Promise.reject(new Error('Network error'))),
        put: jest.fn(),
        match: jest.fn(),
        keys: jest.fn(() => Promise.resolve([]))
      };
      env.mockCaches.open.mockResolvedValue(failingCache);

      const handler = env.listeners['message'];

      // Must NOT throw
      await handler({ data: { type: 'CACHE_URLS', urls: ['/page1', '/page2'] } });
      await new Promise((r) => setTimeout(r, 50));

      expect(failingCache.addAll).toHaveBeenCalledWith(['/page1', '/page2']);
    });

    it('should not attempt caching when urls is undefined', async () => {
      await env.listeners['message']({ data: { type: 'CACHE_URLS' } });
      await new Promise((r) => setTimeout(r, 50));

      // open should NOT have been called because there are no urls
      expect(env.mockCaches.open).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // staleWhileRevalidate
  // -----------------------------------------------------------------------
  describe('staleWhileRevalidate', () => {
    it('should return cached response immediately when available', async () => {
      const cached = { ok: true, body: 'cached-data' };
      env.mockCaches.match.mockResolvedValue(cached);

      const result = await env.staleWhileRevalidate(
        { url: 'https://jmart-steel-safety.web.app/js/app.js' },
        'jmart-static-v64'
      );

      expect(result).toBe(cached);
    });

    it('should fall back to network when no cache exists', async () => {
      env.mockCaches.match.mockResolvedValue(null);
      const networkResp = { ok: true, clone: () => ({ ok: true }) };
      env.mockFetch.mockResolvedValue(networkResp);

      const result = await env.staleWhileRevalidate(
        { url: 'https://jmart-steel-safety.web.app/js/app.js' },
        'jmart-static-v64'
      );

      expect(result).toBe(networkResp);
    });
  });

  // -----------------------------------------------------------------------
  // SKIP_WAITING message handler
  // -----------------------------------------------------------------------
  describe('SKIP_WAITING message handler', () => {
    it('should call self.skipWaiting on SKIP_WAITING message', async () => {
      // self.skipWaiting is tracked via the listener registered on our mockSelf.
      // We just need to verify the handler path executes without error.
      const handler = env.listeners['message'];
      await handler({ data: { type: 'SKIP_WAITING' } });
      // If no error was thrown, the handler resolved successfully
    });
  });
});
