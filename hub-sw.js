// Artsteel Hub Service Worker
const CACHE_NAME = 'hub-v27';
const ASSETS = [
  './artsteel-hub.html?v=20260330-frankusyd1',
  './hub-manifest.json?v=20260330-frankusyd1',
  './icons/icon-192x192.png?v=20260330-frankusyd1',
  './icons/icon-512x512.png?v=20260330-frankusyd1',
  './icons/apple-touch-icon-180x180.png?v=20260330-frankusyd1',
    // ExcelJS (required for Igor Excel download)
    'https://cdn.jsdelivr.net/npm/exceljs@4.3.0/dist/exceljs.min.js',
    // jsPDF + autoTable (required for Drive PDF backups)
    './js/vendor/jspdf.umd.min.js',
    './js/vendor/jspdf.plugin.autotable.min.js',
    // Firebase SDK (required for sync)
    'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js',
    'https://www.gstatic.com/firebasejs/10.7.1/firebase-database-compat.js'
];

// Install — pre-cache hub + dependencies
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

// Activate — purge old hub caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k.startsWith('hub-') && k !== CACHE_NAME).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Fetch — network-first for hub HTML, cache-first for static assets
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Network-first for the hub page and manifest (always get latest)
    if (url.pathname.endsWith('artsteel-hub.html') || url.pathname.endsWith('hub-manifest.json')) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // Cache-first for CDN libs (Firebase, ExcelJS) and icons
    if (url.hostname === 'www.gstatic.com' || url.hostname === 'cdn.jsdelivr.net' || url.pathname.startsWith('/icons/') || url.pathname.startsWith('/js/vendor/')) {
        event.respondWith(
            caches.match(event.request).then((cached) => cached || fetch(event.request))
        );
        return;
    }

    // Everything else — network only (API calls, Firebase realtime, etc.)
    event.respondWith(fetch(event.request));
});
