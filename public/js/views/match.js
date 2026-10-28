import { getAffinityProfile, getCurrentUser, getEvents } from '../api.js';
import {
  artistHash,
  avatarUrl,
  emptyState,
  escapeHtml,
  eventImage,
  formatEventDate,
  formatEventTime,
  formatPrice,
  hasValidCoordinates,
  safeHttpUrl
} from '../utils.js';

function uniqueGenres(events) {
  const seen = new Map();
  events.forEach((event) => {
    [...(event.genres || []), ...(event.subgenres || [])].forEach((genre) => {
      if (!genre || genre === 'Undefined') return;
      const key = genre.toLowerCase();
      if (!seen.has(key)) seen.set(key, genre);
    });
  });
  return [...seen.values()].slice(0, 8);
}

export class MatchView {
  constructor(container) {
    this.container = container;
    this.user = null;
    this.affinity = null;
    this.events = [];
    this.error = null;
    this.genre = 'all';
    this.search = '';
    this.sort = 'date';
    this.averageMatch = null;
    this.handleClick = this.handleClick.bind(this);
    this.handleInput = this.handleInput.bind(this);
    this.handleChange = this.handleChange.bind(this);
  }

  async render() {
    this.removeListeners();
    this.container.innerHTML = `
      <div class="match-page">
        <main class="match-main">
          <div id="affinitySlot">
            <div class="view-loading" role="status"><span class="material-symbols-outlined">progress_activity</span><span>Cargando tu perfil musical…</span></div>
          </div>
          <section class="filters-bar" aria-label="Filtros de eventos">
            <div class="filters-chips" id="genreFilters"></div>
            <div class="filters-selectors">
              <label class="filter-search">
                <span class="material-symbols-outlined">search</span>
                <input id="eventSearch" type="search" aria-label="Buscar evento, recinto o artista" placeholder="Buscar evento, recinto o artista" autocomplete="off">
              </label>
              <label class="filters-pill">
                <span class="material-symbols-outlined">sort</span>
                <select id="eventSort" aria-label="Ordenar eventos">
                  <option value="date">Fecha</option>
                  <option value="match">Mejor match</option>
                </select>
              </label>
            </div>
          </section>
          <div class="events-grid no-sidebar">
            <div class="events-main">
              <div class="events-header">
                <h2 class="events-title">Eventos recomendados <span class="events-count" id="eventsCount">—</span></h2>
                <span class="events-sort" id="eventsSortLabel">Ordenado por fecha</span>
              </div>
              <div id="eventsList">
                <div class="view-loading" role="status"><span class="material-symbols-outlined">progress_activity</span><span>Cargando eventos…</span></div>
              </div>
            </div>
          </div>
        </main>
      </div>
    `;

    this.container.addEventListener('click', this.handleClick);
    this.container.addEventListener('input', this.handleInput);
    this.container.addEventListener('change', this.handleChange);
    await this.loadData();
  }

  async loadData() {
    this.user = await getCurrentUser();
    const [affinity, result] = await Promise.all([
      this.user ? getAffinityProfile() : Promise.resolve(null),
      getEvents({ size: 20 })
    ]);

    this.affinity = affinity;
    this.events = result.events || [];
    this.error = result.error || null;
    this.sort = this.affinity ? 'match' : 'date';

    const scored = this.events.filter((event) => typeof event.matchScore === 'number');
    this.averageMatch = scored.length
      ? Math.round(scored.reduce((sum, event) => sum + event.matchScore, 0) / scored.length)
      : null;

    this.renderAffinity();
    this.renderFilters();
    this.renderEvents();
  }

