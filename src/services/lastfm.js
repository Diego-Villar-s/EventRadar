import axios from 'axios';
import { getCache, setCache } from '../utils/cache.js';

const LASTFM_API_URL = 'https://ws.audioscrobbler.com/2.0/';
const NOISE_TAGS = new Set([
  'seen live',
  'favorites',
  'favourite',
  'love',
  'loved',
  'awesome',
  'amazing',
  'beautiful',
  'best',
  'great',
  'good',
  'spotify',
  'lastfm',
  'last.fm',
  'all',
  'unknown',
  'male vocalists',
  'female vocalists',
  'under 2000 listeners'
]);

function getApiKey() {
  return (process.env.LASTFM_API_KEY || '').trim();
}

function isUsableValue(value) {
  if (!value) return false;
  return !/^(your[_-]|tu[_-]|change[_-]?me|example|placeholder|xxx)/i.test(value);
}

function safeHttpUrl(value) {
  if (!value || typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function numberOrNull(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return [value];
  return [];
}

function normalizeImage(images) {
  const entries = toArray(images)
    .map((image) => ({
      size: image?.size || '',
      url: safeHttpUrl(image?.['#text'] || image?.url || '')
    }))
    .filter((image) => image.url);

  if (entries.length === 0) return null;

  const preferred = ['mega', 'extralarge', 'large', 'medium', 'small'];
  for (const size of preferred) {
    const match = entries.find((image) => image.size === size);
    if (match) return match.url;
  }
  return entries[0].url;
}

function isNoiseTag(name) {
  return NOISE_TAGS.has(String(name || '').trim().toLowerCase());
}

function normalizeLastfmUser(user) {
  if (!user?.name) return null;
  const image = normalizeImage(user.image);
  const registered = Number(user.registered?.unixtime);

  return {
    id: user.name,
    username: user.name,
    display_name: user.realname || user.name,
    displayName: user.realname || user.name,
    realname: user.realname || null,
    image,
    images: image ? [{ url: image }] : [],
    url: safeHttpUrl(user.url),
    playcount: numberOrNull(user.playcount),
    country: user.country || null,
    registeredAt: Number.isFinite(registered) && registered > 0
      ? new Date(registered * 1000).toISOString()
      : null
  };
}

function normalizeArtist(artist) {
  if (!artist?.name) return null;
  const image = normalizeImage(artist.image);

  return {
    id: null,
    name: artist.name,
    image,
    images: image ? [{ url: image }] : [],
    // Last.fm no expone popularidad global en user.getTopArtists. Se deja null
    // para no inventar el bonus de popularidad del algoritmo de match.
    genres: [],
    popularity: null,
    followers: null,
    externalUrl: safeHttpUrl(artist.url),
    playcount: numberOrNull(artist.playcount) || 0
  };
}

function normalizeTrack(track) {
  if (!track?.name) return null;
  const image = normalizeImage(track.image);
  const albumName = track.album?.['#text'] || null;

  return {
    id: null,
    name: track.name,
    durationMs: Number.isFinite(Number(track.duration)) ? Number(track.duration) * 1000 : null,
    previewUrl: null,
    uri: null,
    externalUrl: safeHttpUrl(track.url),
    artists: track.artist?.name ? [{ id: null, name: track.artist.name }] : [],
    album: albumName ? { id: null, name: albumName, image } : null
  };
}

function normalizeTag(tag) {
  if (!tag?.name || isNoiseTag(tag.name)) return null;
  return {
    name: tag.name,
    count: numberOrNull(tag.count) || 0,
    url: safeHttpUrl(tag.url)
  };
}

async function lastfmRequest(method, params = {}) {
  if (!isLastfmConfigured()) {
    const error = new Error('Last.fm no está configurado. Añade LASTFM_API_KEY.');
    error.status = 503;
    error.lastfm = { code: 'NOT_CONFIGURED', message: error.message };
    throw error;
  }

  try {
    const { data } = await axios.get(LASTFM_API_URL, {
      params: {
        method,
        api_key: getApiKey(),
        format: 'json',
        ...params
      },
      timeout: 10000,
      headers: { Accept: 'application/json' }
    });

    if (data?.error) {
      const error = new Error(data.message || 'Last.fm devolvió un error.');
      error.lastfm = {
        code: Number(data.error) || null,
        message: data.message || null
      };
      error.status = error.lastfm.code === 6
        ? 404
        : error.lastfm.code === 29
          ? 429
          : 502;
      throw error;
    }

    return data;
  } catch (error) {
    if (error.lastfm) throw error;

    // Last.fm puede responder 403 con un JSON de error para una API key inválida.
    const responseData = error?.response?.data;
    if (responseData?.error) {
      const wrapped = new Error(responseData.message || 'Last.fm rechazó la solicitud.');
      wrapped.lastfm = {
        code: Number(responseData.error) || null,
        message: responseData.message || null
      };
      wrapped.status = wrapped.lastfm.code === 6
        ? 404
        : wrapped.lastfm.code === 29
          ? 429
          : 502;
      throw wrapped;
    }

    const status = error?.response?.status || null;
    const wrapped = new Error(
      status === 429
        ? 'Last.fm limitó temporalmente las solicitudes.'
        : 'No se pudo conectar con Last.fm.'
    );
    wrapped.status = status;
    wrapped.cause = error;
    throw wrapped;
  }
}

export function isLastfmConfigured() {
  return isUsableValue(getApiKey());
}

export async function getUserInfo(username) {
  const user = String(username || '').trim();
  if (!user) {
    const error = new Error('Falta el nombre de usuario de Last.fm.');
    error.status = 400;
    error.lastfm = { code: 'BAD_REQUEST', message: error.message };
    throw error;
  }

  const cacheKey = `lastfm:user:${user.toLowerCase()}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const data = await lastfmRequest('user.getInfo', { user });
  const normalized = normalizeLastfmUser(data.user);
  if (!normalized) {
    const error = new Error('Last.fm no devolvió el perfil de ese usuario.');
    error.status = 404;
    error.lastfm = { code: 6, message: error.message };
    throw error;
  }

  setCache(cacheKey, normalized, 300);
  return normalized;
}

export async function getUserTopArtists(username, limit = 50) {
  const user = String(username || '').trim();
  if (!user) return [];

  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 50);
  const cacheKey = `lastfm:top-artists:${user.toLowerCase()}:${safeLimit}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const data = await lastfmRequest('user.getTopArtists', {
    user,
    period: 'overall',
    limit: safeLimit
  });
  const artists = toArray(data.topartists?.artist).map(normalizeArtist).filter(Boolean);
  setCache(cacheKey, artists, 600);
  return artists;
}

export async function getUserTopTracks(username, limit = 50) {
  const user = String(username || '').trim();
  if (!user) return [];

  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 50);
  const cacheKey = `lastfm:top-tracks:${user.toLowerCase()}:${safeLimit}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const data = await lastfmRequest('user.getTopTracks', {
    user,
    period: 'overall',
    limit: safeLimit
  });
  const tracks = toArray(data.toptracks?.track).map(normalizeTrack).filter(Boolean);
  setCache(cacheKey, tracks, 600);
  return tracks;
}

export async function getUserTopTags(username, limit = 20) {
  const user = String(username || '').trim();
  if (!user) return [];

  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
  const cacheKey = `lastfm:top-tags:${user.toLowerCase()}:${safeLimit}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const data = await lastfmRequest('user.getTopTags', { user, limit: safeLimit });
  const tags = toArray(data.toptags?.tag).map(normalizeTag).filter(Boolean);
  setCache(cacheKey, tags, 600);
  return tags;
}

export async function getArtistTopTags(artistName, limit = 10) {
  const artist = String(artistName || '').trim();
  if (!artist) return [];

  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 20);
  const cacheKey = `lastfm:artist-tags:${artist.toLowerCase()}:${safeLimit}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const data = await lastfmRequest('artist.getTopTags', { artist, autocorrect: 1 });
  const tags = toArray(data.toptags?.tag).map(normalizeTag).filter(Boolean).slice(0, safeLimit);
  setCache(cacheKey, tags, 600);
  return tags;
}

async function deriveGenresFromArtists(artists) {
  const selected = artists.slice(0, 5);
  const results = await Promise.all(selected.map(async (artist, index) => {
    try {
      const tags = await getArtistTopTags(artist.name, 5);
      return { tags, weight: Math.max(1, 5 - index) };
    } catch {
      return { tags: [], weight: 0 };
    }
  }));

  const weights = new Map();
  results.forEach(({ tags, weight }) => {
    tags.forEach((tag) => {
      const key = tag.name.toLowerCase();
      const current = weights.get(key) || { genre: tag.name, weight: 0 };
      current.weight += Math.max(1, tag.count) * weight;
      weights.set(key, current);
    });
  });

  return [...weights.values()]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 10);
}

export async function buildAffinityProfile(username) {
  const user = String(username || '').trim();
  if (!user) return null;

  const cacheKey = `lastfm:affinity:${user.toLowerCase()}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const [artists, tracks, tags] = await Promise.all([
    getUserTopArtists(user, 50),
    getUserTopTracks(user, 50),
    getUserTopTags(user, 20).catch(() => [])
  ]);

  let topGenres = tags.map((tag) => ({
    genre: tag.name,
    weight: Math.max(1, tag.count)
  }));

  // user.getTopTags puede venir vacío en cuentas con pocos scrobbles. En ese
  // caso se derivan géneros de las etiquetas de sus artistas más escuchados.
  if (topGenres.length === 0 && artists.length > 0) {
    topGenres = await deriveGenresFromArtists(artists);
  }

  const normalizedArtists = artists.slice(0, 20);
  const normalizedTracks = tracks.slice(0, 20);

  const result = {
    provider: 'lastfm',
    username: user,
    topArtists: normalizedArtists,
    topTracks: normalizedTracks,
    topGenres: topGenres.slice(0, 10),
    artists: normalizedArtists,
    tracks: normalizedTracks
  };

  setCache(cacheKey, result, 600);
  return result;
}

