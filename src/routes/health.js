import express from 'express';
import { isLastfmConfigured } from '../services/lastfm.js';
import { isDeezerConfigured } from '../services/deezer.js';
import { isSpotifyConfigured, getSpotifyRedirectUri } from '../services/spotify.js';

const router = express.Router();

function isUsableValue(value) {
  if (!value) return false;
  return !/^(your[_-]|tu[_-]|change[_-]?me|example|placeholder|xxx)/i.test(value);
}

function configured(name) {
  return isUsableValue((process.env[name] || '').trim());
}

router.get('/', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    integrations: {
      // Proveedor activo de afinidad musical.
      lastfm: isLastfmConfigured(),
      // Catálogo público de artistas, canciones y previews (sin API key).
      deezer: isDeezerConfigured(),
      deezerNote: 'API pública sin clave; las llamadas se hacen desde el servidor.',
      // Letras completas gratuitas, sin API key.
      lrclib: true,
      // Spotify queda en pausa temporalmente. Se conserva su configuración
      // para poder reactivarlo sin perder el trabajo anterior.
      spotify: false,
      spotifyPaused: true,
      spotifyConfigured: isSpotifyConfigured(),
      spotifyRedirectUri: getSpotifyRedirectUri(),
      ticketmaster: configured('TICKETMASTER_API_KEY'),
      openweather: configured('OPENWEATHER_API_KEY'),
      genius: configured('GENIUS_ACCESS_TOKEN'),
      musixmatch: configured('MUSIXMATCH_API_KEY')
    }
  });
});

export default router;
