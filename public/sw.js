
const CACHE_NAME = 'gestao93-v12';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://cdn.tailwindcss.com'
];

// Install event: Pre-cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Gestão 93: Pre-caching assets');
      // Use map to catch individual failures
      return Promise.all(
        STATIC_ASSETS.map(url => {
          return fetch(url).then(response => {
            if (response.ok) return cache.put(url, response);
            return Promise.resolve();
          }).catch(() => Promise.resolve());
        })
      );
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
  
  // Skip non-GET requests and non-http(s) requests (like chrome-extension)
  if (request.method !== 'GET' || !request.url.startsWith('http')) return;

  // 1. Navigation strategy: Network-First with Offline Fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Only cache successful responses
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          }
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
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        // Only cache valid basic responses
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return networkResponse;
      }).catch(() => {
        return cachedResponse; // Return cached if network fails
      });

      return cachedResponse || fetchPromise;
    })
  );
});
