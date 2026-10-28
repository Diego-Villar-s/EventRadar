import { getArtistDetails, getArtistLyrics, searchArtist } from '../api.js';
import { SegmentedControl } from '../components/segmented.js';
import { spotifyPlayer } from '../spotify-player.js';
import {
  avatarUrl,
  emptyState,
  escapeHtml,
  formatDuration,
  safeHttpUrl
} from '../utils.js';

function formatFollowers(value) {
  if (!Number.isFinite(Number(value))) return '—';
  return new Intl.NumberFormat('es-ES', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value));
}

export class ArtistDetailView {
  constructor(container, props = {}) {
    this.container = container;
    this.artistId = props.artistId || null;
    this.artist = null;
    this.genius = null;
    this.geniusError = null;
    this.error = null;
    this.activeTab = 'lyrics';
    this.selectedTrack = null;
    this.lyrics = null;
    this.lyricsError = null;
    this.lyricsLoading = false;
    this.lyricsRequest = 0;
    this.segmented = null;
    this.handleClick = this.handleClick.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleKeydown = this.handleKeydown.bind(this);
  }

  async render() {
    this.container.innerHTML = `
      <div class="artist-page">
        <main class="artist-main">
          <div id="artistContent">
            <div class="view-loading" role="status"><span class="material-symbols-outlined">progress_activity</span><span>Cargando artista…</span></div>
          </div>
        </main>
      </div>
    `;
    this.container.addEventListener('click', this.handleClick);
    this.container.addEventListener('submit', this.handleSubmit);
    this.container.addEventListener('keydown', this.handleKeydown);

    if (!this.artistId) {
      this.renderSearch();
      return;
    }
    await this.loadArtist();
  }

  renderSearch(message = '') {
    const content = this.container.querySelector('#artistContent');
    if (!content) return;
    content.innerHTML = `
      <section class="artist-search-shell">
        <span class="welcome-kicker"><span class="material-symbols-outlined">mic</span> Artistas</span>
        <h1>Encuentra un artista real en Spotify</h1>
        <p>Busca por nombre para ver su ficha, sus canciones más escuchadas y su discografía.</p>
        ${message ? `<p class="artist-search-error" role="alert">${escapeHtml(message)}</p>` : ''}
        <form id="artistSearchForm" class="artist-search-form">
          <label for="artistSearchInput">Nombre del artista</label>
          <div>
            <input id="artistSearchInput" name="name" type="search" placeholder="Ej. Coldplay" autocomplete="off" required>
            <button class="welcome-login" type="submit"><span class="material-symbols-outlined">search</span> Buscar</button>
          </div>
        </form>
        <div id="artistSearchResults" class="artist-search-results"></div>
      </section>
    `;
    content.querySelector('#artistSearchInput')?.focus();
  }

  async loadArtist() {
    const result = await getArtistDetails(this.artistId);
    this.artist = result.artist;
    this.genius = result.genius || null;
    this.geniusError = result.geniusError || null;
    this.error = result.error || null;

    if (!this.artist) {
      this.renderSearch(this.error?.message || 'No se pudo cargar el artista en Spotify.');
      return;
    }
    this.renderArtist();
  }

