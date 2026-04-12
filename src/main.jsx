import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      const cacheLoadedAssets = () => {
        const urls = Array.from(
          document.querySelectorAll('script[src], link[rel="stylesheet"][href], link[rel="modulepreload"][href]'),
        ).map((node) => node.src || node.href);

        registration.active?.postMessage({ type: 'CACHE_ASSETS', urls });
      };

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
