import axios from 'axios';
import { getCache, setCache } from '../utils/cache.js';

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API_URL = 'https://api.spotify.com/v1';

const SCOPES = [
  'user-read-private',
  'user-read-email',
  'user-top-read',
  'streaming',
  'user-read-playback-state',
  'user-modify-playback-state'
];

let appToken = null;
let appTokenExpiresAt = 0;

function getEnv(name) {
  const value = process.env[name];
  return value ? value.trim() : '';
}

function isUsableValue(value) {
  if (!value) return false;
  return !/^(your[_-]|tu[_-]|change[_-]?me|example|placeholder|xxx)/i.test(value);
}

function getBaseUrl() {
  return (getEnv('BASE_URL') || 'http://127.0.0.1:3000').replace(/\/+$/, '');
}

/**
 * Resuelve el redirect URI de Spotify. Si no está configurado, se deriva de
 * BASE_URL para evitar enviar a Spotify un callback de localhost en producción.
 */
export function getSpotifyRedirectUri() {
  const configured = getEnv('SPOTIFY_REDIRECT_URI');
  if (isUsableValue(configured) && /^https?:\/\//i.test(configured)) {
    return configured.replace(/\/+$/, '');
  }
  return `${getBaseUrl()}/callback`;
}

export function getSpotifyMarket() {
  return (getEnv('SPOTIFY_MARKET') || 'ES').toUpperCase();
}

export function getSpotifyConfigStatus() {
  const clientId = getEnv('SPOTIFY_CLIENT_ID');
  const clientSecret = getEnv('SPOTIFY_CLIENT_SECRET');
  const redirectUri = getSpotifyRedirectUri();

  return {
    clientId: isUsableValue(clientId),
    clientSecret: isUsableValue(clientSecret),
    redirectUri: /^https?:\/\//i.test(redirectUri)
  };
}

export function isSpotifyConfigured() {
  const status = getSpotifyConfigStatus();
  return status.clientId && status.clientSecret && status.redirectUri;
}

export function getAuthorizationUrl(state, codeChallenge) {
  if (!isSpotifyConfigured()) {
    throw new Error('Spotify no está configurado. Revisa SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET y SPOTIFY_REDIRECT_URI.');
  }
  if (!state || !codeChallenge) {
    throw new Error('Se requieren state y codeChallenge para iniciar el login de Spotify.');
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: getEnv('SPOTIFY_CLIENT_ID'),
    scope: SCOPES.join(' '),
    redirect_uri: getSpotifyRedirectUri(),
    state,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge
  });

  return `${SPOTIFY_AUTH_URL}?${params.toString()}`;
}

export async function getTokens(code, codeVerifier) {
  const clientId = getEnv('SPOTIFY_CLIENT_ID');
  const redirectUri = getSpotifyRedirectUri();

  if (!isSpotifyConfigured()) {
    throw new Error('Spotify no está configurado para canjear el código.');
  }
  if (!code || !codeVerifier) {
    throw new Error('Faltan code o code_verifier en el callback de Spotify.');
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: codeVerifier
  });

  const { data } = await axios.post(SPOTIFY_TOKEN_URL, body.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 10000
  });

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in
  };
}

export async function refreshAccessToken(refreshToken) {
  if (!refreshToken) throw new Error('No hay refresh token de Spotify.');

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: getEnv('SPOTIFY_CLIENT_ID')
  });

  const { data } = await axios.post(SPOTIFY_TOKEN_URL, body.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 10000
  });

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
    refreshToken: data.refresh_token || refreshToken
  };
}

export async function getValidUserAccessToken(session) {
  const token = session?.spotify;
  if (!token?.accessToken) return null;

  const expiresAt = Number(token.expiresAt) || 0;
  if (expiresAt > Date.now() + 60000) return token.accessToken;

  if (!token.refreshToken) return null;

  try {
    const refreshed = await refreshAccessToken(token.refreshToken);
    session.spotify = {
      ...token,
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      expiresAt: Date.now() + refreshed.expiresIn * 1000
    };
    return refreshed.accessToken;
  } catch {
    session.spotify = null;
    return null;
  }
}