  renderArtist() {
    const content = this.container.querySelector('#artistContent');
    if (!content) return;
    const artist = this.artist;
    const image = safeHttpUrl(artist.image) || avatarUrl([], artist.name);
    const spotifyUrl = safeHttpUrl(artist.externalUrl);
    const genres = (artist.genres || []).slice(0, 4);
    const followers = formatFollowers(artist.followers);
    const hasPopularity = Number.isFinite(Number(artist.popularity));

    content.innerHTML = `
      <section class="artist-hero">
        <div class="artist-hero-glow"></div>
        <div class="artist-hero-left">
          <div class="artist-hero-avatar">
            <img src="${escapeHtml(image)}" alt="${escapeHtml(artist.name)}" class="artist-hero-avatar-img">
            <span class="artist-hero-verified" title="Datos de Spotify"><span class="material-symbols-outlined">verified</span></span>
          </div>
          <div class="artist-hero-info">
            <div class="artist-hero-name-row">
              <h1 class="artist-hero-name">${escapeHtml(artist.name)}</h1>
              ${hasPopularity ? `<span class="artist-hero-badge">Popularidad ${escapeHtml(String(artist.popularity))}/100</span>` : ''}
            </div>
            <div class="artist-hero-meta">
              ${genres.length ? genres.map((genre) => `<span class="affinity-artist-chip">${escapeHtml(genre)}</span>`).join('') : '<span class="artist-hero-meta-item">Spotify no devolvió géneros.</span>'}
            </div>
            <div class="artist-hero-meta">
              <span class="artist-hero-meta-item"><span class="material-symbols-outlined">groups</span>${followers} seguidores</span>
              ${spotifyUrl ? `<a class="artist-hero-meta-item" href="${escapeHtml(spotifyUrl)}" target="_blank" rel="noopener noreferrer"><span class="material-symbols-outlined">open_in_new</span>Abrir en Spotify</a>` : ''}
            </div>
          </div>
        </div>
        <div class="artist-hero-badges">
          <div class="artist-hero-stat blue"><span class="material-symbols-outlined">library_music</span><div class="artist-hero-stat-info"><span class="artist-hero-stat-value">${artist.albums?.length || 0}</span><span class="artist-hero-stat-label">Álbumes y singles</span></div></div>
          <div class="artist-hero-stat pink"><span class="material-symbols-outlined">graphic_eq</span><div class="artist-hero-stat-info"><span class="artist-hero-stat-value">${artist.topTracks?.length || 0}</span><span class="artist-hero-stat-label">Top canciones</span></div></div>
        </div>
      </section>

      <div id="artistTabs" class="artist-tabs"></div>
      <div id="artistTabContent"></div>
    `;

    this.segmented = new SegmentedControl(content.querySelector('#artistTabs'), {
      items: [
        { label: 'Letras', value: 'lyrics' },
        { label: 'Discografía', value: 'albums' },
        { label: 'Biografía', value: 'bio' }
      ],
      activeIndex: 0,
      onChange: (index, item) => {
        this.activeTab = item.value;
        this.renderTabContent();
      }
    });

    this.selectedTrack = this.artist.topTracks?.[0] || null;
    this.renderTabContent();
    if (this.selectedTrack) this.loadLyrics();
  }

  renderTabContent() {
    const content = this.container.querySelector('#artistTabContent');
    if (!content) return;

    if (this.activeTab === 'albums') {
      content.innerHTML = this.renderAlbums();
      return;
    }
    if (this.activeTab === 'bio') {
      content.innerHTML = this.renderBiography();
      return;
    }
    content.innerHTML = this.renderLyricsTab();
  }

  renderLyricsTab() {
    const tracks = this.artist.topTracks || [];
    if (tracks.length === 0) {
      return emptyState({
        icon: 'music_off',
        title: 'Sin canciones disponibles',
        message: 'Spotify no devolvió canciones populares para este artista.'
      });
    }

    return `
      <div class="artist-grid">
        <div class="artist-main-col">
          <section class="artist-sing-panel">
            <div class="artist-sing-glow"></div>
            <div class="artist-sing-header">
              <div class="artist-sing-status"><span class="artist-sing-dot"></span><span class="artist-sing-label">Letra · Musixmatch</span></div>
              ${this.selectedTrack ? `<span class="artist-hero-badge">${escapeHtml(this.selectedTrack.name)}</span>` : ''}
            </div>
            <div id="lyricsPanel">${this.renderLyricsPanel()}</div>
          </section>
        </div>
        <aside class="artist-side-col">
          <section class="artist-playlist">
            <div class="artist-playlist-header">
              <span class="material-symbols-outlined">queue_music</span>
              <span>Top canciones en Spotify</span>
            </div>
            ${tracks.map((track, index) => `
              <div class="artist-playlist-item ${this.selectedTrack?.id === track.id ? 'active' : ''}" data-track-index="${index}" role="button" tabindex="0">
                <div class="artist-playlist-item-left">
                  <span class="artist-playlist-item-icon ${this.selectedTrack?.id === track.id ? 'active' : ''}"><span class="material-symbols-outlined">${this.selectedTrack?.id === track.id ? 'graphic_eq' : 'music_note'}</span></span>
                  <div class="artist-playlist-item-info">
                    <span class="artist-playlist-item-name">${escapeHtml(track.name)}</span>
                    <span class="artist-playlist-item-artist">${escapeHtml((track.artists || []).map((item) => item.name).join(', ') || this.artist.name)}</span>
                  </div>
                </div>
                <div class="artist-playlist-item-right">
                  <span class="artist-playlist-item-duration">${escapeHtml(formatDuration(track.durationMs))}</span>
                  <button class="artist-playlist-item-play" type="button" data-play-index="${index}" aria-label="Reproducir ${escapeHtml(track.name)}" ${track.uri ? '' : 'disabled title="Spotify no proporcionó una URI reproducible"'}>
                    <span class="material-symbols-outlined">${track.uri ? 'play_arrow' : 'block'}</span>
                  </button>
                </div>
              </div>
            `).join('')}
          </section>
        </aside>
      </div>
    `;
  }

