import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        registration.update();
      })
      .catch((err) => {
        console.warn('Service worker registration failed:', err);
      });
  });
}

createRoot(document.getElementById('root')!).render(<App />);