  renderAffinity() {
    const slot = this.container.querySelector('#affinitySlot');
    if (!slot) return;

    if (!this.user) {
      slot.innerHTML = `
        <section class="affinity-hero">
          <div class="affinity-hero-grid">
            <div class="affinity-user">
              <div class="affinity-user-avatar-wrap">
                <img src="${avatarUrl([], 'EventRadar')}" alt="" class="affinity-user-avatar">
                <div class="affinity-user-badge"><span class="material-symbols-outlined">radar</span></div>
              </div>
              <div class="affinity-user-info">
                <h1>Explora eventos reales</h1>
                <p class="affinity-empty-text">Conecta Spotify para calcular tu porcentaje de afinidad con cada concierto.</p>
                <button class="affinity-sync-btn" type="button" data-action="login">
                  <span class="material-symbols-outlined">login</span> Conectar Spotify
                </button>
              </div>
            </div>
            <div class="affinity-metrics">
              <div class="affinity-breakdown">
                <div class="affinity-breakdown-item"><span class="affinity-breakdown-dot" style="background:#30d158"></span><span class="affinity-breakdown-label">Match</span><span class="affinity-breakdown-value">Sin conectar</span></div>
                <div class="affinity-breakdown-item"><span class="affinity-breakdown-dot" style="background:#0a84ff"></span><span class="affinity-breakdown-label">Eventos</span><span class="affinity-breakdown-value">${this.events.length}</span></div>
              </div>
            </div>
          </div>
        </section>
      `;
      return;
    }

    const artists = this.affinity?.topArtists || [];
    const genres = this.affinity?.topGenres || [];
    const name = this.user.display_name || this.user.id || 'Tu perfil';
    const matchValue = this.averageMatch === null ? '—' : `${this.averageMatch}%`;
    const dash = this.averageMatch === null ? 0 : this.averageMatch;
    const circumference = 2 * Math.PI * 15.9155;

    slot.innerHTML = `
      <section class="affinity-hero">
        <div class="affinity-hero-grid">
          <div class="affinity-user">
            <div class="affinity-user-avatar-wrap">
              <img src="${avatarUrl(this.user.images, name)}" alt="Foto de ${escapeHtml(name)}" class="affinity-user-avatar">
              <div class="affinity-user-badge"><span class="material-symbols-outlined">graphic_eq</span></div>
            </div>
            <div class="affinity-user-info">
              <h1>${escapeHtml(name)} <span class="affinity-spotify-badge"><span class="affinity-spotify-dot"></span>Spotify conectado</span></h1>
              ${this.affinity
                ? `<div class="affinity-artists"><span class="affinity-artists-label">Tus artistas:</span>${artists.slice(0, 4).map((artist) => `<span class="affinity-artist-chip">${escapeHtml(artist.name)}</span>`).join('') || '<span class="affinity-artists-label">Spotify no devolvió artistas.</span>'}</div>`
                : '<p class="affinity-empty-text">No se pudo cargar tu afinidad musical. Puedes reintentar sin perder la sesión.</p>'}
            </div>
          </div>
          <div class="affinity-metrics">
            <div class="affinity-ring-group">
              <div class="affinity-ring" aria-label="Match medio ${escapeHtml(matchValue)}">
                <svg class="affinity-ring-svg" viewBox="0 0 36 36" aria-hidden="true">
                  <circle cx="18" cy="18" r="15.9155" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="3"></circle>
                  <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#30d158" stroke-width="3" stroke-linecap="round" stroke-dasharray="${(dash / 100) * circumference} ${circumference}"></circle>
                </svg>
                <span class="affinity-ring-percent">${escapeHtml(matchValue)}</span>
              </div>
              <div class="affinity-breakdown">
                <div class="affinity-breakdown-item"><span class="affinity-breakdown-dot" style="background:#30d158"></span><span class="affinity-breakdown-label">Match medio</span></div>
                <div class="affinity-breakdown-item"><span class="affinity-breakdown-dot" style="background:#0a84ff"></span><span class="affinity-breakdown-label">${genres.length} géneros afines</span></div>
                <div class="affinity-breakdown-item"><span class="affinity-breakdown-dot" style="background:#bf5af2"></span><span class="affinity-breakdown-label">${artists.length} artistas top</span></div>
              </div>
            </div>
            <button class="affinity-sync-btn" type="button" data-action="refresh">
              <span class="material-symbols-outlined">refresh</span> Actualizar
            </button>
          </div>
        </div>
      </section>
    `;
  }

