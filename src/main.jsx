import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    let refreshing = false;

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    navigator.serviceWorker.register('/sw.js').then((registration) => {
      const cacheLoadedAssets = () => {
        const urls = Array.from(
          document.querySelectorAll('script[src], link[rel="stylesheet"][href], link[rel="modulepreload"][href]'),
        ).map((node) => node.src || node.href);

        registration.active?.postMessage({ type: 'CACHE_ASSETS', urls });
      };

      const activateWaitingWorker = () => {
        if (!registration.waiting) return;
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      };

      registration.addEventListener('updatefound', () => {
        const installingWorker = registration.installing;
        if (!installingWorker) return;

        installingWorker.addEventListener('statechange', () => {
          if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
            activateWaitingWorker();
          }
        });
      });

      activateWaitingWorker();
      registration.update().catch(() => {});
      cacheLoadedAssets();
      navigator.serviceWorker.ready.then(cacheLoadedAssets);
    }).catch(() => {});
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
