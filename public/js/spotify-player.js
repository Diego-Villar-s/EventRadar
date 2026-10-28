class SpotifyPlayer {
  constructor() {
    this.element = document.getElementById('miniPlayer');
    this.playBtn = document.getElementById('miniPlayerPlay');
    this.titleEl = document.getElementById('miniPlayerTitle');
    this.subtitleEl = document.getElementById('miniPlayerSubtitle');
    this.spotifyBtn = document.getElementById('miniPlayerSpotify');
    this.embedContainer = document.getElementById('spotifyEmbedContainer');
    this.controller = null;
    this.currentTrack = null;
    this.isPlaying = false;
    
    this.init();
  }
  
  init() {
    if (window.SpotifyIframeApi) {
      window.onSpotifyIframeApiReady = (IFrameAPI) => {
        const options = {
          uri: 'spotify:playlist:37i9dQZF1DX4dyzvuaRJ0n',
          width: '100%',
          height: '80'
        };
        const callback = (EmbedController) => {
          this.controller = EmbedController;
          this.controller.addListener('playback_update', e => {
            this.isPlaying = !e.data.isPaused;
            this.updatePlayButton();
          });
        };
        IFrameAPI.createController(this.embedContainer, options, callback);
      };
    }
    
    if (this.playBtn) {
      this.playBtn.addEventListener('click', () => {
        if (this.controller) {
          if (this.isPlaying) {
            this.controller.pause();
          } else {
            this.controller.play();
          }
        }
      });
    }
    
    if (this.spotifyBtn) {
      this.spotifyBtn.addEventListener('click', () => {
        if (this.currentTrack?.spotifyUrl) {
          window.open(this.currentTrack.spotifyUrl, '_blank');
        } else {
          window.open('https://open.spotify.com', '_blank');
        }
      });
    }
  }
  
  playTrack(track) {
    this.currentTrack = track;
    if (this.element) this.element.style.display = 'flex';
    if (this.titleEl) this.titleEl.textContent = track.name || 'Escuchando previa';
    if (this.subtitleEl) this.subtitleEl.textContent = track.artist || 'EventRadar';
    
    if (this.controller && track.uri) {
      this.controller.loadUri(track.uri);
      this.controller.play();
    } else if (track.spotifyId) {
      if (this.controller) {
        this.controller.loadUri(`spotify:track:${track.spotifyId}`);
        this.controller.play();
      }
    }
  }
  
  updatePlayButton() {
    if (!this.playBtn) return;
    const icon = this.playBtn.querySelector('.material-symbols-outlined');
    if (icon) {
      icon.textContent = this.isPlaying ? 'pause' : 'play_arrow';
    }
  }
}

export const spotifyPlayer = new SpotifyPlayer();
