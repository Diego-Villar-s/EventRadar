import { getEvents } from '../api.js';
import { getAffinityProfile } from '../api.js';
import { getCurrentUser } from '../api.js';

export class MatchView {
  constructor(container) {
    this.container = container;
    this.events = [];
    this.affinity = null;
    this.user = null;
  }
  
  async render() {
    try {
    this.container.innerHTML = `
      <!-- Floating Navigation -->
      <div style="padding-top: 6rem;">
      
      <main class="match-main">
        <!-- Affinity Hero Card -->
        <section class="affinity-hero">
          <div class="affinity-hero-grid">
            <div class="affinity-user">
              <div class="affinity-user-avatar-wrap">
                <img id="userAvatar" src="https://ui-avatars.com/api/?name=User&background=0A84FF&color=fff" alt="Usuario" class="affinity-user-avatar">
                <div class="affinity-user-badge">
                  <span class="material-symbols-outlined">graphic_eq</span>
                </div>
              </div>
              <div class="affinity-user-info">
                <h1>
                  <span id="userName">Conecta con Spotify</span>
                  <span class="affinity-spotify-badge" id="spotifyBadge" style="display: none;">
                    <span class="affinity-spotify-dot"></span>
                    Spotify Conectado
                  </span>
                </h1>
                <div class="affinity-artists">
                  <span class="affinity-artists-label">Tus Headliners:</span>
                  <span id="topArtistsChips">Conecta tu cuenta para ver tus artistas top</span>
                </div>
              </div>
            </div>
            <div class="affinity-metrics">
              <div class="affinity-ring-group">
                <div class="affinity-ring">
                  <svg class="affinity-ring-svg" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="3"></circle>
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#30d158" stroke-dasharray="38 100" stroke-dashoffset="0" stroke-linecap="round" stroke-width="3"></circle>
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#bf5af2" stroke-dasharray="26 100" stroke-dashoffset="-38" stroke-linecap="round" stroke-width="3"></circle>
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#0a84ff" stroke-dasharray="24 100" stroke-dashoffset="-64" stroke-linecap="round" stroke-width="3"></circle>
                  </svg>
                  <span class="affinity-ring-percent" id="overallMatch">96%</span>
                </div>
                <div class="affinity-breakdown">
                  <div class="affinity-breakdown-item">
                    <span class="affinity-breakdown-dot" style="background: #30d158;"></span>
                    <span class="affinity-breakdown-label" id="genre1Name">Techno</span>
                    <span class="affinity-breakdown-value" id="genre1Pct">38%</span>
                  </div>
                  <div class="affinity-breakdown-item">
                    <span class="affinity-breakdown-dot" style="background: #bf5af2;"></span>
                    <span class="affinity-breakdown-label" id="genre2Name">Indie</span>
                    <span class="affinity-breakdown-value" id="genre2Pct">26%</span>
                  </div>
                  <div class="affinity-breakdown-item">
                    <span class="affinity-breakdown-dot" style="background: #0a84ff;"></span>
                    <span class="affinity-breakdown-label" id="genre3Name">Latin</span>
                    <span class="affinity-breakdown-value" id="genre3Pct">24%</span>
                  </div>
                </div>
              </div>
              <button class="affinity-sync-btn" id="syncBtn">
                <span class="material-symbols-outlined">sync</span>
                <span>Sincronizar</span>
              </button>
            </div>
          </div>
        </section>
        
        <!-- Filters -->
        <section class="filters-bar">
          <div class="filters-chips">
            <button class="filter-chip active">>90% Match</button>
            <button class="filter-chip">Techno & Electro</button>
            <button class="filter-chip">Indie</button>
            <button class="filter-chip">Urban</button>
          </div>
          <div class="filters-selectors">
            <div class="filters-pill purple">
              <span class="material-symbols-outlined">calendar_month</span>
              <span>Verano 2025</span>
            </div>
            <div class="filters-pill green">
              <span class="material-symbols-outlined">euro</span>
              <span>&lt; 250€</span>
            </div>
          </div>
        </section>
        
        <!-- Events Grid -->
        <div class="events-grid">
          <div class="events-main">
            <div class="events-header">
              <h2 class="events-title">
                <span>Festivales Recomendados</span>
                <span class="events-count" id="eventsCount">4 listos</span>
              </h2>
              <span class="events-sort">Ordenado por afinidad</span>
            </div>
            <div id="eventsContainer">
              <!-- Events will be loaded here -->
            </div>
          </div>
          
          <!-- Sidebar -->
          <aside class="sidebar-ref">
            <div class="sidebar-widget">
              <div class="sidebar-widget-header">
                <span class="sidebar-widget-title blue">
                  <span class="material-symbols-outlined">flight</span>
                  Vuelo Directo
                </span>
                <span class="sidebar-widget-badge">-28% Oferta</span>
              </div>
              <div class="sidebar-flight">
                <div>
                  <div class="sidebar-flight-route">Madrid ⇄ BCN</div>
                  <div class="sidebar-flight-info">4 - 8 Jun • 1h 15m</div>
                </div>
                <div class="sidebar-flight-price">
                  <div class="sidebar-flight-price-amount">54€</div>
                  <div class="sidebar-flight-price-label">Ida y vuelta</div>
                </div>
              </div>
            </div>
            
            <div class="sidebar-widget">
              <div class="sidebar-widget-header">
                <span class="sidebar-widget-title purple">
                  <span class="material-symbols-outlined">hotel</span>
                  Hospedaje Cercano
                </span>
                <span class="events-sort">Fòrum Zone</span>
              </div>
              <div class="sidebar-hotel">
                <img src="https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=200" alt="Hotel" class="sidebar-hotel-img">
                <div class="sidebar-hotel-info">
                  <div class="sidebar-hotel-name">The Hoxton Poblenou</div>
                  <div class="sidebar-hotel-meta">
                    <span>14 min a pie</span>
                    <span>•</span>
                    <span class="sidebar-hotel-rating">★ 4.8</span>
                  </div>
                </div>
                <div class="sidebar-hotel-price">
                  <div class="sidebar-hotel-price-amount">142€</div>
                  <div class="sidebar-hotel-price-label">/noche</div>
                </div>
              </div>
              <div class="sidebar-hotel">
                <img src="https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=200" alt="Hostel" class="sidebar-hotel-img">
                <div class="sidebar-hotel-info">
                  <div class="sidebar-hotel-name">Generator Hostel BCN</div>
                  <div class="sidebar-hotel-meta">
                    <span>20 min metro</span>
                    <span>•</span>
                    <span class="sidebar-hotel-rating" style="color: #30d158;">★ 4.6</span>
                  </div>
                </div>
                <div class="sidebar-hotel-price">
                  <div class="sidebar-hotel-price-amount">49€</div>
                  <div class="sidebar-hotel-price-label">/cama</div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
      </div>
    `;
    
    await this.loadData();
    this.initEvents();
    } catch (err) {
      console.error('MatchView render error:', err);
      this.container.innerHTML = `<div style="padding: 2rem; color: white; text-align: center;"><h2>Error</h2><p>${err.message}</p></div>`;
    }
  }
  