  renderFilters() {
    const chips = this.container.querySelector('#genreFilters');
    if (!chips) return;
    const genres = uniqueGenres(this.events);
    if (genres.length === 0) {
      chips.innerHTML = '<span class="filters-pill">Sin géneros disponibles</span>';
    } else {
      chips.innerHTML = `
        <button class="filter-chip ${this.genre === 'all' ? 'active' : ''}" type="button" data-genre="all" aria-pressed="${this.genre === 'all'}">Todos</button>
        ${genres.map((genre) => `<button class="filter-chip ${this.genre.toLowerCase() === genre.toLowerCase() ? 'active' : ''}" type="button" data-genre="${escapeHtml(genre)}" aria-pressed="${this.genre.toLowerCase() === genre.toLowerCase()}">${escapeHtml(genre)}</button>`).join('')}
      `;
    }

    const sort = this.container.querySelector('#eventSort');
    if (sort) {
      sort.value = this.sort;
      const matchOption = sort.querySelector('option[value="match"]');
      if (matchOption) matchOption.disabled = !this.affinity;
    }
    const search = this.container.querySelector('#eventSearch');
    if (search) search.value = this.search;
    const label = this.container.querySelector('#eventsSortLabel');
    if (label) label.textContent = this.sort === 'match' ? 'Ordenado por afinidad' : 'Ordenado por fecha';
  }

  filteredEvents() {
    const search = this.search.trim().toLowerCase();
    let events = this.events.filter((event) => {
      if (this.genre !== 'all') {
        const genres = [...(event.genres || []), ...(event.subgenres || [])].map((genre) => genre.toLowerCase());
        if (!genres.includes(this.genre.toLowerCase())) return false;
      }
      if (!search) return true;
      const haystack = [
        event.name,
        event.venue,
        event.city,
        ...(event.artists || []).map((artist) => artist.name)
      ].join(' ').toLowerCase();
      return haystack.includes(search);
    });

    events = [...events].sort((a, b) => {
      if (this.sort === 'match') {
        return (Number(b.matchScore) || 0) - (Number(a.matchScore) || 0);
      }
      return (a.datetime || a.date || '').localeCompare(b.datetime || b.date || '');
    });

    return events;
  }

