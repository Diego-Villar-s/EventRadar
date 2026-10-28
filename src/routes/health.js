import express from 'express';

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
      spotify: configured('SPOTIFY_CLIENT_ID')
        && configured('SPOTIFY_CLIENT_SECRET')
        && /^https?:\/\//i.test((process.env.SPOTIFY_REDIRECT_URI || '').trim()),
      ticketmaster: configured('TICKETMASTER_API_KEY'),
      openweather: configured('OPENWEATHER_API_KEY'),
      genius: configured('GENIUS_ACCESS_TOKEN'),
      musixmatch: configured('MUSIXMATCH_API_KEY')
    }
  });
});

export default router;