  renderLyricsPanel() {
    if (!this.selectedTrack) {
      return emptyState({ icon: 'lyrics', title: 'Elige una canción', message: 'Selecciona una canción para intentar cargar su letra.' });
    }
    if (this.lyricsLoading) {
      return '<div class="view-loading" role="status"><span class="material-symbols-outlined">progress_activity</span><span>Cargando letra…</span></div>';
    }
    if (this.lyricsError) {
      return emptyState({
        icon: 'lyrics',
        title: 'Letra no disponible',
        message: this.lyricsError.message || 'Musixmatch no devolvió la letra.',
        action: '<button class="event-card-ref-btn glass" type="button" data-action="retry-lyrics">Reintentar</button>'
      });
    }
    if (!this.lyrics) {
      return emptyState({
        icon: 'lyrics',
        title: 'Sin letra cargada',
        message: 'Selecciona una canción para cargar su letra.'
      });
    }

    return `
      <div class="artist-lyrics-text">${escapeHtml(this.lyrics).replace(/\n/g, '<br>')}</div>
      ${this.lyricsDisclaimer ? `<p class="artist-lyrics-disclaimer">${escapeHtml(this.lyricsDisclaimer)}</p>` : ''}
      <p class="artist-lyrics-disclaimer">Fragmento gratuito proporcionado por Musixmatch. La letra completa puede requerir una licencia.</p>
    `;
  }

