
const CACHE_NAME = 'gestao93-v10';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Gestão 93: Cache aberto');
      // Use cache.addAll but catch errors for individual files if needed
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('Gestão 93: Falha ao cachear alguns arquivos críticos', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map(key => {
        if (key !== CACHE_NAME) {
          return caches.delete(key);
        }
      })
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // If server returns 404, fallback to index.html
          if (response.status === 404) {
            return caches.match('/') || caches.match('/index.html') || response;
          }
          return response;
        })
        .catch(() => {
          // If network fails, fallback to index.html
          return caches.match('/') || caches.match('/index.html');
        })
    );
    return;
  }

  // For other assets, try cache then network
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).catch(() => {
        // Silent fail for non-critical assets
        return null;
      });
    })
  );
});
