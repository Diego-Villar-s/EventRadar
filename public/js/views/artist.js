import { searchArtist, getArtistLyrics } from '../api.js';

export class ArtistView {
  constructor(container) {
    this.container = container;
  }
  
  render() {
    this.container.innerHTML = `
      <div class="view-header">
        <div>
          <div class="view-breadcrumb">
            <span>Eventos</span>
            <span>•</span>
            <span style="color: var(--accent-blue);">Artista & Letras</span>
          </div>
          <h1 class="view-title">Previa, Letras y Artista</h1>
        </div>
      </div>
      
      <section class="artist-hero glass-card">
        <div class="artist-hero-bg"></div>
        <div class="artist-hero-content">
          <div class="artist-hero-left">
            <img src="https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400" alt="Artista" class="artist-hero-img">
            <div class="artist-hero-info">
              <div class="artist-hero-name-row">
                <h2 class="artist-hero-name">Rosalía</h2>
                <span class="badge badge-blue">Verificado</span>
              </div>
              <div class="artist-hero-meta">
                <span>Primavera Sound • Sábado 31 Mayo • 00:45h</span>
              </div>
            </div>
          </div>
          <div class="artist-hero-right">
            <div class="artist-stat-card">
              <span class="material-symbols-outlined" style="color: var(--accent-green); font-size: 1.5rem;">favorite</span>
              <div>
                <div class="artist-stat-value">99.4%</div>
                <div class="artist-stat-label">Match</div>
              </div>
            </div>
            <div class="artist-stat-card">
              <span class="material-symbols-outlined" style="color: var(--accent-blue); font-size: 1.5rem;">mic</span>
              <div>
                <div class="artist-stat-value">Sing Ready</div>
                <div class="artist-stat-label">Karaoke</div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <div class="artist-grid">
        <section class="artist-lyrics glass-card">
          <div class="artist-section-header">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: var(--accent-green);"></span>
              <span class="text-label-sm">APPLE MUSIC SING</span>
            </div>
            <div class="artist-tabs">
              <button class="artist-tab active">Modo Canta</button>
              <button class="artist-tab">Notas Genius</button>
            </div>
          </div>
          <div class="lyrics-content">
            <div class="lyrics-line inactive">Hay un corillo saliendo del hotel...</div>
            <div class="lyrics-line active">
              "Baby, no me llames, que yo estoy ocupá olvidando tus males"
              <div class="lyrics-line-sub">Ya decidí que esta noche se sale, con to' mis motomamis...</div>
            </div>
            <div class="lyrics-line inactive">Y ando despechá', oah, alocá'</div>
            <div class="lyrics-line inactive">Bajé con un flow nuevo de paquete</div>
          </div>
          <div class="genius-note">
            <div class="genius-note-icon">
              <span class="material-symbols-outlined">lightbulb</span>
            </div>
            <div class="genius-note-content">
              <div class="genius-note-header">
                <span class="text-label-sm" style="color: var(--accent-purple);">NOTA GENIUS</span>
                <span class="text-body-sm" style="color: var(--text-tertiary);">Verificado</span>
              </div>
              <p class="genius-note-text">Inspiración en el mambo tradicional dominicano resignificado con vanguardia pop.</p>
            </div>
          </div>
        </section>
        
        <section class="artist-player glass-card">
          <div class="artist-player-artwork">
            <img src="https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500" alt="Album">
            <div class="artist-player-badge">
              <span style="width: 6px; height: 6px; border-radius: 50%; background: var(--accent-green);"></span>
              <span>En vivo</span>
            </div>
          </div>
          <div class="artist-player-info">
            <div>
              <h3 class="artist-player-title">DESPECHÁ</h3>
              <p class="artist-player-artist">Rosalía • MOTOMAMI</p>
            </div>
            <button class="artist-player-fav">
              <span class="material-symbols-outlined">favorite_border</span>
            </button>
          </div>
          <div class="artist-player-progress">
            <div class="artist-player-bar">
              <div class="artist-player-bar-fill" style="width: 40%;"></div>
            </div>
            <div class="artist-player-time">
              <span>1:04</span>
              <span>-1:33</span>
            </div>
          </div>
          <div class="artist-player-controls">
            <button class="artist-player-btn">
              <span class="material-symbols-outlined">skip_previous</span>
            </button>
            <button class="artist-player-play">
              <span class="material-symbols-outlined">play_arrow</span>
            </button>
            <button class="artist-player-btn">
              <span class="material-symbols-outlined">skip_next</span>
            </button>
          </div>
          <div class="artist-playlist">
            <div class="artist-playlist-header">
              <span class="text-label-sm" style="color: var(--text-tertiary);">PLAYLIST FESTIVAL</span>
              <span class="text-body-sm" style="color: var(--text-tertiary);">4 temas</span>
            </div>
            <div class="artist-playlist-item active">
              <span class="material-symbols-outlined" style="color: var(--accent-blue);">volume_up</span>
              <div class="artist-playlist-info">
                <div class="artist-playlist-title">DESPECHÁ</div>
                <div class="artist-playlist-artist">Rosalía</div>
              </div>
              <span class="artist-playlist-time">2:37</span>
            </div>
            <div class="artist-playlist-item">
              <span style="color: var(--text-tertiary); width: 24px; text-align: center;">2</span>
              <div class="artist-playlist-info">
                <div class="artist-playlist-title">BIZCOCHITO</div>
                <div class="artist-playlist-artist">Rosalía</div>
              </div>
              <span class="artist-playlist-time">1:49</span>
            </div>
            <div class="artist-playlist-item">
              <span style="color: var(--text-tertiary); width: 24px; text-align: center;">3</span>
              <div class="artist-playlist-info">
                <div class="artist-playlist-title">MOTOMAMI</div>
                <div class="artist-playlist-artist">Rosalía</div>
              </div>
              <span class="artist-playlist-time">2:01</span>
            </div>
          </div>
        </section>
      </div>
    `;
  }
}
