import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './src/index.css';

const mountApp = () => {
  const rootElement = document.getElementById('root');
  if (!rootElement) return;

  const root = createRoot(rootElement);
  root.render(
    <ErrorBoundary>
      <React.Suspense fallback={
        <div className="fixed inset-0 bg-[#0A0D10] text-[#F4F1EA] flex items-center justify-center font-bold text-sm dir-rtl">
          جاري تحضير التطبيق...
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
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        // Proactively check for service worker updates on page load
        reg.update().catch(() => {});

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
