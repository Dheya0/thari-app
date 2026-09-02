const CACHE_NAME = 'thari-pwa-v7';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.svg'
];

// Install Event - cache core shell assets safely & skip waiting
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
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

// Activate Event - clean up older legacy caches & claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Thari SW: Clearing legacy cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - dynamic caching strategy with rock-solid offline fallback
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // 1. Only handle GET requests and http/https schemes
  if (req.method !== 'GET' || !req.url.startsWith('http')) {
    return;
  }

  const url = new URL(req.url);

  // 2. EXPLICITLY BYPASS Service Worker script itself and API routes
  // Prevents SW self-interception loops, 304 update aborts, and API routing issues
  if (
    url.pathname === '/sw.js' ||
    url.pathname.endsWith('/sw.js') ||
    url.pathname.startsWith('/api/')
  ) {
    return;
  }

  // 3. Navigation requests (Page reloads, opening app, SPA routes)
  // Strategy: Network-First with Cache Fallback
  // Guarantees fresh index.html with matching JS/CSS hashes when online, and instant offline shell
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(
      fetch(req)
        .then(async (networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clonedResponse = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put('/index.html', clonedResponse);
              cache.put('/', clonedResponse.clone());
            }).catch(() => {});
            return networkResponse;
          }
          
          // If the network returned 304 or any other non-200 response:
          const cachedIndex = await caches.match('/index.html');
          if (cachedIndex) return cachedIndex;

          const cachedRoot = await caches.match('/');
          if (cachedRoot) return cachedRoot;

          // If there's no cached copy, but the network gave us a response (e.g., 304),
          // we cannot return a 304 directly because it has no body. 
          // We make a clean request without conditional headers to get a full 200 OK response.
          try {
            const cleanHeaders = new Headers(req.headers);
            cleanHeaders.delete('If-None-Match');
            cleanHeaders.delete('If-Modified-Since');
            cleanHeaders.delete('Cache-Control');
            cleanHeaders.delete('Pragma');
            
            const cleanResponse = await fetch(new Request(req.url, {
              method: 'GET',
              headers: cleanHeaders,
              credentials: req.credentials,
              redirect: 'follow'
            }));
            
            if (cleanResponse && cleanResponse.status === 200) {
              const clonedResponse = cleanResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put('/index.html', clonedResponse);
                cache.put('/', clonedResponse.clone());
              }).catch(() => {});
              return cleanResponse;
            }
          } catch (e) {
            console.error('Thari SW: Clean fetch failed:', e);
          }

          // If everything fails, return the ultimate offline HTML
          return new Response(
            '<!DOCTYPE html><html><head><meta charset="utf-8"><title>ثري - غير متصل</title></head><body style="background:#0A0D10;color:#F4F1EA;text-align:center;padding:50px;font-family:sans-serif;"><h2>تطبيق ثري يعمل محلياً بالكامل</h2><p>يرجى إعادة فتح التطبيق</p><button onclick="window.location.reload()" style="background:#D9B978;color:#0A0D10;padding:12px 24px;border:none;border-radius:10px;font-weight:bold;cursor:pointer;">إعادة المحاولة</button></body></html>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        })
        .catch(async () => {
          // Network failure (offline) -> serve cached index.html
          const cachedIndex = await caches.match('/index.html');
          if (cachedIndex) return cachedIndex;

          const cachedRoot = await caches.match('/');
          if (cachedRoot) return cachedRoot;

          // Ultimate offline fallback response
          return new Response(
            '<!DOCTYPE html><html><head><meta charset="utf-8"><title>ثري - غير متصل</title></head><body style="background:#0A0D10;color:#F4F1EA;text-align:center;padding:50px;font-family:sans-serif;"><h2>تطبيق ثري يعمل محلياً بالكامل</h2><p>يرجى إعادة فتح التطبيق</p><button onclick="window.location.reload()" style="background:#D9B978;color:#0A0D10;padding:12px 24px;border:none;border-radius:10px;font-weight:bold;cursor:pointer;">إعادة المحاولة</button></body></html>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        })
    );
    return;
  }

  // 4. Static Assets (JS, CSS, Images, Fonts, Manifest, Icons)
  // Strategy: Cache-First with Network Fallback & Safe Revalidation
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch update in background (Stale-While-Revalidate)
        fetch(req)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const cloned = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(req, cloned)).catch(() => {});
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      return fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const cloned = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, cloned)).catch(() => {});
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

