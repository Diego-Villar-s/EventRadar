import { router } from './router.js';
import { initAuth, initNavLocation } from './api.js';
import './spotify-player.js';

function notify(message, type = 'info') {
  const toast = document.createElement('div');
  toast.setAttribute('role', 'status');
  toast.style.cssText = [
    'position:fixed',
    'left:50%',
    'bottom:6rem',
    'transform:translateX(-50%)',
    'z-index:300',
    'padding:.75rem 1.1rem',
    'border-radius:9999px',
    'font-size:.8125rem',
    'font-weight:600',
    'font-family:var(--font-sans,system-ui)',
    'box-shadow:0 10px 30px rgba(0,0,0,.45)',
    'border:1px solid rgba(255,255,255,.14)',
    type === 'error' ? 'background:#3a1114;color:#ffb4ab' : 'background:#10261a;color:#7bf1a8'
  ].join(';');
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

document.addEventListener('DOMContentLoaded', async () => {
  const hash = window.location.hash;

  if (hash.includes('callback=success')) {
    window.history.replaceState({}, document.title, `${window.location.pathname}#/inicio`);
    notify('Sesión de Spotify conectada.');
  } else if (hash.includes('callback=error')) {
    window.history.replaceState({}, document.title, `${window.location.pathname}#/inicio`);
    notify('No se pudo completar la conexión con Spotify.', 'error');
  }

  initAuth();
  initNavLocation();
  await router.init();
});
