import { getCurrentUser } from './api.js';
import { escapeHtml } from './utils.js';

function readLastEventId() {
  try {
    return localStorage.getItem('eventradar.lastEventId') || null;
  } catch {
    return null;
  }
}

function saveLastEventId(id) {
  try {
    localStorage.setItem('eventradar.lastEventId', id);
  } catch {
    // Sin almacenamiento local la app sigue funcionando con URLs explícitas.
  }
}

class Router {
  constructor() {
    this.currentView = null;
    this.lastEventId = readLastEventId();
    this.activeRoute = null;
    this.renderSeq = 0;
  }

  async init() {
    window.addEventListener('hashchange', () => {
      this.handleRoute();
    });
    window.addEventListener('resize', () => this.moveNavThumb(false));
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => this.moveNavThumb(false));
    }
    this.updateNavLinks();
    await this.handleRoute();
    this.initNavThumb();
  }

  initNavThumb() {
    const nav = document.getElementById('mainNavSeg');
    const thumb = document.getElementById('mainNavThumb');
    if (!nav || !thumb) return;
    nav.classList.add('no-anim');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.moveNavThumb(false);
        nav.classList.remove('no-anim');
      });
    });
  }

  getRouteFromHash() {
    const hash = window.location.hash.slice(1) || '/inicio';
    const parts = hash.split('/').filter(Boolean);
    return {
      path: parts[0] || 'inicio',
      rest: parts.slice(1),
      hash
    };
  }

  activeRouteForPath(path, user) {
    if (path === 'match' || path === 'home') return 'radar';
    if (path === 'inicio') return user ? 'radar' : null;
    if (path === 'ruta' || path === 'route') return 'ruta';
    if (path === 'clima' || path === 'weather') return 'clima';
    if (path === 'artista' || path === 'artist') return 'artista';
    return null;
  }

  updateNavLinks() {
    const eventId = this.lastEventId;
    const links = document.querySelectorAll('[data-route]');
    links.forEach((link) => {
      const route = link.getAttribute('data-route');
      if (route === 'ruta' || route === 'clima') {
        link.setAttribute(
          'href',
          eventId ? `#/${route}/${encodeURIComponent(eventId)}` : `#/${route}`
        );
      } else if (route === 'artista') {
        link.setAttribute('href', '#/artista');
      } else {
        link.setAttribute('href', '#/match');
      }
    });
  }

  moveNavThumb(animate = true) {
    const nav = document.getElementById('mainNavSeg');
    const thumb = document.getElementById('mainNavThumb');
    if (!nav || !thumb) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) animate = false;

    const items = nav.querySelectorAll('.seg-item');
    items.forEach((link) => {
      const isActive = Boolean(this.activeRoute) && link.getAttribute('data-route') === this.activeRoute;
      link.classList.toggle('active', isActive);
      if (isActive) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });

    document.querySelectorAll('.mobile-nav-link').forEach((link) => {
      const isActive = Boolean(this.activeRoute) && link.getAttribute('data-route') === this.activeRoute;
      link.classList.toggle('active', isActive);
      if (isActive) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });

    const activeLink = Array.from(items).find(
      (link) => this.activeRoute && link.getAttribute('data-route') === this.activeRoute
    );

    if (!activeLink) {
      thumb.style.opacity = '0';
      return;
    }

    thumb.style.opacity = '1';
    const navRect = nav.getBoundingClientRect();
    const linkRect = activeLink.getBoundingClientRect();
    const left = linkRect.left - navRect.left;
    if (animate) {
      thumb.style.transform = `translateX(${left}px) scaleX(1.04) scaleY(.94)`;
      thumb.style.width = `${linkRect.width}px`;
      setTimeout(() => {
        thumb.style.transform = `translateX(${left}px) scaleX(1) scaleY(1)`;
      }, 120);
    } else {
      thumb.style.transition = 'none';
      thumb.style.width = `${linkRect.width}px`;
      thumb.style.transform = `translateX(${left}px)`;
      void thumb.offsetHeight;
      thumb.style.transition = 'transform .5s cubic-bezier(.34,1.45,.64,1), width .5s cubic-bezier(.34,1.45,.64,1), opacity .2s ease';
    }
  }

  async loadView(importFn, props = {}) {
    if (this.currentView && typeof this.currentView.destroy === 'function') {
      try {
        this.currentView.destroy();
      } catch {
        // Un fallo al limpiar una vista no debe bloquear la navegación.
      }
    }

    const app = document.getElementById('app');
    if (!app) return;
    app.innerHTML = '<div class="view-loading" role="status"><span class="material-symbols-outlined">progress_activity</span><span>Cargando…</span></div>';

    try {
      const ViewClass = await importFn();
      this.currentView = new ViewClass(app, props);
      const result = this.currentView.render();
      if (result && typeof result.catch === 'function') {
        await result;
      }
    } catch (error) {
      app.innerHTML = `
        <div class="view-error" role="alert">
          <h2>No se pudo cargar esta vista</h2>
          <p>${escapeHtml(error?.message || 'Error inesperado.')}</p>
          <a class="event-card-ref-btn glass" href="#/inicio">Volver al inicio</a>
        </div>
      `;
    }
  }

  async handleRoute() {
    const { path, rest, hash } = this.getRouteFromHash();

    if (hash === '/' || hash === '') {
      window.location.hash = '#/inicio';
      return;
    }

    if (path === 'home') {
      window.location.hash = '#/match';
      return;
    }

    const seq = ++this.renderSeq;

    if (path === 'ruta' || path === 'route') {
      const eventId = rest.length ? decodeURIComponent(rest.join('/')) : null;
      if (eventId) {
        this.lastEventId = eventId;
        saveLastEventId(eventId);
        this.updateNavLinks();
      }
      this.activeRoute = 'ruta';
      this.moveNavThumb(true);
      await this.loadView(async () => (await import('./views/route-detail.js')).RouteDetailView, { eventId });
      return;
    }

    if (path === 'clima' || path === 'weather') {
      const eventId = rest.length ? decodeURIComponent(rest.join('/')) : null;
      if (eventId) {
        this.lastEventId = eventId;
        saveLastEventId(eventId);
        this.updateNavLinks();
      }
      this.activeRoute = 'clima';
      this.moveNavThumb(true);
      await this.loadView(async () => (await import('./views/weather-detail.js')).WeatherDetailView, { eventId });
      return;
    }

    if (path === 'artista' || path === 'artist') {
      const artistId = rest.length ? decodeURIComponent(rest.join('/')) : null;
      this.activeRoute = 'artista';
      this.moveNavThumb(true);
      await this.loadView(async () => (await import('./views/artist-detail.js')).ArtistDetailView, { artistId });
      return;
    }

    if (path === 'inicio' || path === 'match') {
      const user = await getCurrentUser();
      if (seq !== this.renderSeq) return;
      this.activeRoute = this.activeRouteForPath(path, user);
      this.moveNavThumb(true);
      if (path === 'inicio' && !user) {
        await this.loadView(async () => (await import('./views/welcome.js')).WelcomeView);
      } else {
        await this.loadView(async () => (await import('./views/match.js')).MatchView);
      }
      return;
    }

    window.location.hash = '#/inicio';
  }

  navigate(path) {
    window.location.hash = path;
  }
}

export const router = new Router();
