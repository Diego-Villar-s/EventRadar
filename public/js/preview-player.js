class PreviewPlayer {
  constructor() {
    this.element = document.getElementById('miniPlayer');
    this.playBtn = document.getElementById('miniPlayerPlay');
    this.titleEl = document.getElementById('miniPlayerTitle');
    this.subtitleEl = document.getElementById('miniPlayerSubtitle');
    this.openBtn = document.getElementById('miniPlayerOpen');
    this.audio = new Audio();
    this.audio.preload = 'none';
    this.currentTrack = null;
    this.isPlaying = false;

    this.init();
  }

  init() {
    this.audio.addEventListener('play', () => {
      this.isPlaying = true;
      this.updatePlayButton();
    });

    this.audio.addEventListener('pause', () => {
      this.isPlaying = false;
      this.updatePlayButton();
    });

    this.audio.addEventListener('ended', () => {
      this.isPlaying = false;
      this.updatePlayButton();
    });

    this.audio.addEventListener('error', () => {
      this.isPlaying = false;
      if (this.subtitleEl) this.subtitleEl.textContent = 'Vista previa no disponible';
      this.updatePlayButton();
    });

    this.playBtn?.addEventListener('click', () => this.toggle());
    this.openBtn?.addEventListener('click', () => {
      const url = this.currentTrack?.externalUrl;
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
    });

    this.updateControls();
  }

  toggle() {
    if (!this.currentTrack?.previewUrl) return;
    if (this.audio.paused) {
      this.startPlayback();
    } else {
      this.audio.pause();
    }
  }

  startPlayback() {
    const playback = this.audio.play();
    if (playback?.catch) {
      playback.catch(() => {
        if (this.subtitleEl) this.subtitleEl.textContent = 'Pulsa play para escuchar la vista previa';
      });
    }
  }

  playTrack(track = {}) {
    if (!track.previewUrl) return false;

    this.currentTrack = track;
    if (this.element) this.element.style.display = 'flex';
    if (this.titleEl) this.titleEl.textContent = track.name || 'Vista previa';
    if (this.subtitleEl) {
      this.subtitleEl.textContent = `${track.artist || 'EventRadar'} · 30 s de Deezer`;
    }

    this.audio.src = track.previewUrl;
    this.startPlayback();

    this.updateControls();
    return true;
  }

  updateControls() {
    if (this.playBtn) {
      this.playBtn.disabled = !this.currentTrack?.previewUrl;
      this.playBtn.title = this.currentTrack?.previewUrl
        ? 'Reproducir o pausar la vista previa'
        : 'Selecciona una canción con vista previa';
    }
    if (this.openBtn) {
      this.openBtn.disabled = !this.currentTrack?.externalUrl;
      this.openBtn.title = this.currentTrack?.externalUrl
        ? 'Abrir en Deezer'
        : 'Abre una pista para habilitar este botón';
    }
    this.updatePlayButton();
  }

  updatePlayButton() {
    if (!this.playBtn) return;
    const icon = this.playBtn.querySelector('.material-symbols-outlined');
    if (icon) icon.textContent = this.isPlaying ? 'pause' : 'play_arrow';
  }
}

export const previewPlayer = new PreviewPlayer();
