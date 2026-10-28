import { getEvents } from '../api.js';
import { getAffinityProfile } from '../api.js';

class HomeView {
  constructor(container) {
    this.container = container;
    this.events = [];
    this.affinity = null;
  }
  
  async render() {
    this.container.innerHTML = `
      <section class="home-hero glass-card">
        <div class="home-hero-bg"></div>
        <div class="home-hero-content">
          <div class="home-hero-left">
            <div class="home-profile">
              <img id="homeProfileImg" src="https://ui-avatars.com/api/?name=User&background=0A84FF&color=fff" alt="Perfil" class="home-profile-img">
              <div class="home-profile-info">
                <div class="home-profile-name-row">
                  <h1 class="home-profile-name" id="homeProfileName">Conecta con Spotify</h1>
                  <span class="badge badge-green" id="spotifyConnectedBadge" style="display: none;">
                    <span style="width: 6px; height: 6px; border-radius: 50%; background: var(--accent-green);"></span>
                    Spotify Conectado
                  </span>
                </div>
                <div class="home-top-artists" id="homeTopArtists">
                  <span class="text-body-sm" style="color: var(--text-tertiary);">Conecta tu cuenta para ver tus artistas top</span>
                </div>
              </div>
            </div>
          </div>
          <div class="home-hero-right">
            <div class="home-affinity-ring">
              <svg class="home-affinity-svg" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="3"></circle>
                <circle cx="18" cy="18" r="14" fill="none" stroke="var(--accent-green)" stroke-dasharray="38 100" stroke-dashoffset="0" stroke-linecap="round" stroke-width="3" class="home-affinity-segment" id="affinitySegment1"></circle>
                <circle cx="18" cy="18" r="14" fill="none" stroke="var(--accent-purple)" stroke-dasharray="26 100" stroke-dashoffset="-38" stroke-linecap="round" stroke-width="3" class="home-affinity-segment" id="affinitySegment2"></circle>
                <circle cx="18" cy="18" r="14" fill="none" stroke="var(--accent-blue)" stroke-dasharray="24 100" stroke-dashoffset="-64" stroke-linecap="round" stroke-width="3" class="home-affinity-segment" id="affinitySegment3"></circle>
              </svg>
              <span class="home-affinity-percent" id="homeAffinityPercent">--</span>
            </div>
            <div class="home-affinity-breakdown">
              <div class="home-affinity-item">
                <span class="home-affinity-dot" style="background: var(--accent-green);"></span>
                <span class="home-affinity-label" id="genre1Label">-</span>
                <span class="home-affinity-value" id="genre1Value">-</span>
              </div>
              <div class="home-affinity-item">
                <span class="home-affinity-dot" style="background: var(--accent-purple);"></span>
                <span class="home-affinity-label" id="genre2Label">-</span>
                <span class="home-affinity-value" id="genre2Value">-</span>
              </div>
              <div class="home-affinity-item">
                <span class="home-affinity-dot" style="background: var(--accent-blue);"></span>
                <span class="home-affinity-label" id="genre3Label">-</span>
                <span class="home-affinity-value" id="genre3Value">-</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <section class="home-filters">
        <div class="home-filter-chips">
          <button class="filter-chip active">>70% Match</button>
          <button class="filter-chip">Techno & Electro</button>
          <button class="filter-chip">Pop & Rock</button>
          <button class="filter-chip">Latin</button>
        </div>
        <div class="home-filter-selectors">
          <select class="filter-select" id="citySelect">
            <option value="">Todas las ciudades</option>
            <option value="Barcelona">Barcelona</option>
            <option value="Madrid">Madrid</option>
            <option value="Buenos Aires">Buenos Aires</option>
            <option value="Ciudad de México">Ciudad de México</option>
          </select>
        </div>
      </section>
      
      <div class="home-grid">
        <section class="home-events">
          <div class="home-events-header">
            <h2 class="text-headline-md">Festivales Recomendados</h2>
            <span class="text-body-sm" style="color: var(--text-tertiary);" id="eventsCount">Cargando...</span>
          </div>
          <div class="home-events-list" id="eventsList">
            <div class="loading-skeleton">
              <div class="skeleton-card"></div>
              <div class="skeleton-card"></div>
              <div class="skeleton-card"></div>
            </div>
          </div>
        </section>
      </div>
    `;
    
    this.loadData();
  }
  
