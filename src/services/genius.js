import axios from 'axios';
import { getCache, setCache } from '../utils/cache.js';

const BASE_URL = 'https://api.genius.com';

function getToken() {
  const token = process.env.GENIUS_ACCESS_TOKEN;
  if (!token) return null;
  const trimmed = token.trim();
  if (!trimmed || /^(your_|tu_|change|example|placeholder|xxx)/i.test(trimmed)) return null;
  return trimmed;
}

export function isGeniusConfigured() {
  return Boolean(getToken());
}

function stripHtml(value = '') {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeArtist(artist) {
  if (!artist) return null;
  return {
    id: artist.id,
    name: artist.name,
    url: artist.url || null,
    image: artist.image_url || null,
    description: stripHtml(artist.description?.dom || ''),
    followers: artist.followers_count ?? null
  };
}

export async function findArtist(name) {
  if (!name || !name.trim()) return { artist: null, error: null };

  const cacheKey = `genius:find:${name.toLowerCase()}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const token = getToken();
  if (!token) {
    return {
      artist: null,
      error: {
        code: 'MISSING_KEY',
        message: 'Genius no está configurado. Añade GENIUS_ACCESS_TOKEN para ver la biografía del artista.'
      }
    };
  }

  try {
    const searchResponse = await axios.get(`${BASE_URL}/search`, {
      params: { q: name.trim() },
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10000
    });

    const hits = searchResponse.data?.response?.hits || [];
    const hit = hits.find(
      (item) => item?.result?.primary_artist?.name?.toLowerCase() === name.trim().toLowerCase()
    ) || hits.find((item) => item?.result?.primary_artist);

    const primaryArtist = hit?.result?.primary_artist || null;
    if (!primaryArtist?.id) {
      const empty = { artist: null, error: null };
      setCache(cacheKey, empty, 600);
      return empty;
    }

    const detailsResponse = await axios.get(`${BASE_URL}/artists/${primaryArtist.id}`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10000
    });

    const artist = normalizeArtist(detailsResponse.data?.response?.artist || primaryArtist);
    const result = { artist, error: null };
    setCache(cacheKey, result, 1800);
    return result;
  } catch (error) {
    const status = error.response?.status;
    return {
      artist: null,
      error: {
        code: status === 401 || status === 403 ? 'GENIUS_AUTH_ERROR' : 'GENIUS_ERROR',
        status: status || null,
        message: status === 401 || status === 403
          ? 'Genius rechazó el token configurado.'
          : 'No se pudo consultar Genius.'
      }
    };
  }
}
