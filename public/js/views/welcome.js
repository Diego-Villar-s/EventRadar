import { getEvents } from '../api.js';

export class WelcomeView {
  constructor(container) {
    this.container = container;
    this.events = [];
  }
  
  async render() {
    try {
      this.container.innerHTML = `
        <section style="padding: 7rem 1.5rem 2rem; max-width: 1200px; margin: 0 auto; text-align: center;">
          <div style="margin-bottom: 3rem;">
            <h1 style="font-size: 2.5rem; font-weight: 800; color: white; margin-bottom: 1rem; letter-spacing: -0.02em;">EventRadar & Festival Match</h1>
            <p style="font-size: 1.125rem; color: rgba(255,255,255,0.7); margin-bottom: 2rem;">Descubre festivales que encajan con tu música en Spotify</p>
            <button id="welcomeSpotifyBtn" style="background: #1DB954; color: white; border: none; padding: 0.875rem 2rem; border-radius: 9999px; font-size: 0.9375rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 0.5rem; font-family: inherit;">
              <span class="material-symbols-outlined">login</span>
              Iniciar sesión con Spotify
            </button>
          </div>
          
          <div style="margin-top: 4rem;">
            <h2 style="font-size: 1.5rem; font-weight: 700; color: white; margin-bottom: 1.5rem; text-align: left;">Eventos en modo demo</h2>
            <div id="welcomeEvents" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem; text-align: left;">
              <div style="padding: 2rem; text-align: center; color: rgba(255,255,255,0.5);">Cargando eventos...</div>
            </div>
          </div>
        </section>
      `;
      
      document.getElementById('welcomeSpotifyBtn').addEventListener('click', () => {
        window.location.href = '/auth/login';
      });
      
      await this.loadEvents();
    } catch (err) {
      console.error('WelcomeView render error:', err);
      this.container.innerHTML = `<div style="padding: 2rem; color: white; text-align: center;"><h2>Bienvenido</h2><p>EventRadar & Festival Match</p><button onclick="window.location.href='/auth/login'" style="margin-top: 1rem; padding: 0.75rem 1.5rem; background: #1DB954; color: white; border: none; border-radius: 9999px;">Iniciar sesión con Spotify</button></div>`;
    }
  }
  
  async loadEvents() {
    try {
      const result = await getEvents();
      this.events = result.events || [];
      const container = document.getElementById('welcomeEvents');
      
      if (this.events.length === 0) {
        container.innerHTML = '<div style="padding: 2rem; text-align: center; color: rgba(255,255,255,0.5);">No hay eventos disponibles</div>';
        return;
      }
      
      container.innerHTML = this.events.slice(0, 6).map(event => `
        <article style="background: rgba(28, 28, 30, 0.8); border: 1px solid rgba(255,255,255,0.08); border-radius: 1rem; overflow: hidden;">
          <img src="${event.image || 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800'}" alt="${event.name}" style="width: 100%; height: 150px; object-fit: cover;">
          <div style="padding: 1rem;">
            <h3 style="color: white; font-weight: 600; margin-bottom: 0.5rem;">${event.name}</h3>
            <p style="color: rgba(255,255,255,0.6); font-size: 0.875rem; margin-bottom: 0.75rem;">${event.venue} • ${event.city}</p>
            <button onclick="window.location.href='/auth/login'" style="width: 100%; padding: 0.5rem; background: rgba(255,255,255,0.1); color: white; border: 1px solid rgba(255,255,255,0.2); border-radius: 0.5rem; cursor: pointer; font-family: inherit;">Conectar para ver Match</button>
          </div>
        </article>
      `).join('');
    } catch (e) {
      console.error(e);
      const container = document.getElementById('welcomeEvents');
      if (container) {
        container.innerHTML = '<div style="padding: 2rem; text-align: center; color: rgba(255,255,255,0.5);">Eventos disponibles en modo demo</div>';
      }
    }
  }
}