  eventCard(event) {
    const image = eventImage(event);
    const price = formatPrice(event);
    const ticketUrl = safeHttpUrl(event.url);
    const firstArtist = event.artists?.[0]?.name;
    const hasCoords = hasValidCoordinates(event.lat, event.lng);
    const matchScore = typeof event.matchScore === 'number' ? event.matchScore : null;

    return `
      <article class="event-card-ref" aria-label="${escapeHtml(event.name)}">
        <div class="event-card-ref-image">
          ${image
            ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(event.name)}" loading="lazy">`
            : '<div class="event-image-fallback" aria-hidden="true"><span class="material-symbols-outlined">music_note</span></div>'}
          <div class="event-card-ref-image-overlay"></div>
          <div class="event-card-ref-badges">
            <span class="event-card-ref-badge-left">${escapeHtml(formatEventDate(event))}${event.city ? ` · ${escapeHtml(event.city)}` : ''}</span>
            ${matchScore !== null ? `<span class="event-card-ref-badge-match"><span class="material-symbols-outlined">bolt</span>${matchScore}% Match</span>` : ''}
          </div>
          <div class="event-card-ref-content">
            <div class="event-card-ref-info">
              <h3>${escapeHtml(event.name)}</h3>
              <div class="event-card-ref-meta">
                <span class="material-symbols-outlined">location_on</span>
                <span>${escapeHtml(event.venue || 'Recinto por confirmar')}${event.city ? `, ${escapeHtml(event.city)}` : ''}</span>
                ${formatEventTime(event) ? `<span>· ${escapeHtml(formatEventTime(event))}</span>` : ''}
              </div>
              ${event.artists?.length ? `<div class="event-card-ref-meta event-card-ref-artists"><span class="material-symbols-outlined">graphic_eq</span><span>${event.artists.slice(0, 3).map((artist) => escapeHtml(artist.name)).join(' · ')}</span></div>` : ''}
            </div>
            <div class="event-card-ref-actions">
              ${price ? `<div class="event-card-ref-price"><div class="event-card-ref-price-label">Desde</div><div class="event-card-ref-price-amount">${escapeHtml(price)}</div></div>` : ''}
              <div class="event-card-ref-buttons">
                ${hasCoords ? `<a class="event-card-ref-btn glass" href="#/ruta/${encodeURIComponent(event.id)}" aria-label="Ver ruta a ${escapeHtml(event.name)}">Ruta</a>` : ''}
                ${hasCoords ? `<a class="event-card-ref-btn glass" href="#/clima/${encodeURIComponent(event.id)}" aria-label="Ver clima para ${escapeHtml(event.name)}">Clima</a>` : ''}
                ${firstArtist ? `<a class="event-card-ref-btn glass" href="${artistHash(firstArtist)}" aria-label="Ver artista ${escapeHtml(firstArtist)}">Artista</a>` : ''}
                ${ticketUrl ? `<a class="event-card-ref-btn white" href="${escapeHtml(ticketUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Comprar entradas para ${escapeHtml(event.name)}">Entradas</a>` : ''}
              </div>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  renderEvents() {
    const list = this.container.querySelector('#eventsList');
    const count = this.container.querySelector('#eventsCount');
    if (!list) return;

    if (this.error) {
      if (count) count.textContent = '0';
      list.innerHTML = emptyState({
        icon: 'cloud_off',
        title: 'No se pudieron cargar los eventos',
        message: this.error.message || 'Revisa la configuración de Ticketmaster e inténtalo de nuevo.',
        action: '<button class="event-card-ref-btn glass" type="button" data-action="refresh">Reintentar</button>'
      });
      return;
    }

    if (this.events.length === 0) {
      if (count) count.textContent = '0';
      list.innerHTML = emptyState({
        icon: 'event_busy',
        title: 'Sin eventos próximos',
        message: 'Ticketmaster no devolvió eventos de música para las próximas fechas.'
      });
      return;
    }

    const events = this.filteredEvents();
    if (count) count.textContent = String(events.length);

    if (events.length === 0) {
      list.innerHTML = emptyState({
        icon: 'filter_alt_off',
        title: 'Ningún evento coincide',
        message: 'Prueba con otro género o borra la búsqueda.'
      });
      return;
    }

    list.innerHTML = events.map((event) => this.eventCard(event)).join('');
  }

  handleClick(event) {
    const action = event.target.closest('[data-action]')?.getAttribute('data-action');
    if (action === 'login') {
      window.location.href = '/auth/login';
      return;
    }
    if (action === 'refresh') {
      this.render();
      return;
    }

    const chip = event.target.closest('[data-genre]');
    if (chip) {
      this.genre = chip.getAttribute('data-genre');
      this.renderFilters();
      this.renderEvents();
    }
  }

  handleInput(event) {
    if (event.target.id === 'eventSearch') {
      this.search = event.target.value;
      this.renderEvents();
    }
  }

  handleChange(event) {
    if (event.target.id === 'eventSort') {
      this.sort = event.target.value;
      const label = this.container.querySelector('#eventsSortLabel');
      if (label) label.textContent = this.sort === 'match' ? 'Ordenado por afinidad' : 'Ordenado por fecha';
      this.renderEvents();
    }
  }

  removeListeners() {
    this.container.removeEventListener('click', this.handleClick);
    this.container.removeEventListener('input', this.handleInput);
    this.container.removeEventListener('change', this.handleChange);
  }

  destroy() {
    this.removeListeners();
  }
}
