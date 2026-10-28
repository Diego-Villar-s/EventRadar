import { getArtistLyrics } from '../api.js';

export class ArtistDetailView {
  constructor(container) {
    this.container = container;
    this.artistId = null;
    this.currentTab = 'letras';
  }
  
  async render() {
    const hash = window.location.hash;
    const match = hash.match(/#\/artista\/(.+)/);
    if (match) {
      this.artistId = match[1];
    }
    
    this.container.innerHTML = `
      <div class="artist-page" style="padding-top: 6rem; padding-bottom: 150px;">
        
        <main class="artist-main">
          <section class="artist-hero">
            <div class="artist-hero-glow"></div>
            <div class="artist-hero-left">
              <div class="artist-hero-avatar">
                <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuBLwMNVzQ5oLQThNgthir4qmLObantHmeReGmwgRgPb7_Ibj21uW9yUxVkqWGvCcY7y42SB_xvgD3l0X2YpQCVdBBRfhEPMhHffrK-9obDmbGmVlDDDpa6g7oCRWeN6fydvPht3cBOVu2CkAaJe7RKk-BRhjJghL8BspaSYCOjqcsZg-8TzKNkjj2QYAElUa3CdhtB6icM4oeTloPwQ_Y4-hQdFFWD-cb0Uq1HS5rkhiEp0eqrt5Ly3" alt="Rosalía" class="artist-hero-avatar-img">
                <div class="artist-hero-verified">
                  <span class="material-symbols-outlined">verified</span>
                </div>
              </div>
              <div class="artist-hero-info">
                <div class="artist-hero-name-row">
                  <h1 class="artist-hero-name">Rosalía</h1>
                  <span class="artist-hero-badge">Genius Verified</span>
                </div>
                <div class="artist-hero-meta">
                  <div class="artist-hero-meta-item">
                    <span class="material-symbols-outlined">event</span>
                    <span>Sábado 31 Mayo • 00:45h</span>
                  </div>
                  <span>•</span>
                  <span>Primavera Sound Stage</span>
                </div>
              </div>
            </div>
            <div class="artist-hero-badges">
              <div class="artist-hero-stat pink">
                <span class="material-symbols-outlined">favorite</span>
                <div class="artist-hero-stat-info">
                  <span class="artist-hero-stat-value">99.4%</span>
                  <span class="artist-hero-stat-label">Match</span>
                </div>
              </div>
              <div class="artist-hero-stat blue">
                <span class="material-symbols-outlined">mic</span>
                <div class="artist-hero-stat-info">
                  <span class="artist-hero-stat-value">Sing Ready</span>
                  <span class="artist-hero-stat-label">Vocales activadas</span>
                </div>
              </div>
            </div>
          </section>
          
          <div class="artist-grid">
            <section class="artist-main-col">
              <div class="artist-sing-panel">
                <div class="artist-sing-glow"></div>
                <div class="artist-sing-header">
                  <div class="artist-sing-status">
                    <span class="artist-sing-dot"></span>
                    <span class="artist-sing-label">Apple Music Sing</span>
                  </div>
                  <div class="artist-sing-toggle">
                    <button class="artist-sing-toggle-btn active" id="tabLetras">
                      <span class="material-symbols-outlined">mic</span>
                      <span>Letras</span>
                    </button>
                    <button class="artist-sing-toggle-btn" id="tabInfo">
                      <span class="material-symbols-outlined">info</span>
                      <span>Info</span>
                    </button>
                    <button class="artist-sing-toggle-btn" id="tabDiscografia">
                      <span class="material-symbols-outlined">album</span>
                      <span>Discografía</span>
                    </button>
                  </div>
                </div>
                <div class="artist-sing-lyrics" id="lyricsPanel">
                  <p class="artist-lyric-line">Hay un corillo saliendo del hotel...</p>
                  <div>
                    <div class="artist-lyric-line active">"Baby, no me llames, que yo estoy ocupá olvidando tus males"</div>
                    <div class="artist-lyric-line-sub">Ya decidí que esta noche se sale, con to’ mis motomamis...</div>
                  </div>
                  <p class="artist-lyric-line">Y ando despechá', oah, alocá'</p>
                  <p class="artist-lyric-line">Bajé con un flow nuevo de paquete</p>
                </div>
                <div id="infoPanel" style="display: none; position: relative; z-index: 10; color: rgba(255,255,255,0.8); padding: 1rem 0;">
                  <p style="line-height: 1.6;">Rosalía Vila Tobella es una cantante, compositora, productora y actriz española. Conocida por su estilo musical único que fusiona flamenco con pop, hip hop, trap y música urbana.</p>
                  <p style="margin-top: 1rem; color: rgba(255,255,255,0.6); font-size: 0.875rem;">Origen: Sant Esteve Sesrovires, Barcelona, España</p>
                </div>
                <div id="discografiaPanel" style="display: none; position: relative; z-index: 10; padding: 1rem 0;">
                  <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                    <div style="padding: 0.75rem; border-radius: 0.75rem; background: rgba(255,255,255,0.05); display: flex; align-items: center; gap: 0.75rem;">
                      <div style="width: 3rem; height: 3rem; border-radius: 0.5rem; background: linear-gradient(135deg, #c863fb, #3e90ff);"></div>
                      <div>
                        <div style="font-weight: 600; color: white;">MOTOMAMI</div>
                        <div style="font-size: 0.75rem; color: rgba(255,255,255,0.6);">2022 • Álbum</div>
                      </div>
                    </div>
                    <div style="padding: 0.75rem; border-radius: 0.75rem; background: rgba(255,255,255,0.05); display: flex; align-items: center; gap: 0.75rem;">
                      <div style="width: 3rem; height: 3rem; border-radius: 0.5rem; background: linear-gradient(135deg, #47e266, #aac7ff);"></div>
                      <div>
                        <div style="font-weight: 600; color: white;">EL MAL QUERER</div>
                        <div style="font-size: 0.75rem; color: rgba(255,255,255,0.6);">2018 • Álbum</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="artist-genius-note">
                  <div class="artist-genius-note-icon">
                    <span class="material-symbols-outlined">lightbulb</span>
                  </div>
                  <div class="artist-genius-note-content">
                    <div class="artist-genius-note-header">
                      <span class="artist-genius-note-title">Nota Genius</span>
                      <span class="artist-genius-note-badge">Verificado</span>
                    </div>
                    <p class="artist-genius-note-text">Inspiración en el mambo tradicional dominicano resignificado con vanguardia pop.</p>
                  </div>
                </div>
              </div>
              <div class="artist-next-pill">
                <div class="artist-next-pill-left">
                  <span class="material-symbols-outlined">queue_music</span>
                  <span>Siguiente:</span>
                  <span class="artist-next-pill-text">SAOKO • BIZCOCHITO • HENTAI</span>
                </div>
                <span class="artist-next-pill-link">Ver setlist completo</span>
              </div>
            </section>
            
            <section class="artist-side-col">
              <div class="artist-player-panel">
                <div class="artist-player-artwork">
                  <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuCWR151kVRM6bwi3z2R5QuaxmGpneoFTVV1IIMBAcLVj4M3A1KJk51F5rcQlQGQm4gj8SC4i8zUqhsUYcTuHPMpRVYfAH8_791LciLUyQUOnVn2etdfLiszI4Y4HhCk9S1a8xUqsfdNVILnd3WQx-qjI_QsNmViZKC9z88gpGS76NG3tn0DibZqLsWosA1IrLUWgpuFTY3LrAdDeTEapCMmviWWYP_M2bUOAzoT5PG8ukF-2nJTdQQ9" alt="DESPECHÁ" class="artist-player-artwork-img">
                  <div class="artist-player-artwork-overlay"></div>
                  <div class="artist-player-live-badge">
                    <span class="artist-player-live-dot"></span>
                    <span>En vivo</span>
                  </div>
                </div>
                <div class="artist-player-meta">
                  <div class="artist-player-track-info">
                    <div class="artist-player-track-name">DESPECHÁ</div>
                    <div class="artist-player-track-artist">Rosalía • Primavera Sound 2025</div>
                  </div>
                  <button class="artist-player-fav">
                    <span class="material-symbols-outlined">star</span>
                  </button>
                </div>
                <div class="artist-player-progress">
                  <div class="artist-player-progress-bar">
                    <div class="artist-player-progress-fill">
                      <div class="artist-player-progress-handle"></div>
                    </div>
                  </div>
                  <div class="artist-player-time">
                    <span>1:04</span>
                    <span>-1:33</span>
                  </div>
                </div>
                <div class="artist-player-controls">
                  <button class="artist-player-btn">
                    <span class="material-symbols-outlined">fast_rewind</span>
                  </button>
                  <button class="artist-player-btn play">
                    <span class="material-symbols-outlined">pause</span>
                  </button>
                  <button class="artist-player-btn">
                    <span class="material-symbols-outlined">fast_forward</span>
                  </button>
                </div>
                <div class="artist-playlist">
                  <div class="artist-playlist-header">
                    <span>Festival Playlist</span>
                    <span>4 temas</span>
                  </div>
                  <div class="artist-playlist-item active">
                    <div class="artist-playlist-item-left">
                      <div class="artist-playlist-item-icon active">
                        <span class="material-symbols-outlined">volume_up</span>
                      </div>
                      <div class="artist-playlist-item-info">
                        <div class="artist-playlist-item-name">DESPECHÁ</div>
                        <div class="artist-playlist-item-artist">Rosalía</div>
                      </div>
                    </div>
                    <span class="artist-playlist-item-duration">2:37</span>
                  </div>
                  <div class="artist-playlist-item">
                    <div class="artist-playlist-item-left">
                      <div class="artist-playlist-item-icon">
                        <span class="artist-playlist-item-num">2</span>
                      </div>
                      <div class="artist-playlist-item-info">
                        <div class="artist-playlist-item-name">SAOKO</div>
                        <div class="artist-playlist-item-artist">Rosalía</div>
                      </div>
                    </div>
                    <span class="artist-playlist-item-duration">2:50</span>
                    <span class="material-symbols-outlined artist-playlist-item-play">play_arrow</span>
                  </div>
                  <div class="artist-playlist-item">
                    <div class="artist-playlist-item-left">
                      <div class="artist-playlist-item-icon">
                        <span class="artist-playlist-item-num">3</span>
                      </div>
                      <div class="artist-playlist-item-info">
                        <div class="artist-playlist-item-name">BIZCOCHITO</div>
                        <div class="artist-playlist-item-artist">Rosalía</div>
                      </div>
                    </div>
                    <span class="artist-playlist-item-duration">1:49</span>
                    <span class="material-symbols-outlined artist-playlist-item-play">play_arrow</span>
                  </div>
                  <div class="artist-playlist-item">
                    <div class="artist-playlist-item-left">
                      <div class="artist-playlist-item-icon">
                        <span class="artist-playlist-item-num">4</span>
                      </div>
                      <div class="artist-playlist-item-info">
                        <div class="artist-playlist-item-name">LA FAMA</div>
                        <div class="artist-playlist-item-artist">Rosalía ft. The Weeknd</div>
                      </div>
                    </div>
                    <span class="artist-playlist-item-duration">3:08</span>
                    <span class="material-symbols-outlined artist-playlist-item-play">play_arrow</span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
        
        <aside class="artist-dock">
          <div class="artist-dock-left">
            <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuCWR151kVRM6bwi3z2R5QuaxmGpneoFTVV1IIMBAcLVj4M3A1KJk51F5rcQlQGQm4gj8SC4i8zUqhsUYcTuHPMpRVYfAH8_791LciLUyQUOnVn2etdfLiszI4Y4HhCk9S1a8xUqsfdNVILnd3WQx-qjI_QsNmViZKC9z88gpGS76NG3tn0DibZqLsWosA1IrLUWgpuFTY3LrAdDeTEapCMmviWWYP_M2bUOAzoT5PG8ukF-2nJTdQQ9" alt="Thumbnail" class="artist-dock-art">
            <div class="artist-dock-info">
              <div class="artist-dock-track">DESPECHÁ (Live Edit)</div>
              <div class="artist-dock-artist">Rosalía • Apple Sing</div>
            </div>
          </div>
          <div class="artist-dock-controls">
            <button class="artist-dock-btn">
              <span class="material-symbols-outlined">fast_rewind</span>
            </button>
            <button class="artist-dock-btn play">
              <span class="material-symbols-outlined">pause</span>
            </button>
            <button class="artist-dock-btn">
              <span class="material-symbols-outlined">fast_forward</span>
            </button>
          </div>
          <div class="artist-dock-right">
            <div class="artist-dock-volume">
              <span class="material-symbols-outlined artist-dock-volume-icon">volume_up</span>
              <div class="artist-dock-volume-bar">
                <div class="artist-dock-volume-fill"></div>
              </div>
            </div>
            <button class="artist-dock-mic">
              <span class="material-symbols-outlined">mic</span>
            </button>
          </div>
        </aside>
      </div>
    `;
    
    this.initTabs();
  }
  
  initTabs() {
    const tabLetras = document.getElementById('tabLetras');
    const tabInfo = document.getElementById('tabInfo');
    const tabDiscografia = document.getElementById('tabDiscografia');
    const lyricsPanel = document.getElementById('lyricsPanel');
    const infoPanel = document.getElementById('infoPanel');
    const discografiaPanel = document.getElementById('discografiaPanel');
    
    tabLetras.addEventListener('click', () => {
      tabLetras.classList.add('active');
      tabInfo.classList.remove('active');
      tabDiscografia.classList.remove('active');
      lyricsPanel.style.display = 'flex';
      infoPanel.style.display = 'none';
      discografiaPanel.style.display = 'none';
    });
    
    tabInfo.addEventListener('click', () => {
      tabInfo.classList.add('active');
      tabLetras.classList.remove('active');
      tabDiscografia.classList.remove('active');
      lyricsPanel.style.display = 'none';
      infoPanel.style.display = 'block';
      discografiaPanel.style.display = 'none';
    });
    
    tabDiscografia.addEventListener('click', () => {
      tabDiscografia.classList.add('active');
      tabLetras.classList.remove('active');
      tabInfo.classList.remove('active');
      lyricsPanel.style.display = 'none';
      infoPanel.style.display = 'none';
      discografiaPanel.style.display = 'block';
    });
  }
}