  renderAlbums() {
    const albums = this.artist.albums || [];
    if (albums.length === 0) {
      return emptyState({
        icon: 'album',
        title: 'Sin discografía disponible',
        message: 'Spotify no devolvió álbumes ni singles para este artista.'
      });
    }
    return `
      <div class="artist-albums-grid">
        ${albums.map((album) => {
          const image = safeHttpUrl(album.image);
          const url = safeHttpUrl(album.externalUrl);
          const tag = url ? 'a' : 'div';
          const attrs = url ? `href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer"` : '';
          return `
            <${tag} class="artist-album-card" ${attrs}>
              ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(album.name)}" loading="lazy">` : `<div class="event-image-fallback"><span class="material-symbols-outlined">album</span></div>`}
              <span class="artist-album-name">${escapeHtml(album.name)}</span>
              <span class="artist-album-meta">${escapeHtml(album.type || 'Álbum')}${album.releaseDate ? ` · ${escapeHtml(album.releaseDate.slice(0, 4))}` : ''}</span>
            </${tag}>
          `;
        }).join('')}
      </div>
    `;
  }

  renderBiography() {
    const description = this.genius?.description;
    const geniusUrl = safeHttpUrl(this.genius?.url);
    if (!description) {
      return emptyState({
        icon: 'menu_book',
        title: 'Biografía no disponible',
        message: this.geniusError?.message || 'Genius no devolvió una biografía para este artista.',
        action: geniusUrl ? `<a class="event-card-ref-btn glass" href="${escapeHtml(geniusUrl)}" target="_blank" rel="noopener noreferrer">Abrir en Genius</a>` : ''
      });
    }
    return `
      <section class="artist-bio">
        <h2>Biografía</h2>
        <p>${escapeHtml(description)}</p>
        ${geniusUrl ? `<a class="route-action-btn" href="${escapeHtml(geniusUrl)}" target="_blank" rel="noopener noreferrer"><span class="material-symbols-outlined">open_in_new</span> Leer en Genius</a>` : ''}
        <div class="artist-bio-stats">
          <span><strong>${formatFollowers(this.artist.followers)}</strong> seguidores en Spotify</span>
          <span><strong>${this.artist.albums?.length || 0}</strong> álbumes y singles</span>
        </div>
      </section>
    `;
  }

  async loadLyrics() {
    if (!this.selectedTrack || !this.artist) return;
    const requestId = ++this.lyricsRequest;
    this.lyricsLoading = true;
    this.lyricsError = null;
    this.lyrics = null;
    this.updateLyricsPanel();

    const result = await getArtistLyrics(this.artist.name, this.selectedTrack.name);
    if (requestId !== this.lyricsRequest) return;
    this.lyricsLoading = false;
    this.lyrics = result.lyrics || null;
    this.lyricsDisclaimer = result.disclaimer || null;
    this.lyricsError = result.error ? result.error : null;
    this.updateLyricsPanel();
  }

  updateLyricsPanel() {
    const panel = this.container.querySelector('#lyricsPanel');
    if (panel) panel.innerHTML = this.renderLyricsPanel();
  }

  selectTrack(index) {
    const track = this.artist.topTracks?.[index];
    if (!track) return;
    this.selectedTrack = track;
    this.activeTab = 'lyrics';
    this.segmented?.setActive(0);
    this.renderTabContent();
    this.loadLyrics();
  }

  async runSearch(name) {
    const results = this.container.querySelector('#artistSearchResults');
    if (!results) return;
    if (!name.trim()) return;
    results.innerHTML = '<div class="view-loading" role="status"><span class="material-symbols-outlined">progress_activity</span><span>Buscando en Spotify…</span></div>';
    const response = await searchArtist(name);
    if (response.error) {
      results.innerHTML = emptyState({
        icon: 'search_off',
        title: 'No se pudo buscar',
        message: response.error.message
      });
      return;
    }
    if (!response.artists?.length) {
      results.innerHTML = emptyState({
        icon: 'person_search',
        title: 'Sin resultados',
        message: 'Spotify no encontró artistas con ese nombre.'
      });
      return;
    }
    results.innerHTML = response.artists.map((artist) => {
      const image = safeHttpUrl(artist.image);
      return `
        <a class="artist-search-result" href="#/artista/${encodeURIComponent(artist.id)}">
          ${image ? `<img src="${escapeHtml(image)}" alt="" loading="lazy">` : `<span class="artist-search-avatar"><span class="material-symbols-outlined">person</span></span>`}
          <span><strong>${escapeHtml(artist.name)}</strong><small>${escapeHtml((artist.genres || []).slice(0, 2).join(' · ') || 'Artista de Spotify')}</small></span>
          <span class="material-symbols-outlined">chevron_right</span>
        </a>
      `;
    }).join('');
  }

  handleKeydown(event) {
    if (!['Enter', ' '].includes(event.key)) return;
    const row = event.target.closest('[data-track-index]');
    if (!row || event.target.closest('[data-play-index]')) return;
    event.preventDefault();
    this.selectTrack(Number(row.getAttribute('data-track-index')));
  }

  handleClick(event) {
    const play = event.target.closest('[data-play-index]');
    if (play) {
      event.stopPropagation();
      const index = Number(play.getAttribute('data-play-index'));
      const track = this.artist?.topTracks?.[index];
      if (track?.uri) {
        spotifyPlayer.playTrack({
          name: track.name,
          artist: this.artist.name,
          uri: track.uri,
          externalUrl: track.externalUrl
        });
      }
      return;
    }

    const row = event.target.closest('[data-track-index]');
    if (row) {
      this.selectTrack(Number(row.getAttribute('data-track-index')));
      return;
    }

    if (event.target.closest('[data-action="retry-lyrics"]')) {
      this.loadLyrics();
    }
  }

  handleSubmit(event) {
    if (event.target.id !== 'artistSearchForm') return;
    event.preventDefault();
    const input = event.target.querySelector('input[name="name"]');
    this.runSearch(input?.value || '');
  }

  destroy() {
    this.container.removeEventListener('click', this.handleClick);
    this.container.removeEventListener('submit', this.handleSubmit);
    this.container.removeEventListener('keydown', this.handleKeydown);
    this.segmented?.destroy();
    this.segmented = null;
  }
}
