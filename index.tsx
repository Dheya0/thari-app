import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import Logo from './components/Logo';
import './src/index.css';

const mountApp = () => {
  const rootElement = document.getElementById('root');
  if (!rootElement) return;

  const root = createRoot(rootElement);
  root.render(
    <ErrorBoundary>
      <React.Suspense fallback={
        <div className="fixed inset-0 bg-[#0A0D10] text-[#F4F1EA] flex flex-col items-center justify-center p-6 text-center font-bold text-sm dir-rtl">
          <Logo size={64} showText />
          <div className="mt-4 text-xs text-slate-400 font-medium animate-pulse">جاري تحضير التطبيق...</div>
        </div>
      }>
        <App />
      </React.Suspense>
    </ErrorBoundary>
  );

  console.info("Thari App: Successfully Mounted.");
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountApp);
} else {
  mountApp();
}

// Progressive Web App (PWA) Service Worker Registration (Only on standard http/https standalone)
if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
  try {
    const notifyWorkerToCacheAssets = () => {
      try {
        if (!navigator.serviceWorker.controller) return;
        const assetElements = Array.from(
          document.querySelectorAll('script[src], link[rel="stylesheet"], link[rel="modulepreload"]')
        );
        const assetUrls = assetElements
          .map((el) => el.getAttribute('src') || el.getAttribute('href'))
          .filter((url): url is string => Boolean(url && url.startsWith('/assets/')));

        if (assetUrls.length > 0) {
          navigator.serviceWorker.controller.postMessage({
            type: 'CACHE_ASSETS',
            assets: Array.from(new Set(assetUrls)),
          });
        }
      } catch (err) {
        console.warn('Could not post assets to service worker:', err);
      }
    };

    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        // Proactively check for service worker updates on page load
        reg.update().catch(() => {});

        // Warm-up current page assets in the service worker cache
        if (navigator.serviceWorker.controller) {
          notifyWorkerToCacheAssets();
        } else {
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            notifyWorkerToCacheAssets();
          });
        }

        reg.onupdatefound = () => {
          const installingWorker = reg.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                window.dispatchEvent(new CustomEvent('pwa-update-available', { detail: reg }));
              }
            };
          }
        };
      })
      .catch(() => {
        // Silent catch for sandboxed previews
      });
  } catch {}
}
