import axios from 'axios';
import { getCache, setCache } from '../utils/cache.js';

// Deezer permite leer su catálogo público sin API key. Las llamadas se hacen
// desde el servidor porque su API no habilita CORS para el navegador.
const DEEZER_API_URL = 'https://api.deezer.com';
const ARTIST_ID = /^\d+$/;

const ALBUM_TYPES = {
  album: 'Álbum',
  single: 'Single',
  ep: 'EP',
  compile: 'Recopilatorio'
};

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

function normalizeArtist(artist) {
  if (!artist?.id) return null;
  const image = safeHttpUrl(
    artist.picture_xl
      || artist.picture_big
      || artist.picture_medium
      || artist.picture_small
      || artist.picture
  );

  return {
    id: String(artist.id),
    name: artist.name || 'Artista',
    image,
    images: image ? [{ url: image }] : [],
    genres: [],
    popularity: null,
    followers: numberOrNull(artist.nb_fan),
    albums: numberOrNull(artist.nb_album),
    externalUrl: safeHttpUrl(artist.link) || `https://www.deezer.com/artist/${artist.id}`
  };
}

function normalizeTrack(track, fallbackArtist = null) {
  if (!track?.id) return null;
  const artist = track.artist || fallbackArtist;
  const album = track.album || null;
  const albumImage = album
    ? safeHttpUrl(album.cover_medium || album.cover_big || album.cover_small || album.cover)
    : null;

  return {
    id: String(track.id),
    name: track.title || track.title_short || 'Canción',
    durationMs: Number.isFinite(Number(track.duration)) ? Number(track.duration) * 1000 : null,
    previewUrl: safeHttpUrl(track.preview),
    uri: null,
    externalUrl: safeHttpUrl(track.link),
    artists: artist?.name
      ? [{ id: artist.id ? String(artist.id) : null, name: artist.name }]
      : [],
    album: album
      ? {
        id: album.id ? String(album.id) : null,
        name: album.title || 'Álbum',
        image: albumImage
      }
      : null
  };
}

function normalizeAlbum(album) {
  if (!album?.id) return null;
  const image = safeHttpUrl(
    album.cover_medium
      || album.cover_big
      || album.cover_xl
      || album.cover_small
      || album.cover
  );

  return {
    id: String(album.id),
    name: album.title || 'Álbum',
    type: ALBUM_TYPES[album.record_type] || 'Álbum',
    releaseDate: album.release_date || null,
    image,
    externalUrl: safeHttpUrl(album.link),
    trackCount: numberOrNull(album.nb_tracks)
  };
}

function dedupeAlbums(albums) {
  const seen = new Set();
  return albums.filter((album) => {
    if (!album) return false;
    const key = album.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function deezerGet(path, params = {}) {
  try {
    const { data } = await axios.get(`${DEEZER_API_URL}${path}`, {
      params,
      timeout: 10000,
      headers: { Accept: 'application/json' }
    });

    // Deezer devuelve los errores de negocio con HTTP 200 y un objeto error.
    if (data?.error) {
      const error = new Error(data.error.message || 'Deezer devolvió un error.');
      error.deezer = {
        code: data.error.code ?? null,
        type: data.error.type || null,
        message: data.error.message || null
      };
      error.status = data.error.code === 800
        ? 404
        : data.error.code === 4
          ? 429
          : 502;
      throw error;
    }

    return data;
  } catch (error) {
    if (error.deezer) throw error;

    const status = error?.response?.status || null;
    const wrapped = new Error(
      status === 429
        ? 'Deezer limitó temporalmente las solicitudes.'
        : 'No se pudo conectar con Deezer.'
    );
    wrapped.status = status;
    wrapped.cause = error;
    throw wrapped;
  }
}

export function isDeezerConfigured() {
  // La API pública de Deezer no requiere credenciales.
  return true;
}

export async function searchArtists(query, limit = 8) {
  const trimmed = String(query || '').trim();
  if (!trimmed) return [];

  const safeLimit = Math.min(Math.max(Number(limit) || 8, 1), 25);
  const cacheKey = `deezer:search:${trimmed.toLowerCase()}:${safeLimit}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const data = await deezerGet('/search/artist', { q: trimmed, limit: safeLimit });
  const artists = (data.data || []).map(normalizeArtist).filter(Boolean);
  setCache(cacheKey, artists, 600);
  return artists;
}

export async function getArtistDetails(artistId) {
  const id = String(artistId || '').trim();
  if (!ARTIST_ID.test(id)) {
    const error = new Error('El identificador del artista no es válido.');
    error.status = 400;
    throw error;
  }

  const cacheKey = `deezer:artist:${id}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const [artistData, topData, albumsData] = await Promise.all([
    deezerGet(`/artist/${id}`),
    deezerGet(`/artist/${id}/top`, { limit: 10 }).catch(() => ({ data: [] })),
    deezerGet(`/artist/${id}/albums`, { limit: 24 }).catch(() => ({ data: [] }))
  ]);

  const artist = normalizeArtist(artistData);
  if (!artist) {
    const error = new Error('Deezer no encontró ese artista.');
    error.status = 404;
    throw error;
  }

  const topTracks = (topData.data || [])
    .map((track) => normalizeTrack(track, artistData))
    .filter(Boolean);

  const albums = dedupeAlbums((albumsData.data || []).map(normalizeAlbum));

  const result = { ...artist, topTracks, albums };
  setCache(cacheKey, result, 600);
  return result;
}

export async function getArtistAlbums(artistId, limit = 20) {
  const id = String(artistId || '').trim();
  if (!ARTIST_ID.test(id)) {
    const error = new Error('El identificador del artista no es válido.');
    error.status = 400;
    throw error;
  }

  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
  const data = await deezerGet(`/artist/${id}/albums`, { limit: safeLimit });
  return dedupeAlbums((data.data || []).map(normalizeAlbum));
}

export async function getArtistPreview(artistName) {
  const name = String(artistName || '').trim();
  if (!name) return null;

  const artists = await searchArtists(name, 1);
  if (artists.length === 0) return null;

  const details = await getArtistDetails(artists[0].id);
  let track = (details.topTracks || []).find((item) => item.previewUrl) || null;

  // Si las 10 más populares no tienen preview, se amplía la búsqueda antes de
  // rendirse: Deezer no ofrece fragmento para todo el catálogo.
  if (!track) {
    const data = await deezerGet(`/artist/${details.id}/top`, { limit: 25 }).catch(() => ({ data: [] }));
    track = (data.data || [])
      .map((item) => normalizeTrack(item, { id: details.id, name: details.name }))
      .find((item) => item?.previewUrl) || null;
  }

  if (!track) return null;

  return {
    ...track,
    artist: { id: details.id, name: details.name, image: details.image }
  };
}

export function deezerFailure(error) {
  return {
    status: error?.status || error?.response?.status || null,
    code: error?.deezer?.code ?? null,
    type: error?.deezer?.type || null,
    message: error?.deezer?.message || error?.message || null
  };
}

export function deezerErrorPayload(error, fallback = 'No se pudo completar la solicitud a Deezer.') {
  const failure = deezerFailure(error);

  if (failure.status === 404 || failure.code === 800) {
    return {
      code: 'NOT_FOUND',
      status: 404,
      message: 'Deezer no encontró ese artista.'
    };
  }
  if (failure.status === 429 || failure.code === 4) {
    return {
      code: 'DEEZER_RATE_LIMIT',
      status: 429,
      message: 'Deezer limitó temporalmente las solicitudes. Inténtalo de nuevo en unos minutos.'
    };
  }
  return { code: 'DEEZER_ERROR', status: failure.status, message: fallback };
}