async function spotifyGet(path, accessToken, params = {}) {
  const { data } = await axios.get(`${SPOTIFY_API_URL}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    params,
    timeout: 10000
  });
  return data;
}

export async function getAppAccessToken() {
  if (!isSpotifyConfigured()) {
    throw new Error('Spotify no está configurado. Añade SPOTIFY_CLIENT_ID y SPOTIFY_CLIENT_SECRET.');
  }
  if (appToken && appTokenExpiresAt > Date.now() + 60000) return appToken;

  const clientId = getEnv('SPOTIFY_CLIENT_ID');
  const clientSecret = getEnv('SPOTIFY_CLIENT_SECRET');
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const body = new URLSearchParams({ grant_type: 'client_credentials' });

  const { data } = await axios.post(SPOTIFY_TOKEN_URL, body.toString(), {
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    timeout: 10000
  });

  appToken = data.access_token;
  appTokenExpiresAt = Date.now() + Number(data.expires_in || 3600) * 1000;
  return appToken;
}

function normalizeImage(images = []) {
  if (!Array.isArray(images) || images.length === 0) return null;
  const image = images.find((item) => item?.url) || null;
  if (!image) return null;
  try {
    const url = new URL(image.url);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function normalizeArtist(artist) {
  if (!artist) return null;
  return {
    id: artist.id,
    name: artist.name,
    image: normalizeImage(artist.images),
    images: artist.images || [],
    genres: artist.genres || [],
    popularity: artist.popularity ?? null,
    followers: artist.followers?.total ?? null,
    externalUrl: artist.external_urls?.spotify || null
  };
}

function normalizeTrack(track) {
  if (!track) return null;
  return {
    id: track.id,
    name: track.name,
    durationMs: track.duration_ms ?? null,
    previewUrl: track.preview_url || null,
    uri: track.uri || null,
    externalUrl: track.external_urls?.spotify || null,
    artists: (track.artists || []).map((artist) => ({ id: artist.id, name: artist.name })),
    album: track.album ? {
      id: track.album.id,
      name: track.album.name,
      image: normalizeImage(track.album.images)
    } : null
  };
}

export async function searchArtists(query, limit = 5) {
  if (!query || !query.trim()) return [];
  const accessToken = await getAppAccessToken();
  const cacheKey = `spotify:search-artists:${query.toLowerCase()}:${limit}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const data = await spotifyGet('/search', accessToken, {
    q: query.trim(),
    type: 'artist',
    limit: Math.min(Math.max(limit, 1), 10)
  });
  const artists = (data.artists?.items || []).map(normalizeArtist).filter(Boolean);
  setCache(cacheKey, artists, 600);
  return artists;
}

export async function getArtistDetails(artistId) {
  if (!artistId) throw new Error('Falta el identificador del artista.');
  const accessToken = await getAppAccessToken();
  const cacheKey = `spotify:artist:${artistId}:${getSpotifyMarket()}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const [artistData, topTracksData, albumsData] = await Promise.all([
    spotifyGet(`/artists/${encodeURIComponent(artistId)}`, accessToken),
    spotifyGet(`/artists/${encodeURIComponent(artistId)}/top-tracks`, accessToken, { market: getSpotifyMarket() })
      .catch(() => ({ tracks: [] })),
    spotifyGet(`/artists/${encodeURIComponent(artistId)}/albums`, accessToken, {
      limit: 20,
      include_groups: 'album,single',
      market: getSpotifyMarket()
    }).catch(() => ({ items: [] }))
  ]);

  const result = {
    ...normalizeArtist(artistData),
    topTracks: (topTracksData.tracks || []).map(normalizeTrack).filter(Boolean),
    albums: (albumsData.items || []).map((album) => ({
      id: album.id,
      name: album.name,
      type: album.album_type,
      releaseDate: album.release_date || null,
      image: normalizeImage(album.images),
      externalUrl: album.external_urls?.spotify || null
    }))
  };

  setCache(cacheKey, result, 600);
  return result;
}

export async function getArtistPreview(artistName) {
  if (!artistName || !artistName.trim()) return null;
  const artists = await searchArtists(artistName, 1);
  if (artists.length === 0) return null;
  const details = await getArtistDetails(artists[0].id);
  const track = details.topTracks?.[0] || null;
  if (!track) return null;
  return {
    ...track,
    artist: { id: details.id, name: details.name, image: details.image }
  };
}

export async function getUserProfile(accessToken) {
  const cacheKey = `spotify:user:${accessToken.substring(0, 12)}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const profile = await spotifyGet('/me', accessToken);
  setCache(cacheKey, profile, 300);
  return profile;
}

export async function getTopArtists(accessToken, timeRange = 'medium_term', limit = 50) {
  const cacheKey = `spotify:top-artists:${accessToken.substring(0, 12)}:${timeRange}:${limit}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const data = await spotifyGet('/me/top/artists', accessToken, {
    time_range: timeRange,
    limit: Math.min(Math.max(limit, 1), 50)
  });
  setCache(cacheKey, data.items || [], 600);
  return data.items || [];
}

export async function getTopTracks(accessToken, timeRange = 'medium_term', limit = 50) {
  const cacheKey = `spotify:top-tracks:${accessToken.substring(0, 12)}:${timeRange}:${limit}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const data = await spotifyGet('/me/top/tracks', accessToken, {
    time_range: timeRange,
    limit: Math.min(Math.max(limit, 1), 50)
  });
  setCache(cacheKey, data.items || [], 600);
  return data.items || [];
}

export async function getArtistAlbums(artistId, limit = 20) {
  if (!artistId) throw new Error('Falta el identificador del artista.');
  const accessToken = await getAppAccessToken();
  const data = await spotifyGet(`/artists/${encodeURIComponent(artistId)}/albums`, accessToken, {
    limit: Math.min(Math.max(limit, 1), 50),
    include_groups: 'album,single',
    market: getSpotifyMarket()
  });
  return data.items || [];
}

export async function buildAffinityProfile(accessToken) {
  const [topArtists, topTracks] = await Promise.all([
    getTopArtists(accessToken, 'medium_term', 50),
    getTopTracks(accessToken, 'medium_term', 50)
  ]);

  const genreWeights = {};
  topArtists.forEach((artist, index) => {
    const weight = Math.max(1, 50 - index);
    (artist.genres || []).forEach((genre) => {
      genreWeights[genre] = (genreWeights[genre] || 0) + weight;
    });
  });

  const topGenres = Object.entries(genreWeights)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([genre, weight]) => ({ genre, weight }));

  const normalizedArtists = topArtists.slice(0, 20).map(normalizeArtist);
  const normalizedTracks = topTracks.slice(0, 20).map(normalizeTrack);

  return {
    topArtists: normalizedArtists,
    topTracks: normalizedTracks,
    topGenres,
    artists: normalizedArtists,
    tracks: normalizedTracks
  };
}

export function spotifyErrorPayload(error, fallback = 'No se pudo completar la solicitud a Spotify.') {
  const status = error?.response?.status || null;
  if (status === 401 || status === 403) {
    return {
      code: 'SPOTIFY_AUTH_ERROR',
      status,
      message: 'Spotify rechazó las credenciales o la sesión ha caducado.'
    };
  }
  if (status === 429) {
    return {
      code: 'SPOTIFY_RATE_LIMIT',
      status,
      message: 'Spotify limitó temporalmente las solicitudes. Inténtalo de nuevo en unos minutos.'
    };
  }
  if (!isSpotifyConfigured()) {
    return {
      code: 'SPOTIFY_NOT_CONFIGURED',
      status: null,
      message: 'Spotify no está configurado. Añade SPOTIFY_CLIENT_ID y SPOTIFY_CLIENT_SECRET.'
    };
  }
  return { code: 'SPOTIFY_ERROR', status, message: fallback };
}
