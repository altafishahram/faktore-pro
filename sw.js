/**
 * Service Worker - Offline First
 * Caches app shell for offline use
 */

const CACHE_NAME = 'invoice-proforma-v8';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './app/styles/main.css',
  './app/styles/tokens/design-tokens.css',
  './app/styles/global/base.css',
  './app/styles/layout/app-layout.css',
  './app/styles/components/ui.css',
  './app/core/app/bootstrap.js',
  './app/core/router/router.js',
  './app/core/state/store.js',
  './app/core/events/event-bus.js',
  './app/core/utilities/id.js',
  './app/core/utilities/jalali.js',
  './app/core/utilities/theme.js',
  './app/storage/indexeddb/db.js',
  './app/modules/dashboard/dashboard.js',
  './app/modules/products/products.js',
  './app/modules/customers/customers.js',
  './app/modules/invoices/invoices.js',
  './app/modules/quotations/quotations.js',
  './app/modules/settings/settings.js',
  './app/storage/indexeddb/repositories.js',
  './app/services/pricing/pricing-service.js',
  './app/services/image/image-export.js',
  './app/services/backup/backup-service.js',,
  './app/services/sharing/share-service.js',,
  './app/services/pdf/document-renderer.js',
];

// Install – cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching app shell');
        return cache.addAll(APP_SHELL).catch((err) => {
          console.warn('[SW] Some assets failed to cache:', err);
          // Continue even if some fail
        });
      })
      .then(() => self.skipWaiting())
  );
});

// Activate – clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch – Network first for navigation, Cache first for assets
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET
  if (request.method !== 'GET') return;

  // Skip external (fonts etc.) – allow network
  if (!request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response && response.status === 200 && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          // Offline fallback
          if (cached) return cached;
          // For navigation, return index.html
          if (request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return new Response('آفلاین هستید', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        });

      // Prefer cache for static assets, network for others
      return cached || networkFetch;
    })
  );
});

// Message handler (for future skipWaiting control)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