  async loadData() {
    // Load user profile
    try {
      const user = await fetch('/api/me', { credentials: 'include' }).then(r => r.ok ? r.json() : null);
      if (user) {
        document.getElementById('homeProfileName').textContent = user.display_name;
        if (user.images && user.images[0]) {
          document.getElementById('homeProfileImg').src = user.images[0].url;
        }
        document.getElementById('spotifyConnectedBadge').style.display = 'inline-flex';
      }
    } catch (e) {}
    
    // Load affinity
    try {
      this.affinity = await getAffinityProfile();
      if (this.affinity && this.affinity.topGenres) {
        const genres = this.affinity.topGenres.slice(0, 3);
        if (genres[0]) {
          document.getElementById('genre1Label').textContent = genres[0].genre;
          document.getElementById('genre1Value').textContent = Math.round(genres[0].weight / 10) + '%';
        }
        if (genres[1]) {
          document.getElementById('genre2Label').textContent = genres[1].genre;
          document.getElementById('genre2Value').textContent = Math.round(genres[1].weight / 10) + '%';
        }
        if (genres[2]) {
          document.getElementById('genre3Label').textContent = genres[2].genre;
          document.getElementById('genre3Value').textContent = Math.round(genres[2].weight / 10) + '%';
        }
        document.getElementById('homeAffinityPercent').textContent = '96%';
      }
      
      // Load top artists
      if (this.affinity && this.affinity.topArtists) {
        const artists = this.affinity.topArtists.slice(0, 4).map(a => a.name).join(', ');
        document.getElementById('homeTopArtists').innerHTML = `
          <span class="text-body-sm" style="color: var(--text-tertiary);">Tus Headliners:</span>
          <span class="text-body-sm" style="color: white;">${artists}</span>
        `;
      }
    } catch (e) {}
    
    // Load events
    this.loadEvents();
    
    // City filter
    document.getElementById('citySelect').addEventListener('change', (e) => {
      this.loadEvents(e.target.value);
    });
  }
  
  async loadEvents(city = '') {
    const eventsList = document.getElementById('eventsList');
    const eventsCount = document.getElementById('eventsCount');
    
    eventsList.innerHTML = `
      <div class="loading-skeleton">
        <div class="skeleton-card"></div>
        <div class="skeleton-card"></div>
      </div>
    `;
    
    try {
      const result = await getEvents(city ? { city } : {});
      this.events = result.events || [];
      
      eventsCount.textContent = `${this.events.length} eventos encontrados`;
      
      if (this.events.length === 0) {
        eventsList.innerHTML = `
          <div class="empty-state">
            <span class="material-symbols-outlined" style="font-size: 3rem; color: var(--text-tertiary);">event_busy</span>
            <h3 class="text-headline-sm" style="margin-top: 1rem;">No hay eventos</h3>
            <p class="text-body-md" style="color: var(--text-secondary); margin-top: 0.5rem;">Intenta con otra ciudad o vuelve más tarde</p>
          </div>
        `;
        return;
      }
      
      eventsList.innerHTML = this.events.map(event => `
        <article class="event-card" data-event-id="${event.id}">
          <div class="event-card-image">
            <img src="${event.image || 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800'}" alt="${event.name}">
            <div class="event-card-overlay"></div>
            <div class="event-card-badges">
              <span class="badge badge-gray">${event.city || ''} • ${this.formatDate(event.date)}</span>
              ${event.matchScore ? `<span class="badge ${event.matchScore >= 80 ? 'badge-green' : event.matchScore >= 50 ? 'badge-blue' : 'badge-gray'}">${event.matchScore}% Match</span>` : ''}
              ${event.isDemo ? '<span class="badge badge-purple">Demo</span>' : ''}
            </div>
          </div>
          <div class="event-card-content">
            <div class="event-card-header">
              <h3 class="event-card-title">${event.name}</h3>
              <p class="event-card-venue">
                <span class="material-symbols-outlined" style="font-size: 0.875rem;">location_on</span>
                ${event.venue}
              </p>
            </div>
            <div class="event-card-artists">
              <span class="text-body-sm" style="color: var(--accent-purple);">
                ${event.artists?.slice(0, 2).map(a => a.name).join(', ') || ''}
              </span>
            </div>
            <div class="event-card-footer">
              <div class="event-card-price">
                ${event.priceMin ? `<span class="event-card-price-amount">${event.priceMin}€</span>` : '<span class="event-card-price-amount">Ver precio</span>'}
              </div>
              <div class="event-card-actions">
                <button class="btn-glass btn-small" onclick="window.router.navigate('/route')">Planificar</button>
                <button class="btn-primary btn-small" onclick="window.open('${event.url}', '_blank')">Entradas</button>
              </div>
            </div>
          </div>
        </article>
      `).join('');
    } catch (error) {
      console.error('Error loading events:', error);
      eventsList.innerHTML = `
        <div class="empty-state">
          <span class="material-symbols-outlined" style="font-size: 3rem; color: var(--accent-red);">error</span>
          <h3 class="text-headline-sm" style="margin-top: 1rem;">Error al cargar eventos</h3>
          <p class="text-body-md" style="color: var(--text-secondary); margin-top: 0.5rem;">Usando datos de demostración</p>
        </div>
      `;
    }
  }
  
  formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  }
  formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  }
}

export { HomeView };
export default HomeView;