export function lastfmFailure(error) {
  return {
    status: error?.status || error?.response?.status || null,
    code: error?.lastfm?.code ?? null,
    message: error?.lastfm?.message || error?.message || null
  };
}

export function lastfmErrorPayload(error, fallback = 'No se pudo completar la solicitud a Last.fm.') {
  const failure = lastfmFailure(error);

  if (!isLastfmConfigured() || failure.code === 'NOT_CONFIGURED') {
    return {
      code: 'LASTFM_NOT_CONFIGURED',
      status: null,
      message: 'Last.fm no está configurado. Añade LASTFM_API_KEY en Render o en .env.'
    };
  }
  if (failure.code === 6 || failure.status === 404) {
    return {
      code: 'LASTFM_USER_NOT_FOUND',
      status: 404,
      message: 'Last.fm no encontró ese usuario. Revisa el nombre exacto de tu perfil.'
    };
  }
  if (failure.code === 10 || failure.code === 26) {
    return {
      code: 'LASTFM_INVALID_KEY',
      status: 502,
      message: 'Last.fm rechazó la API key. Revisa LASTFM_API_KEY en Render.'
    };
  }
  if (failure.code === 29 || failure.status === 429) {
    return {
      code: 'LASTFM_RATE_LIMIT',
      status: 429,
      message: 'Last.fm limitó temporalmente las solicitudes. Inténtalo de nuevo en unos minutos.'
    };
  }
  return { code: 'LASTFM_ERROR', status: failure.status, message: fallback };
}
