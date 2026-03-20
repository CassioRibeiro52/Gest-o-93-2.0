const CACHE_NAME = 'gestao93-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/index.tsx',
  '/manifest.json',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

// Install event - caching assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate event - cleaning up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serving from cache or network
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests (like tailwind CDN if it causes issues, but we'll try to cache it)
  // For now, simple cache-first strategy for static assets, network-first for others
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).catch(() => {
        // Fallback for navigation requests if offline
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      });
    })
  );
});
