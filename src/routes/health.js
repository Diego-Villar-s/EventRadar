import express from 'express';
import axios from 'axios';

const router = express.Router();

function getKey(name) {
  const key = process.env[name];
  if (!key) return null;
  return key.trim();
}

router.get('/', async (req, res) => {
  const result = {};
  
  // Spotify
  const spotifyId = getKey('SPOTIFY_CLIENT_ID');
  const spotifySecret = getKey('SPOTIFY_CLIENT_SECRET');
  result.spotify = {
    key: !!(spotifyId && spotifySecret),
    ok: false
  };
  if (spotifyId && spotifySecret) {
    try {
      const auth = Buffer.from(`${spotifyId}:${spotifySecret}`).toString('base64');
      const resp = await axios.post('https://accounts.spotify.com/api/token', 'grant_type=client_credentials', {
        headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 5000
      });
      result.spotify.ok = resp.status === 200;
      result.spotify.status = resp.status;
    } catch (e) {
      result.spotify.ok = false;
      result.spotify.status = e.response?.status;
      result.spotify.error = e.message;
    }
  } else {
    result.spotify.error = 'key faltante';
  }
  
  // Ticketmaster
  const tmKey = getKey('TICKETMASTER_API_KEY');
  result.ticketmaster = { key: !!tmKey, ok: false };
  if (tmKey) {
    try {
      const resp = await axios.get('https://app.ticketmaster.com/discovery/v2/events.json', {
        params: { apikey: tmKey, countryCode: 'ES', size: 1 },
        timeout: 5000
      });
      result.ticketmaster.ok = resp.status === 200;
      result.ticketmaster.status = resp.status;
      result.ticketmaster.count = resp.data?._embedded?.events?.length || 0;
    } catch (e) {
      result.ticketmaster.ok = false;
      result.ticketmaster.status = e.response?.status;
      result.ticketmaster.error = e.message;
    }
  } else {
    result.ticketmaster.error = 'key faltante';
  }
  
  // OpenWeather
  const owKey = getKey('OPENWEATHER_API_KEY');
  result.openweather = { key: !!owKey, ok: false };
  if (owKey) {
    try {
      const resp = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
        params: { q: 'Madrid', appid: owKey, units: 'metric' },
        timeout: 5000
      });
      result.openweather.ok = resp.status === 200;
      result.openweather.status = resp.status;
    } catch (e) {
      result.openweather.ok = false;
      result.openweather.status = e.response?.status;
      result.openweather.error = e.message;
    }
  } else {
    result.openweather.error = 'key faltante';
  }
  
  // Genius
  const geniusKey = getKey('GENIUS_ACCESS_TOKEN');
  result.genius = { key: !!geniusKey, ok: false };
  if (geniusKey) {
    try {
      const resp = await axios.get('https://api.genius.com/search', {
        params: { q: 'test' },
        headers: { 'Authorization': `Bearer ${geniusKey}` },
        timeout: 5000
      });
      result.genius.ok = resp.status === 200;
      result.genius.status = resp.status;
    } catch (e) {
      result.genius.ok = false;
      result.genius.status = e.response?.status;
      result.genius.error = e.message;
    }
  } else {
    result.genius.error = 'key faltante';
  }
  
  // Musixmatch
  const mxKey = getKey('MUSIXMATCH_API_KEY');
  result.musixmatch = { key: !!mxKey, ok: false };
  if (mxKey) {
    try {
      const resp = await axios.get('https://api.musixmatch.com/ws/1.1/track.search', {
        params: { apikey: mxKey, q_track: 'test', format: 'json', page_size: 1 },
        timeout: 5000
      });
      result.musixmatch.ok = resp.status === 200;
      result.musixmatch.status = resp.status;
    } catch (e) {
      result.musixmatch.ok = false;
      result.musixmatch.status = e.response?.status;
      result.musixmatch.error = e.message;
    }
  } else {
    result.musixmatch.error = 'key faltante';
  }
  
  res.json(result);
});

export default router;
