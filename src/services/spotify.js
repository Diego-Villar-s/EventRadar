import SpotifyWebApi from 'spotify-web-api-node';
import axios from 'axios';
import dotenv from 'dotenv';
import { getCache, setCache } from '../utils/cache.js';

dotenv.config();

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';

const SCOPES = [
  'user-read-private',
  'user-read-email',
  'user-top-read',
  'streaming',
  'user-read-playback-state',
  'user-modify-playback-state'
];

function getEnv(name) {
  const value = process.env[name];
  return value ? value.trim() : '';
}

function isUsableValue(value) {
  if (!value) return false;
  return !/^(your[_-]|tu[_-]|change[_-]?me|example|placeholder|xxx)/i.test(value);
}

export function getSpotifyConfigStatus() {
  const clientId = getEnv('SPOTIFY_CLIENT_ID');
  const clientSecret = getEnv('SPOTIFY_CLIENT_SECRET');
  const redirectUri = getEnv('SPOTIFY_REDIRECT_URI');

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

const spotifyApi = new SpotifyWebApi({
  clientId: getEnv('SPOTIFY_CLIENT_ID'),
  clientSecret: getEnv('SPOTIFY_CLIENT_SECRET'),
  redirectUri: getEnv('SPOTIFY_REDIRECT_URI')
});

export function getAuthorizationUrl(state, codeChallenge) {
  if (!isSpotifyConfigured()) {
    throw new Error('Spotify no está configurado. Revisa SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET y SPOTIFY_REDIRECT_URI en .env');
  }
  if (!state || !codeChallenge) {
    throw new Error('Se requieren state y codeChallenge para iniciar el login de Spotify');
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: getEnv('SPOTIFY_CLIENT_ID'),
    scope: SCOPES.join(' '),
    redirect_uri: getEnv('SPOTIFY_REDIRECT_URI'),
    state,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge
  });

  return `${SPOTIFY_AUTH_URL}?${params.toString()}`;
}

export async function getTokens(code, codeVerifier) {
  const clientId = getEnv('SPOTIFY_CLIENT_ID');
  const redirectUri = getEnv('SPOTIFY_REDIRECT_URI');

  if (!clientId || !redirectUri) {
    throw new Error('Spotify no está configurado para canjear el código');
  }
  if (!code || !codeVerifier) {
    throw new Error('Faltan code o code_verifier en el callback de Spotify');
  }

  try {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      code_verifier: codeVerifier
    });

    const { data } = await axios.post(SPOTIFY_TOKEN_URL, body.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      timeout: 10000
    });

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in
    };
  } catch (error) {
    const detail = error.response?.data?.error_description || error.response?.data?.error || error.message;
    console.error('Error getting Spotify tokens:', detail);
    throw error;
  }
}

export async function refreshAccessToken(refreshToken) {
  try {
    spotifyApi.setRefreshToken(refreshToken);
    const data = await spotifyApi.refreshAccessToken();
    return {
      accessToken: data.body['access_token'],
      expiresIn: data.body['expires_in']
    };
  } catch (error) {
    console.error('Error refreshing Spotify token:', error);
    throw error;
  }
}

export async function getUserProfile(accessToken) {
  const cacheKey = `spotify:user:${accessToken.substring(0, 10)}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;
  
  try {
    spotifyApi.setAccessToken(accessToken);
    const data = await spotifyApi.getMe();
    setCache(cacheKey, data.body, 300);
    return data.body;
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
}

export async function getTopArtists(accessToken, timeRange = 'medium_term', limit = 50) {
  const cacheKey = `spotify:top-artists:${accessToken.substring(0, 10)}:${timeRange}:${limit}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;
  
  try {
    spotifyApi.setAccessToken(accessToken);
    const data = await spotifyApi.getMyTopArtists({ time_range: timeRange, limit: limit });
    setCache(cacheKey, data.body.items, 600);
    return data.body.items;
  } catch (error) {
    console.error('Error getting top artists:', error);
    throw error;
  }
}

export async function getTopTracks(accessToken, timeRange = 'medium_term', limit = 50) {
  const cacheKey = `spotify:top-tracks:${accessToken.substring(0, 10)}:${timeRange}:${limit}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;
  
  try {
    spotifyApi.setAccessToken(accessToken);
    const data = await spotifyApi.getMyTopTracks({ time_range: timeRange, limit: limit });
    setCache(cacheKey, data.body.items, 600);
    return data.body.items;
  } catch (error) {
    console.error('Error getting top tracks:', error);
    throw error;
  }
}

export async function searchPlaylists(accessToken, query) {
  try {
    spotifyApi.setAccessToken(accessToken);
    const data = await spotifyApi.searchPlaylists(query, { limit: 5 });
    return data.body.playlists.items;
  } catch (error) {
    console.error('Error searching playlists:', error);
    throw error;
  }
}

export async function getArtistAlbums(accessToken, artistId, limit = 20) {
  try {
    spotifyApi.setAccessToken(accessToken);
    const data = await spotifyApi.getArtistAlbums(artistId, { limit: limit, include_groups: 'album,single' });
    return data.body.items;
  } catch (error) {
    console.error('Error getting artist albums:', error);
    throw error;
  }
}

export async function buildAffinityProfile(accessToken) {
  try {
    const [topArtists, topTracks] = await Promise.all([
      getTopArtists(accessToken, 'medium_term', 50),
      getTopTracks(accessToken, 'medium_term', 50)
    ]);
    
    // Calculate weighted genres
    const genreWeights = {};
    topArtists.forEach((artist, index) => {
      const weight = Math.max(1, 50 - index); // Higher weight for top artists
      artist.genres.forEach(genre => {
        genreWeights[genre] = (genreWeights[genre] || 0) + weight;
      });
    });
    
    // Sort genres by weight
    const topGenres = Object.entries(genreWeights)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([genre, weight]) => ({ genre, weight }));
    
    return {
      topArtists: topArtists.slice(0, 20),
      topTracks: topTracks.slice(0, 20),
      topGenres,
      artists: topArtists,
      tracks: topTracks
    };
  } catch (error) {
    console.error('Error building affinity profile:', error);
    throw error;
  }
}

export { spotifyApi };
