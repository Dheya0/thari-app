const CACHE_NAME = 'thari-pwa-v5';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.svg'
];

// Install Event - cache core shell assets safely
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Add each asset individually with try/catch to avoid Safari addAll failures
      for (const asset of PRECACHE_ASSETS) {
        try {
          await cache.add(asset);
        } catch (err) {
          console.warn(`Thari SW: Pre-cache skipped for ${asset}:`, err);
        }
      }
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - clean up older caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Thari SW: Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - dynamic caching strategy with rock-solid Safari fallback
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle GET requests and http/https schemes
  if (req.method !== 'GET' || !req.url.startsWith('http')) {
    return;
  }

  const url = new URL(req.url);

  // Bypass Google API or non-GET requests
  if (url.origin.includes('generativelanguage.googleapis.com')) {
    return;
  }

  // Handle navigation requests (opening the app or refreshing)
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(
      fetch(req)
        .then((response) => {
          if (response && response.status === 200) {
            const clonedResponse = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clonedResponse));
          }
          return response;
        })
        .catch(async () => {
          // Robust fallback for Safari PWA offline launch
          const cachedIndex = await caches.match('/index.html');
          if (cachedIndex) return cachedIndex;

          const cachedRoot = await caches.match('/');
          if (cachedRoot) return cachedRoot;

          const cachedReq = await caches.match(req);
          if (cachedReq) return cachedReq;

          // Return a basic offline response if nothing is cached
          return new Response('<!DOCTYPE html><html><head><meta charset="utf-8"><title>ثري - غير متصل</title></head><body style="background:#020617;color:white;text-align:center;padding:50px;font-family:sans-serif;"><h2>تطبيق ثري يعمل بدون إنترنت</h2><p>يرجى إعادة تحميل الصفحة</p><button onclick="window.location.reload()" style="background:#f59e0b;color:#020617;padding:12px 24px;border:none;border-radius:10px;font-weight:bold;cursor:pointer;">إعادة المحاولة</button></body></html>', {
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
          });
        })
    );
    return;
  }

  // Cache-first for scripts, styles, images, fonts
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch update in background (Stale-While-Revalidate)
        fetch(req)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(req, networkResponse));
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      return fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const cloned = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, cloned));
          }
          return networkResponse;
        })
        .catch(async () => {
          // If offline and requesting an image, fallback to logo
          if (req.destination === 'image' || req.headers.get('accept')?.includes('image')) {
            const cachedLogo = await caches.match('/logo.svg');
            if (cachedLogo) return cachedLogo;
          }
          return new Response('', { status: 408, statusText: 'Network Timeout' });
        });
    })
  );
});

// Skip waiting on message
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
