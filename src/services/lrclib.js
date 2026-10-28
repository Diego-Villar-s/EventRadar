import axios from 'axios';
import { getCache, setCache } from '../utils/cache.js';

// LRCLIB es una base de datos libre de letras: no pide API key ni registro.
// Su documentación recomienda identificarse con un User-Agent propio y no
// hacer ráfagas de peticiones, así que todo se cachea durante 24 horas.
const LRCLIB_API_URL = 'https://lrclib.net/api';
const USER_AGENT = 'EventRadar/1.0 (https://github.com/Diego-Villar-s/EventRadar)';
const SUCCESS_TTL = 60 * 60 * 24;
const ERROR_TTL = 60;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanText(value) {
  return String(value || '').replace(/\r\n/g, '\n').trim();
}

function syncedToPlain(value) {
  return cleanText(value)
    .split('\n')
    .map((line) => line.replace(/^\[\d{1,2}:\d{2}(?:\.\d{1,3})?\]\s?/, ''))
    .join('\n')
    .trim();
}

async function lrclibRequest(path, params) {
  let lastError = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const { data } = await axios.get(`${LRCLIB_API_URL}${path}`, {
        params,
        timeout: 8000,
        headers: {
          Accept: 'application/json',
          'User-Agent': USER_AGENT
        }
      });
      return data;
    } catch (error) {
      lastError = error;
      const status = error?.response?.status || null;
      // 404 es una respuesta normal: LRCLIB no tiene esa letra.
      if (status === 404) return null;
      // LRCLIB responde 503 cuando está saturado; un reintento corto suele bastar.
      if (status === 503 && attempt === 0) {
        await delay(500);
        continue;
      }
      break;
    }
  }

  throw lastError;
}

function pickBest(records, artistName, trackName) {
  if (!Array.isArray(records) || records.length === 0) return null;

  const artist = artistName.trim().toLowerCase();
  const track = trackName.trim().toLowerCase();

  const withLyrics = records.filter((record) => record && (record.plainLyrics || record.syncedLyrics));
  const pool = withLyrics.length > 0 ? withLyrics : records;

  const exact = pool.find((record) => (
    String(record.artistName || '').trim().toLowerCase() === artist
    && String(record.trackName || '').trim().toLowerCase() === track
  ));
  if (exact) return exact;

  const sameArtist = pool.find(
    (record) => String(record.artistName || '').trim().toLowerCase() === artist
  );
  return sameArtist || pool[0] || null;
}

export async function findLyrics(artistName, trackName) {
  if (!artistName || !trackName) {
    return {
      lyrics: null,
      track: null,
      error: { code: 'BAD_REQUEST', message: 'Faltan el artista o la canción.' }
    };
  }

  const cacheKey = `lrclib:find:${artistName.toLowerCase()}:${trackName.toLowerCase()}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  try {
    let record = await lrclibRequest('/get', {
      artist_name: artistName,
      track_name: trackName
    });

    if (!record) {
      const results = await lrclibRequest('/search', {
        artist_name: artistName,
        track_name: trackName
      });
      record = pickBest(results, artistName, trackName);
    }

    if (!record) {
      const result = {
        lyrics: null,
        track: null,
        error: {
          code: 'NOT_FOUND',
          message: 'LRCLIB no encontró la letra de esa canción.'
        }
      };
      setCache(cacheKey, result, ERROR_TTL);
      return result;
    }

    if (record.instrumental) {
      const result = {
        lyrics: null,
        track: {
          id: record.id ?? null,
          name: record.trackName || trackName,
          artist: record.artistName || artistName,
          album: record.albumName || null
        },
        error: {
          code: 'INSTRUMENTAL',
          message: 'Esa canción es instrumental, así que no tiene letra.'
        }
      };
      setCache(cacheKey, result, SUCCESS_TTL);
      return result;
    }

    const syncedLyrics = cleanText(record.syncedLyrics) || null;
    const lyrics = cleanText(record.plainLyrics) || syncedToPlain(syncedLyrics) || null;

    if (!lyrics) {
      const result = {
        lyrics: null,
        track: {
          id: record.id ?? null,
          name: record.trackName || trackName,
          artist: record.artistName || artistName,
          album: record.albumName || null
        },
        error: {
          code: 'EMPTY',
          message: 'LRCLIB no devolvió texto para esa canción.'
        }
      };
      setCache(cacheKey, result, ERROR_TTL);
      return result;
    }

    const result = {
      lyrics,
      syncedLyrics,
      track: {
        id: record.id ?? null,
        name: record.trackName || trackName,
        artist: record.artistName || artistName,
        album: record.albumName || null,
        durationMs: Number.isFinite(Number(record.duration)) ? Number(record.duration) * 1000 : null
      },
      source: 'lrclib',
      hasFullLyrics: true,
      disclaimer: null,
      error: null
    };

    setCache(cacheKey, result, SUCCESS_TTL);
    return result;
  } catch (error) {
    const status = error?.response?.status || null;
    const result = {
      lyrics: null,
      track: null,
      error: status === 503
        ? {
          code: 'LRCLIB_BUSY',
          status,
          message: 'LRCLIB está saturado en este momento. Inténtalo de nuevo en unos segundos.'
        }
        : {
          code: 'LRCLIB_ERROR',
          status,
          message: 'No se pudo conectar con LRCLIB.'
        }
    };
    setCache(cacheKey, result, ERROR_TTL);
    return result;
  }
}
