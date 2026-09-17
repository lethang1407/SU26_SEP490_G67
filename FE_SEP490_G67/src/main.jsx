import { createRoot } from 'react-dom/client'
import App from './app/App'
import AuthProvider from './app/providers/AuthProvider'
import './index.css'

// Register Service Worker for offline support
if ('serviceWorker' in navigator && process.env.NODE_ENV !== 'test') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      (reg) => {
        console.info('[ServiceWorker] Registered successfully with scope:', reg.scope);
      },
      (err) => {
        console.warn('[ServiceWorker] Registration failed:', err);
      }
    );
  });
}

createRoot(document.getElementById('root')).render(
  <AuthProvider>
    <App />
  </AuthProvider>
)
