/**
 * JMart Steel Safety - Service Worker v4
 * IMPROVEMENTS:
 * - Stale-while-revalidate for better UX
 * - Proper versioned cache management
 * - All critical CDN resources cached (including Babel)
 * - Background sync for form submissions
 * - Better error recovery
 * - v4: Pinned CDN versions (supply-chain hardening)
 */

const CACHE_VERSION = 'v54';
const STATIC_CACHE = `jmart-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `jmart-dynamic-${CACHE_VERSION}`;
const CDN_CACHE = `jmart-cdn-${CACHE_VERSION}`;

const OFFLINE_URL = 'offline.html';

// Static files to pre-cache (app shell)
const STATIC_FILES = [
  './',
  './index.html',
  './js/config.js',
  './js/deviceAuth.js',
  './js/googleDriveConfig.js',
  './js/googleDriveSync.js',
  './js/dailyBackupScheduler.js',
  './js/intervalRegistry.js',
  './js/storageQuotaManager.js',
  './js/auditLogManager.js',
  './js/firebaseSync.js',
  './js/jobsManager.js',
  './js/deviceAuthManager.js',
  './js/photoUploadManager.js',
  './js/offlinePhotoQueue.js',
  './js/networkStatus.js',
  './js/pdfConfig.js',
  './js/pdfGenerator.js',
  './js/trainingCourseData.js',
  './js/trainingCertGenerator.js',
  './js/formValidator.js',
  './js/formConstants.js',
  './js/toastNotifier.js',
  './js/components/shared.jsx',
  './js/components/hooks.jsx',
  './js/components/modals.jsx',
  './js/components/auth.jsx',
  './js/components/app.jsx',
  './js/components/dashboard.jsx',
  './js/components/training.jsx',
  './js/components/form-prestart.jsx',
  './js/components/form-incident.jsx',
  './js/components/form-toolbox.jsx',
  './js/components/form-inspection.jsx',
  './js/components/form-itp.jsx',
  './js/components/form-steel-itp.jsx',
  './js/components/view-emergency.jsx',
  './js/components/view-settings.jsx',
  './js/components/view-recordings.jsx',
  './js/components/bootstrap.jsx',
  './manifest.json',
  './offline.html',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  './icons/apple-touch-icon-120x120.png',
  './icons/apple-touch-icon-152x152.png',
  './icons/apple-touch-icon-167x167.png',
  './icons/apple-touch-icon-180x180.png'
];

// Critical CDN resources - ALL must be cached for offline
const CDN_RESOURCES = [
  // React (CRITICAL — pinned versions)
  'https://unpkg.com/react@18.2.0/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18.2.0/umd/react-dom.production.min.js',

  // Babel (CRITICAL — app fails without this, pinned version)
  'https://unpkg.com/@babel/standalone@7.24.0/babel.min.js',

  // Icons (pinned version — was @latest which is a supply-chain risk)
  'https://unpkg.com/lucide@0.344.0/dist/umd/lucide.min.js',

  // PDF generation
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',

  // Firebase
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-database-compat.js',

  // Babel fallback CDN (different path than primary)
  'https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.24.0/babel.min.js',

  // Google Identity Services
  'https://accounts.google.com/gsi/client'
];

// Cache strategies
const STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate'
};

/**
 * Determine caching strategy based on request
 */
function getStrategy(request) {
  const url = new URL(request.url);

  // API calls - network first
  if (url.pathname.includes('/api/') ||
      url.hostname.includes('googleapis.com') ||
      url.hostname.includes('firebaseio.com')) {
    return STRATEGIES.NETWORK_FIRST;
  }

  // CDN resources — cache-first for reliability (CDN versions are pinned, no freshness needed)
  if (url.hostname !== location.hostname) {
    return STRATEGIES.CACHE_FIRST;
  }

  // Static assets - cache first
  if (request.destination === 'image' ||
      request.destination === 'font' ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.css')) {
    return STRATEGIES.CACHE_FIRST;
  }

  // HTML pages - stale while revalidate
  return STRATEGIES.STALE_WHILE_REVALIDATE;
}

/**
 * Cache-first strategy
 */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  // Cache miss — fetch from network
  // Use a fresh Request with cors mode for CDN resources to avoid opaque response issues
  try {
    const url = request.url;
    const isCDN = CDN_RESOURCES.some(cdn => url === cdn || url.startsWith(cdn.split('?')[0]));
    const fetchRequest = isCDN ? new Request(url, { mode: 'cors' }) : request;
    const response = await fetch(fetchRequest);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.warn('[SW] cacheFirst network fetch failed for:', request.url, error.message);
    // For CDN scripts, return a more helpful error instead of generic 503
    // so the page's fallback logic can handle it
    if (request.mode === 'navigate') {
      return caches.match(OFFLINE_URL);
    }
    // Don't throw — return a proper error response so the page can handle gracefully
    return new Response('', { status: 504, statusText: 'CDN Unavailable' });
  }
}

/**
 * Network-first strategy
 */
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    if (request.mode === 'navigate') {
      return caches.match(OFFLINE_URL);
    }
    throw error;
  }
}

/**
 * Stale-while-revalidate strategy
 * Returns cached immediately, updates cache in background
 */
async function staleWhileRevalidate(request, cacheName) {
  const cached = await caches.match(request);

  // Start network fetch in background
  const fetchPromise = fetch(request).then(async (response) => {
    if (response.ok) {
      const cache = await caches.open(cacheName);
      await cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);

  // Return cached immediately if available
  if (cached) {
    return cached;
  }

  // No cache, wait for network
  const response = await fetchPromise;
  if (response) {
    return response;
  }

  // Offline fallback
  if (request.mode === 'navigate') {
    return caches.match(OFFLINE_URL);
  }

  throw new Error('No cached version and network unavailable');
}

// ===========================================
// SERVICE WORKER LIFECYCLE
// ===========================================

/**
 * Install event - pre-cache critical resources
 */
self.addEventListener('install', (event) => {
  console.log('[SW v4] Installing...');

  event.waitUntil(
    Promise.all([
      // Cache static files
      caches.open(STATIC_CACHE).then(async (cache) => {
        console.log('[SW v4] Caching static files');
        for (const file of STATIC_FILES) {
          try {
            // Use cache:'reload' to bypass browser HTTP cache on install
            // This ensures the SW always caches the latest deployed version
            const response = await fetch(file, { cache: 'reload' });
            if (response.ok) {
              await cache.put(file, response);
            }
          } catch (e) {
            console.warn(`[SW v4] Failed to cache: ${file}`, e);
          }
        }
      }),

      // Cache CDN resources (CRITICAL — retry up to 2 times on failure)
      caches.open(CDN_CACHE).then(async (cache) => {
        console.log('[SW v4] Caching CDN resources');
        for (const url of CDN_RESOURCES) {
          let cached = false;
          for (let attempt = 0; attempt < 3 && !cached; attempt++) {
            try {
              if (attempt > 0) {
                await new Promise(r => setTimeout(r, 1000 * attempt)); // backoff
                console.log(`[SW v4] Retry ${attempt} for: ${url}`);
              }
              const response = await fetch(url, { mode: 'cors' });
              if (response.ok) {
                await cache.put(url, response);
                console.log(`[SW v4] Cached: ${url}`);
                cached = true;
              }
            } catch (e) {
              console.warn(`[SW v4] Attempt ${attempt + 1} failed for CDN: ${url}`, e.message);
            }
          }
          if (!cached) {
            console.error(`[SW v4] CRITICAL: Failed to cache CDN after 3 attempts: ${url}`);
          }
        }
      })
    ]).then(() => {
      console.log('[SW v4] Install complete');
      return self.skipWaiting();
    })
  );
});

/**
 * Activate event - clean old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[SW v4] Activating...');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            // Delete old version caches
            return name.startsWith('jmart-') && !name.endsWith(CACHE_VERSION);
          })
          .map((name) => {
            console.log('[SW v4] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(async () => {
      console.log('[SW v4] Activation complete');
      await self.clients.claim();

      // Verify CDN cache is populated — if empty, repopulate (handles cache-clear scenarios)
      try {
        const cdnCache = await caches.open(CDN_CACHE);
        const firstCDN = await cdnCache.match(CDN_RESOURCES[0]);
        if (!firstCDN) {
          console.warn('[SW v4] CDN cache empty after activation — repopulating');
          for (const url of CDN_RESOURCES) {
            try {
              const response = await fetch(url, { mode: 'cors' });
              if (response.ok) {
                await cdnCache.put(url, response);
              }
            } catch (e) {
              console.warn('[SW v4] CDN repopulate failed:', url, e.message);
            }
          }
          // Notify clients to reload with fresh cache
          const clients = await self.clients.matchAll();
          clients.forEach(client => client.postMessage({ type: 'CDN_RECACHED' }));
        }
      } catch (e) {
        console.error('[SW v4] CDN cache verification failed:', e);
      }
    })
  );
});

/**
 * Fetch event - serve with appropriate strategy
 */
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip chrome-extension and other non-http(s) requests
  if (!event.request.url.startsWith('http')) return;

  // NEVER intercept reset.html — it must always load fresh from network
  if (event.request.url.includes('reset.html')) return;

  const strategy = getStrategy(event.request);
  const url = new URL(event.request.url);
  const cacheName = url.hostname === location.hostname ? STATIC_CACHE : CDN_CACHE;

  event.respondWith(
    (async () => {
      try {
        switch (strategy) {
          case STRATEGIES.CACHE_FIRST:
            return await cacheFirst(event.request, cacheName);

          case STRATEGIES.NETWORK_FIRST:
            return await networkFirst(event.request, DYNAMIC_CACHE);

          case STRATEGIES.STALE_WHILE_REVALIDATE:
          default:
            return await staleWhileRevalidate(event.request, cacheName);
        }
      } catch (error) {
        console.error('[SW v4] Fetch error:', error);

        // Last resort - offline page
        if (event.request.mode === 'navigate') {
          return caches.match(OFFLINE_URL);
        }

        return new Response('Offline', { status: 503 });
      }
    })()
  );
});

// ===========================================
// BACKGROUND SYNC
// ===========================================

/**
 * Background sync for form submissions
 */
self.addEventListener('sync', (event) => {
  console.log('[SW v4] Background sync:', event.tag);

  if (event.tag === 'sync-forms') {
    event.waitUntil(syncPendingForms());
  }

  if (event.tag === 'sync-drive') {
    event.waitUntil(syncPendingDriveUploads());
  }
});

/**
 * Sync pending forms from IndexedDB
 */
async function syncPendingForms() {
  try {
    // Get pending sync items from localStorage via client
    const clients = await self.clients.matchAll();
    if (clients.length > 0) {
      clients[0].postMessage({ type: 'PROCESS_SYNC_QUEUE' });
    }
    console.log('[SW v4] Form sync triggered');
  } catch (error) {
    console.error('[SW v4] Form sync failed:', error);
  }
}

/**
 * Sync pending Drive uploads
 */
async function syncPendingDriveUploads() {
  try {
    const clients = await self.clients.matchAll();
    if (clients.length > 0) {
      clients[0].postMessage({ type: 'PROCESS_DRIVE_QUEUE' });
    }
    console.log('[SW v4] Drive sync triggered');
  } catch (error) {
    console.error('[SW v4] Drive sync failed:', error);
  }
}

// ===========================================
// PUSH NOTIFICATIONS
// ===========================================

/**
 * Push notification received
 */
self.addEventListener('push', (event) => {
  let data = {
    title: 'JMart Safety',
    body: 'New safety update',
    icon: './icons/icon-192x192.png'
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || './icons/icon-192x192.png',
    badge: './icons/icon-192x192.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || './' },
    actions: data.actions || []
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

/**
 * Notification clicked
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || './';

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      // Focus existing window if available
      for (const client of clients) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window
      return self.clients.openWindow(url);
    })
  );
});

// ===========================================
// MESSAGE HANDLING
// ===========================================

/**
 * Handle messages from main thread
 */
self.addEventListener('message', (event) => {
  console.log('[SW v4] Message received:', event.data);

  switch (event.data?.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'CACHE_URLS':
      // Cache additional URLs on demand
      if (event.data.urls) {
        caches.open(DYNAMIC_CACHE).then(cache => {
          cache.addAll(event.data.urls);
        });
      }
      break;

    case 'CLEAR_CACHE':
      caches.keys().then(names => {
        names.forEach(name => {
          if (name.startsWith('jmart-')) {
            caches.delete(name);
          }
        });
      });
      break;

    case 'RECACHE_CDN':
      // Re-cache CDN resources on demand (triggered when main thread detects missing libs)
      caches.open(CDN_CACHE).then(async (cache) => {
        console.log('[SW v4] Re-caching CDN resources on demand');
        for (const url of CDN_RESOURCES) {
          try {
            const existing = await cache.match(url);
            if (!existing) {
              const response = await fetch(url, { mode: 'cors' });
              if (response.ok) {
                await cache.put(url, response);
                console.log('[SW v4] Re-cached:', url);
              }
            }
          } catch (e) {
            console.warn('[SW v4] Re-cache failed:', url, e.message);
          }
        }
        // Notify main thread to reload
        const clients = await self.clients.matchAll();
        clients.forEach(client => client.postMessage({ type: 'CDN_RECACHED' }));
      });
      break;

    case 'GET_CACHE_STATUS':
      Promise.all([
        caches.open(STATIC_CACHE).then(c => c.keys()),
        caches.open(CDN_CACHE).then(c => c.keys()),
        caches.open(DYNAMIC_CACHE).then(c => c.keys())
      ]).then(([staticKeys, cdnKeys, dynamicKeys]) => {
        event.source.postMessage({
          type: 'CACHE_STATUS',
          static: staticKeys.length,
          cdn: cdnKeys.length,
          dynamic: dynamicKeys.length
        });
      });
      break;
  }
});

console.log('[SW v4] Service Worker loaded - Enhanced offline support');
