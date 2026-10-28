import axios from 'axios';
import { getCache, setCache } from '../utils/cache.js';

const BASE_URL = 'https://api.musixmatch.com/ws/1.1';

function getKey() {
  const key = process.env.MUSIXMATCH_API_KEY;
  if (!key) return null;
  const trimmed = key.trim();
  if (!trimmed || /^(your_|tu_|change|example|placeholder|xxx)/i.test(trimmed)) return null;
  return trimmed;
}

export function isMusixmatchConfigured() {
  return Boolean(getKey());
}

function apiError(statusCode) {
  if (statusCode === 401) {
    return {
      code: 'MUSIXMATCH_AUTH_ERROR',
      message: 'Musixmatch rechazó la API key configurada.'
    };
  }
  if (statusCode === 404) {
    return { code: 'NOT_FOUND', message: 'Musixmatch no encontró la letra solicitada.' };
  }
  return {
    code: 'MUSIXMATCH_ERROR',
    message: 'Musixmatch no pudo devolver la letra en este momento.'
  };
}

export async function findLyrics(artistName, trackName) {
  if (!artistName || !trackName) {
    return { lyrics: null, track: null, error: { code: 'BAD_REQUEST', message: 'Faltan el artista o la canción.' } };
  }

  const key = getKey();
  if (!key) {
    return {
      lyrics: null,
      track: null,
      error: {
        code: 'MISSING_KEY',
        message: 'Musixmatch no está configurado. Añade MUSIXMATCH_API_KEY para mostrar letras.'
      }
    };
  }

  const cacheKey = `musixmatch:find:${artistName.toLowerCase()}:${trackName.toLowerCase()}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  try {
    const searchResponse = await axios.get(`${BASE_URL}/track.search`, {
      params: {
        apikey: key,
        q_artist: artistName,
        q_track: trackName,
        format: 'json',
        f_has_lyrics: 1
      },
      timeout: 10000
    });

    const header = searchResponse.data?.message?.header;
    if (header?.status_code !== 200) {
      const result = { lyrics: null, track: null, error: apiError(header?.status_code) };
      return result;
    }

    const track = searchResponse.data?.message?.body?.track_list?.[0]?.track || null;
    if (!track?.track_id) {
      const result = {
        lyrics: null,
        track: null,
        error: { code: 'NOT_FOUND', message: 'Musixmatch no encontró esa canción.' }
      };
      setCache(cacheKey, result, 300);
      return result;
    }

    const lyricsResponse = await axios.get(`${BASE_URL}/track.lyrics.get`, {
      params: { apikey: key, track_id: track.track_id, format: 'json' },
      timeout: 10000
    });

    const lyricsHeader = lyricsResponse.data?.message?.header;
    if (lyricsHeader?.status_code !== 200) {
      const result = {
        lyrics: null,
        track: {
          id: track.track_id,
          name: track.track_name,
          artist: track.artist_name
        },
        error: apiError(lyricsHeader?.status_code)
      };
      return result;
    }

    const lyrics = lyricsResponse.data?.message?.body?.lyrics;
    const result = {
      lyrics: lyrics?.lyrics_body || null,
      track: {
        id: track.track_id,
        name: track.track_name,
        artist: track.artist_name
      },
      hasFullLyrics: false,
      disclaimer: lyrics?.lyrics_copyright || null,
      error: lyrics?.lyrics_body ? null : {
        code: 'EMPTY',
        message: 'Musixmatch no devolvió texto para esa canción.'
      }
    };

    setCache(cacheKey, result, 1800);
    return result;
  } catch (error) {
    const status = error.response?.status;
    return {
      lyrics: null,
      track: null,
      error: status === 401
        ? apiError(401)
        : {
            code: 'MUSIXMATCH_ERROR',
            status: status || null,
            message: 'No se pudo conectar con Musixmatch.'
          }
    };
  }
}
