import { router } from './router.js';
import { initAuth } from './api.js';
import './spotify-player.js';

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  console.log('🎵 EventRadar & Festival Match initialized');
  
  // Initialize auth
  initAuth();
  
  // Initialize router
  router.init();
  
  // Handle Spotify callback
  const hash = window.location.hash;
  if (hash.includes('callback=success')) {
    alert('¡Conectado con Spotify correctamente!');
    window.history.replaceState({}, document.title, window.location.pathname);
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  } else if (hash.includes('callback=error')) {
    alert('Error al conectar con Spotify');
    window.history.replaceState({}, document.title, window.location.pathname);
  }
});