  async loadData() {
    try {
      [this.user, this.affinity] = await Promise.all([
        getCurrentUser().catch(() => null),
        getAffinityProfile().catch(() => null)
      ]);
      
      if (this.user) {
        const displayName = this.user.display_name || this.user.id || 'Usuario';
        const avatarUrl = this.user.images?.[0]?.url
          || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0A84FF&color=fff`;

        const userNameEl = document.getElementById('userName');
        const navAvatarEl = document.getElementById('navProfileImg');
        const userAvatarEl = document.getElementById('userAvatar');
        const spotifyBadge = document.getElementById('spotifyBadge');

        if (userNameEl) userNameEl.textContent = displayName;
        if (navAvatarEl) navAvatarEl.src = avatarUrl;
        if (userAvatarEl) userAvatarEl.src = avatarUrl;
        if (spotifyBadge) spotifyBadge.style.display = 'flex';
      }
      
      if (this.affinity) {
        if (this.affinity.topArtists) {
          const chips = this.affinity.topArtists.slice(0, 4).map(a => 
            `<span class="affinity-artist-chip">${a.name}</span>`
          ).join('');
          document.getElementById('topArtistsChips').innerHTML = chips;
        }
        if (this.affinity.topGenres) {
          const genres = this.affinity.topGenres.slice(0, 3);
          if (genres[0]) {
            document.getElementById('genre1Name').textContent = genres[0].genre;
            document.getElementById('genre1Pct').textContent = Math.round(genres[0].weight / 10) + '%';
          }
          if (genres[1]) {
            document.getElementById('genre2Name').textContent = genres[1].genre;
            document.getElementById('genre2Pct').textContent = Math.round(genres[1].weight / 10) + '%';
          }
          if (genres[2]) {
            document.getElementById('genre3Name').textContent = genres[2].genre;
            document.getElementById('genre3Pct').textContent = Math.round(genres[2].weight / 10) + '%';
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  }
  
  async initEvents() {
    try {
      const result = await getEvents();
      this.events = result.events || [];
      
      document.getElementById('eventsCount').textContent = `${this.events.length} listos`;
      
      // Setup preview function
      window.playEventPreview = (eventName, artist) => {
        import('../spotify-player.js').then(m => {
          m.spotifyPlayer.playTrack({
            name: eventName,
            artist: artist,
            uri: 'spotify:playlist:37i9dQZF1DX4dyzvuaRJ0n'
          });
        });
      };
      
      const container = document.getElementById('eventsContainer');
      container.innerHTML = this.events.map((event, idx) => `
        <article class="event-card-ref" style="margin-bottom: ${idx < this.events.length - 1 ? '1.25rem' : '0'};">
          <div class="event-card-ref-image">
            <img src="${event.image || 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800'}" alt="${event.name}">
            <div class="event-card-ref-image-overlay"></div>
            <div class="event-card-ref-badges">
              <span class="event-card-ref-badge-left">${event.city || ''} • ${this.formatDate(event.date)}</span>
              <div class="event-card-ref-badge-match">
                <span class="material-symbols-outlined">bolt</span>
                <span>${event.matchScore || 90 + idx}% Match</span>
              </div>
              ${event.isDemo ? '<span style="margin-left:0.5rem;padding:0.25rem 0.5rem;background:rgba(191,90,242,0.2);color:#bf5af2;border-radius:9999px;font-size:0.6875rem;">Demo</span>' : ''}
            </div>
            <div class="event-card-ref-content">
              <div class="event-card-ref-info">
                <h3>${event.name}</h3>
                <p class="event-card-ref-meta">
                  <span class="material-symbols-outlined">location_on</span>
                  <span>${event.venue}</span>
                  <span style="color: rgba(255,255,255,0.3); margin: 0 0.25rem;">•</span>
                  <span class="event-card-ref-artists">${event.artists?.map(a => a.name).join(', ') || ''}</span>
                </p>
              </div>
              <div class="event-card-ref-actions">
                <div class="event-card-ref-price">
                  <div class="event-card-ref-price-label">Abono</div>
                  <div class="event-card-ref-price-amount">${event.priceMin || 125}€</div>
                </div>
                <div class="event-card-ref-buttons">
                  <button class="event-card-ref-btn glass" onclick="window.playEventPreview && window.playEventPreview('${event.name}', '${event.artists?.[0]?.name || ''}')" title="Escuchar previa">
                    <span class="material-symbols-outlined" style="font-size: 1rem;">play_circle</span> Escuchar
                  </button>
                  <button class="event-card-ref-btn glass" onclick="window.location.hash='#/ruta/${event.id}'" title="Ruta">Ruta</button>
                  <button class="event-card-ref-btn glass" onclick="window.location.hash='#/clima/${event.id}'" title="Clima">Clima</button>
                  <button class="event-card-ref-btn glass" onclick="window.location.hash='#/artista/rosalia'" title="Artista">Artista</button>
                  <button class="event-card-ref-btn white" onclick="window.open('${event.url}', '_blank')">Entradas</button>
                </div>
              </div>
            </div>
          </div>
        </article>
      `).join('');
    } catch (e) {
      console.error(e);
    }
  }
  
  formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  }
}
