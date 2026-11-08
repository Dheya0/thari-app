/**
 * THARI Application Service Worker (v10)
 * High-Performance Local Asset Caching & Instant Subsequent Load Strategy
 *
 * Strategies implemented:
 * 1. Categorized Cache Architecture (Precache, Assets, Images, Fonts, Pages)
 * 2. Immutable Cache-First for hashed application bundles (/assets/*.js, /assets/*.css)
 * 3. Cache-First with Stale-While-Revalidate for HTML Navigation (0ms initial load on subsequent visits)
 * 4. Automatic Discovery & Pre-caching of application chunks during install
 * 5. Long-term Cache-First for web fonts (fonts.googleapis.com, fonts.gstatic.com)
 * 6. Explicit bypass for /api/* and /sw.js
 */

const CACHE_VERSION = 'v10';
const CACHE_PREFIX = 'thari';

const CACHE_NAMES = {
  precache: `${CACHE_PREFIX}-precache-${CACHE_VERSION}`,
  assets: `${CACHE_PREFIX}-assets-${CACHE_VERSION}`,
  images: `${CACHE_PREFIX}-images-${CACHE_VERSION}`,
  fonts: `${CACHE_PREFIX}-fonts-v1`, // fonts persist across app bumps to save data and load instantly
  pages: `${CACHE_PREFIX}-pages-${CACHE_VERSION}`,
};

const PRECACHE_SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.svg',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
  '/favicon.png',
  '/apple-touch-icon.png',
  '/apple-touch-icon-180x180.png',
  '/apple-touch-icon-167x167.png',
  '/apple-touch-icon-152x152.png',
  '/apple-touch-icon-120x120.png',
  '/icon-48.png',
  '/icon-192.png',
  '/icon-512.png',
  '/icon.png'
];

// Helper: Safely add an array of URLs to a cache without failing the whole batch if one 404s
async function safeAddAll(cache, urls) {
  return Promise.allSettled(
    urls.map(async (url) => {
      try {
        const req = new Request(url, { cache: 'reload' });
        const res = await fetch(req);
        if (res.ok) {
          await cache.put(req, res);
        }
      } catch (err) {
        console.warn(`[Thari SW] Safe cache add skipped for ${url}:`, err);
      }
    })
  );
}

// -------------------------------------------------------------
// 1. Install Event: Precache Core Shell + Auto-Discover Bundles
// -------------------------------------------------------------
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const precache = await caches.open(CACHE_NAMES.precache);
      const assetsCache = await caches.open(CACHE_NAMES.assets);

      // A. Precache core shell assets
      await safeAddAll(precache, PRECACHE_SHELL_ASSETS);

      // B. Proactively discover and pre-cache compiled scripts and stylesheets from index.html!
      // This ensures that on the very next visit, all compiled JS/CSS bundles are ALREADY cached locally.
      try {
        const indexRes = await fetch('/index.html', { cache: 'no-cache' });
        if (indexRes.ok) {
          const htmlText = await indexRes.clone().text();
          // Match all /assets/... js and css files referenced in index.html
          const assetRegex = /(?:src|href)=["'](\/assets\/[^"']+\.(?:js|css))["']/g;
          const discoveredAssets = new Set();
          let match;
          while ((match = assetRegex.exec(htmlText)) !== null) {
            discoveredAssets.add(match[1]);
          }

          if (discoveredAssets.size > 0) {
            console.log(`[Thari SW] Pre-caching ${discoveredAssets.size} discovered application bundles`);
            await safeAddAll(assetsCache, Array.from(discoveredAssets));
          }
        }
      } catch (err) {
        console.warn('[Thari SW] Index asset parsing during install skipped:', err);
      }

      // Activate immediately without waiting for old tabs to close
      return self.skipWaiting();
    })()
  );
});

// -------------------------------------------------------------
// 2. Activate Event: Clean Stale Caches & Claim Clients
// -------------------------------------------------------------
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const activeCacheNames = new Set(Object.values(CACHE_NAMES));
      const allKeys = await caches.keys();

      await Promise.all(
        allKeys.map(async (key) => {
          // Keep current active caches, delete older thari caches or legacy thari-pwa-v* caches
          if ((key.startsWith('thari-') || key.startsWith('thari_') || key.startsWith('thari-pwa-')) && !activeCacheNames.has(key)) {
            console.log(`[Thari SW] Purging legacy cache: ${key}`);
            return caches.delete(key);
          }
        })
      );

      // Take control of all open pages immediately so subsequent fetches are intercepted
      await self.clients.claim();
    })()
  );
});

