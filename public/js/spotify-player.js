class SpotifyPlayer {
  constructor() {
    this.element = document.getElementById('miniPlayer');
    this.playBtn = document.getElementById('miniPlayerPlay');
    this.titleEl = document.getElementById('miniPlayerTitle');
    this.subtitleEl = document.getElementById('miniPlayerSubtitle');
    this.spotifyBtn = document.getElementById('miniPlayerSpotify');
    this.embedContainer = document.getElementById('spotifyEmbedContainer');
    this.api = null;
    this.controller = null;
    this.currentTrack = null;
    this.pendingUri = null;
    this.isPlaying = false;

    this.init();
  }

  init() {
    this.updateControls();

    window.onSpotifyIframeApiReady = (IFrameAPI) => this.onApiReady(IFrameAPI);
    if (window.SpotifyIframeApi) this.onApiReady(window.SpotifyIframeApi);

    this.playBtn?.addEventListener('click', () => {
      if (!this.controller) return;
      if (this.isPlaying) this.controller.pause();
      else this.controller.play();
    });

    this.spotifyBtn?.addEventListener('click', () => {
      const url = this.currentTrack?.externalUrl;
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
    });
  }

  onApiReady(IFrameAPI) {
    if (this.api) return;
    this.api = IFrameAPI;
    if (this.pendingUri) this.createController(this.pendingUri);
  }

  createController(uri) {
    if (!this.api || !this.embedContainer) return;
    if (this.controller) {
      this.controller.loadUri(uri);
      this.controller.play();
      return;
    }

    this.pendingUri = uri;
    this.api.createController(
      this.embedContainer,
      { uri, width: '100%', height: '80' },
      (EmbedController) => {
        this.controller = EmbedController;
        this.controller.addListener('playback_update', (event) => {
          this.isPlaying = !event.data.isPaused;
          this.updatePlayButton();
        });
        this.updateControls();
        this.controller.play();
      }
    );
  }

  playTrack(track = {}) {
    this.currentTrack = track;
    if (this.element) this.element.style.display = 'flex';
    if (this.titleEl) this.titleEl.textContent = track.name || 'Pista de Spotify';
    if (this.subtitleEl) this.subtitleEl.textContent = track.artist || 'EventRadar';
    this.updateControls();

    if (track.uri) {
      this.pendingUri = track.uri;
      if (this.api) this.createController(track.uri);
    }
  }

  updateControls() {
    if (this.playBtn) {
      this.playBtn.disabled = !this.controller;
      this.playBtn.title = this.controller ? 'Reproducir o pausar' : 'El reproductor de Spotify aún no está disponible';
    }
    if (this.spotifyBtn) {
      this.spotifyBtn.disabled = !this.currentTrack?.externalUrl;
      this.spotifyBtn.title = this.currentTrack?.externalUrl ? 'Abrir en Spotify' : 'Abre una pista para habilitar este botón';
    }
    this.updatePlayButton();
  }

  updatePlayButton() {
    if (!this.playBtn) return;
    const icon = this.playBtn.querySelector('.material-symbols-outlined');
    if (icon) icon.textContent = this.isPlaying ? 'pause' : 'play_arrow';
  }
}

export const spotifyPlayer = new SpotifyPlayer();
