/* Define el callback antes de cargar la API iFrame de Spotify.
   Así no se pierde la inicialización si el script externo termina primero. */
window.__eventRadarSpotifyApi = null;
window.onSpotifyIframeApiReady = function onSpotifyIframeApiReady(IFrameAPI) {
  window.__eventRadarSpotifyApi = IFrameAPI;
  window.dispatchEvent(new CustomEvent('eventradar:spotify-ready', { detail: IFrameAPI }));
};
