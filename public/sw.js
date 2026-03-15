
const CACHE_NAME = 'gestao93-v11';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

// Install event: Pre-cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Gestão 93: Pre-caching assets');
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('Gestão 93: Pre-cache failed for some assets', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate event: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map(key => {
        if (key !== CACHE_NAME) {
          console.log('Gestão 93: Removing old cache', key);
          return caches.delete(key);
        }
      })
    ))
  );
  self.clients.claim();
});

// Fetch event: Advanced caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // 1. Navigation strategy: Network-First with Offline Fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache the latest version of the page
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() => {
          // Fallback to cached index.html
          return caches.match('/') || caches.match('/index.html');
        })
    );
    return;
  }

  // 2. Assets strategy: Stale-While-Revalidate
  // This is good for JS, CSS, and images
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        // Only cache valid responses
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return networkResponse;
      }).catch(() => {
        // If network fails, we already returned cachedResponse if it exists
      });

      return cachedResponse || fetchPromise;
    })
  );
});
