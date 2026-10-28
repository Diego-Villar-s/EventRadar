/* ARCHIVADO: la app ya no carga la API iFrame de Spotify.
   El reproductor activo es preview-player.js (previews de Deezer). */
window.__eventRadarSpotifyApi = null;
window.onSpotifyIframeApiReady = function onSpotifyIframeApiReady(IFrameAPI) {
  window.__eventRadarSpotifyApi = IFrameAPI;
  window.dispatchEvent(new CustomEvent('eventradar:spotify-ready', { detail: IFrameAPI }));
};