// -------------------------------------------------------------
// 3. Fetch Event: Specialized Strategies for Instant Load
// -------------------------------------------------------------
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle GET requests with http/https schemes
  if (req.method !== 'GET' || !req.url.startsWith('http')) {
    return;
  }

  const url = new URL(req.url);

  // Exclude Service Worker script and API routes
  if (
    url.pathname === '/sw.js' ||
    url.pathname.endsWith('/sw.js') ||
    url.pathname.startsWith('/api/')
  ) {
    return;
  }

  // --- Strategy A: Google Fonts (Cache-First) ---
  if (url.origin.includes('fonts.googleapis.com') || url.origin.includes('fonts.gstatic.com')) {
    event.respondWith(
      (async () => {
        const fontsCache = await caches.open(CACHE_NAMES.fonts);
        const cached = await fontsCache.match(req);
        if (cached) {
          return cached;
        }

        try {
          const netRes = await fetch(req);
          if (netRes && (netRes.status === 200 || netRes.status === 0)) {
            fontsCache.put(req, netRes.clone()).catch(() => {});
          }
          return netRes;
        } catch {
          return new Response('', { status: 408, statusText: 'Font Fetch Timeout' });
        }
      })()
    );
    return;
  }

  // --- Strategy B: HTML Navigation (0ms Stale-While-Revalidate) ---
  // On subsequent visits, serve cached index.html immediately (0ms FCP/LCP),
  // while checking for updates in background.
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(
      (async () => {
        const pagesCache = await caches.open(CACHE_NAMES.pages);
        const precache = await caches.open(CACHE_NAMES.precache);

        const cachedPage =
          (await pagesCache.match(req)) ||
          (await precache.match('/index.html')) ||
          (await precache.match('/'));

        // Background revalidation & asset warm-up
        const backgroundFetch = fetch(req)
          .then(async (netRes) => {
            if (netRes && netRes.status === 200) {
              const clone = netRes.clone();
              await pagesCache.put(req, clone);
              await precache.put('/index.html', netRes.clone());

              // Warm-up any new bundles referenced in updated HTML
              try {
                const text = await netRes.clone().text();
                const assetRegex = /(?:src|href)=["'](\/assets\/[^"']+\.(?:js|css))["']/g;
                const assetsCache = await caches.open(CACHE_NAMES.assets);
                let m;
                while ((m = assetRegex.exec(text)) !== null) {
                  const assetUrl = m[1];
                  const exists = await assetsCache.match(assetUrl);
                  if (!exists) {
                    assetsCache.add(assetUrl).catch(() => {});
                  }
                }
              } catch {}
            }
            return netRes;
          })
          .catch(() => null);

        // Instant return if cached!
        if (cachedPage) {
          return cachedPage;
        }

        // If not cached (first visit), await network
        const netRes = await backgroundFetch;
        if (netRes) return netRes;

        // Offline fallback
        return new Response(
          '<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>ثري — غير متصل</title></head><body style="background:#0A0D10;color:#F4F1EA;font-family:sans-serif;text-align:center;padding:40px;"><h2>تطبيق ثري</h2><p>أنت تتصفح في وضع عدم الاتصال. يتم تحميل بياناتك المحلية المخزنة بأمان.</p><button onclick="window.location.reload()" style="background:#D9B978;color:#0A0D10;border:none;padding:12px 24px;border-radius:12px;font-weight:bold;cursor:pointer;">إعادة المحاولة</button></body></html>',
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      })()
    );
    return;
  }

  // --- Strategy C: Compiled Application Bundles (/assets/*, .js, .css) (Cache-First) ---
  // Vite content-hashes these assets, making them immutable.
  // Serving directly from cache without background fetch provides instant execution.
  if (
    url.pathname.startsWith('/assets/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css')
  ) {
    event.respondWith(
      (async () => {
        const assetsCache = await caches.open(CACHE_NAMES.assets);
        const cached = await assetsCache.match(req);
        if (cached) {
          return cached;
        }

        try {
          const netRes = await fetch(req);
          if (netRes && (netRes.status === 200 || netRes.type === 'basic')) {
            assetsCache.put(req, netRes.clone()).catch(() => {});
          }
          return netRes;
        } catch (err) {
          // Fallback to precache if present
          const precache = await caches.open(CACHE_NAMES.precache);
          const fallback = await precache.match(req);
          if (fallback) return fallback;
          throw err;
        }
      })()
    );
    return;
  }

  // --- Strategy D: Static Images, SVGs, Favicons & Manifest (Stale-While-Revalidate) ---
  if (
    url.pathname.match(/\.(png|svg|ico|jpg|jpeg|webp)$/i) ||
    url.pathname === '/manifest.json'
  ) {
    event.respondWith(
      (async () => {
        const imagesCache = await caches.open(CACHE_NAMES.images);
        const precache = await caches.open(CACHE_NAMES.precache);

        const cached = (await imagesCache.match(req)) || (await precache.match(req));

        const fetchPromise = fetch(req)
          .then((netRes) => {
            if (netRes && (netRes.status === 200 || netRes.status === 0)) {
              imagesCache.put(req, netRes.clone()).catch(() => {});
            }
            return netRes;
          })
          .catch(() => null);

        if (cached) {
          return cached;
        }

        const netRes = await fetchPromise;
        if (netRes) return netRes;

        if (req.destination === 'image' || req.headers.get('accept')?.includes('image')) {
          const fallbackLogo = await precache.match('/logo.svg');
          if (fallbackLogo) return fallbackLogo;
        }

        return new Response('', { status: 408 });
      })()
    );
    return;
  }

  // Default: Cache-First with network fallback
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((netRes) => {
        if (netRes && netRes.status === 200) {
          const clone = netRes.clone();
          caches.open(CACHE_NAMES.precache).then((c) => c.put(req, clone)).catch(() => {});
        }
        return netRes;
      });
    })
  );
});

// -------------------------------------------------------------
// 4. Message Event: Client-to-Worker Communication
// -------------------------------------------------------------
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  // Client informs worker of assets currently rendered in DOM for 100% complete pre-caching
  if (event.data.type === 'CACHE_ASSETS' && Array.isArray(event.data.assets)) {
    event.waitUntil(
      caches.open(CACHE_NAMES.assets).then(async (cache) => {
        for (const assetUrl of event.data.assets) {
          try {
            const exists = await cache.match(assetUrl);
            if (!exists) {
              await cache.add(assetUrl);
              console.log(`[Thari SW] Cached client-reported bundle: ${assetUrl}`);
            }
          } catch (err) {
            console.warn(`[Thari SW] Failed to cache client asset ${assetUrl}:`, err);
          }
        }
      })
    );
  }
});
