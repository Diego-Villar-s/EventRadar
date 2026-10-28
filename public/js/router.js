import { HomeView } from './views/home.js';
import { MatchView } from './views/match.js';
import { RouteView } from './views/route.js';
import { RouteDetailView } from './views/route-detail.js';
import { WeatherView } from './views/weather.js';
import { WeatherDetailView } from './views/weather-detail.js';
import { ArtistView } from './views/artist.js';
import { ArtistDetailView } from './views/artist-detail.js';
import { WelcomeView } from './views/welcome.js';

class Router {
  constructor() {
    this.routes = {
      '/': WelcomeView,
      '/inicio': WelcomeView,
      '/home': MatchView,
      '/match': MatchView,
      '/route': RouteDetailView,
      '/ruta': RouteDetailView,
      '/weather': WeatherDetailView,
      '/clima': WeatherDetailView,
      '/artist': ArtistDetailView,
      '/artista': ArtistDetailView
    };
    this.currentView = null;
    this.lastEventId = 'demo-1';
  }
  
  init() {
    window.addEventListener('hashchange', () => {
      this.handleRoute();
      this.moveNavThumb(true);
    });
    window.addEventListener('resize', () => this.moveNavThumb(false));
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => this.moveNavThumb(false));
    }
    this.handleRoute();
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
  
  moveNavThumb(animate = true) {
    const nav = document.getElementById('mainNavSeg');
    const thumb = document.getElementById('mainNavThumb');
    if (!nav || !thumb) return;
    
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) animate = false;
    
    const hash = window.location.hash.slice(1) || '/inicio';
    let activeHref = '#/match';
    
    if (hash.startsWith('/inicio') || hash === '/') {
      activeHref = '#/match';
    } else if (hash.startsWith('/match')) {
      activeHref = '#/match';
    } else if (hash.startsWith('/ruta')) {
      activeHref = '#/ruta/demo';
    } else if (hash.startsWith('/clima')) {
      activeHref = '#/clima/demo';
    } else if (hash.startsWith('/artista')) {
      activeHref = '#/artista/rosalia';
    }
    
    const items = nav.querySelectorAll('.seg-item');
    items.forEach(link => {
      const isActive = link.getAttribute('href') === activeHref;
      link.classList.toggle('active', isActive);
      if (isActive) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    
    const activeLink = Array.from(items).find(l => l.getAttribute('href') === activeHref);
    if (activeLink) {
      const navRect = nav.getBoundingClientRect();
      const linkRect = activeLink.getBoundingClientRect();
      const left = linkRect.left - navRect.left;
      if (animate) {
        thumb.style.transform = `translateX(${left}px) scaleX(1.04) scaleY(.94)`;
        thumb.style.width = linkRect.width + 'px';
        setTimeout(() => {
          thumb.style.transform = `translateX(${left}px) scaleX(1) scaleY(1)`;
        }, 120);
      } else {
        thumb.style.transition = 'none';
        thumb.style.width = linkRect.width + 'px';
        thumb.style.transform = `translateX(${left}px)`;
        void thumb.offsetHeight;
        thumb.style.transition = 'transform .5s cubic-bezier(.34,1.45,.64,1), width .5s cubic-bezier(.34,1.45,.64,1)';
      }
    }
  }
  
  async loadView(importFn) {
    if (this.currentView && typeof this.currentView.destroy === 'function') {
      try {
        this.currentView.destroy();
      } catch (e) {
        console.error('Error destroying view:', e);
      }
    }
    const app = document.getElementById('app');
    if (!app) {
      console.error('App container not found');
      return;
    }
    app.innerHTML = '';
    try {
      const ViewClass = await importFn();
      this.currentView = new ViewClass(app);
      if (typeof this.currentView.render === 'function') {
        const result = this.currentView.render();
        if (result && typeof result.catch === 'function') {
          result.catch(err => {
            console.error('View render error:', err);
            app.innerHTML = `<div style="padding: 2rem; color: white; text-align: center;"><h2>Error</h2><p>${err.message}</p></div>`;
          });
        }
      }
    } catch (err) {
      console.error('View load error:', err);
      app.innerHTML = `<div style="padding: 2rem; color: white; text-align: center;"><h2>Error al cargar vista</h2><p>${err.message}</p></div>`;
    }
  }
  
  handleRoute() {
    let hash = window.location.hash.slice(1);
    if (!hash || hash === '/') {
      window.location.hash = '#/inicio';
      setTimeout(() => this.moveNavThumb(true), 50);
      return;
    }
    if (hash === '') hash = '/inicio';
    
    // Handle dynamic routes
    if (hash.startsWith('/ruta/')) {
      const id = hash.split('/ruta/')[1] || this.lastEventId || 'demo-1';
      this.lastEventId = id;
      this.loadView(async () => {
        const mod = await import('./views/route-detail.js');
        return mod.RouteDetailView;
      });
      setTimeout(() => this.moveNavThumb(true), 50);
      return;
    }
    
    if (hash === '/ruta') {
      window.location.hash = `#/ruta/${this.lastEventId || 'demo-1'}`;
      setTimeout(() => this.moveNavThumb(true), 50);
      return;
    }
    
    if (hash.startsWith('/clima/')) {
      const id = hash.split('/clima/')[1] || this.lastEventId || 'demo-1';
      this.lastEventId = id;
      this.loadView(async () => {
        const mod = await import('./views/weather-detail.js');
        return mod.WeatherDetailView;
      });
      setTimeout(() => this.moveNavThumb(true), 50);
      return;
    }
    
    if (hash === '/clima') {
      window.location.hash = `#/clima/${this.lastEventId || 'demo-1'}`;
      setTimeout(() => this.moveNavThumb(true), 50);
      return;
    }
    
    if (hash.startsWith('/artista/')) {
      const artistId = hash.split('/artista/')[1];
      if (!artistId || artistId === '') {
        window.location.hash = '#/artista/rosalia';
        setTimeout(() => this.moveNavThumb(true), 50);
        return;
      }
      this.loadView(async () => {
        const mod = await import('./views/artist-detail.js');
        return mod.ArtistDetailView;
      });
      setTimeout(() => this.moveNavThumb(true), 50);
      return;
    }
    
    if (hash === '/artista') {
      window.location.hash = '#/artista/rosalia';
      setTimeout(() => this.moveNavThumb(true), 50);
      return;
    }
    
    // Update nav links
    document.querySelectorAll('.nav-link, .mobile-nav-link').forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === `#${hash}`);
    });
    
    const viewMap = {
      '/inicio': async () => (await import('./views/welcome.js')).WelcomeView,
      '/match': async () => (await import('./views/match.js')).MatchView,
      '/home': async () => (await import('./views/match.js')).MatchView
    };
    
    this.loadView(viewMap[hash] || viewMap['/inicio']);
    setTimeout(() => this.moveNavThumb(true), 50);
  }
  
  navigate(path) {
    window.location.hash = path;
  }
}

export const router = new Router();
