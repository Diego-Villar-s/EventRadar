import axios from 'axios';
import dotenv from 'dotenv';
import { getCache, setCache } from '../utils/cache.js';

dotenv.config();

const GENIUS_ACCESS_TOKEN = process.env.GENIUS_ACCESS_TOKEN;
const BASE_URL = 'https://api.genius.com';

export async function searchArtist(name) {
  const cacheKey = `genius:search:${name}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;
  
  if (!GENIUS_ACCESS_TOKEN) {
    console.warn('Genius API token not configured');
    return null;
  }
  
  try {
    const response = await axios.get(`${BASE_URL}/search`, {
      params: { q: name },
      headers: {
        'Authorization': `Bearer ${GENIUS_ACCESS_TOKEN}`
      },
      timeout: 10000
    });
    
    const hits = response.data.response.hits;
    const artistHit = hits.find(hit => hit.type === 'song' && hit.result.primary_artist.name.toLowerCase() === name.toLowerCase());
    
    if (artistHit) {
      setCache(cacheKey, artistHit.result.primary_artist, 1800);
      return artistHit.result.primary_artist;
    }
    
    // Return first artist found
    if (hits.length > 0 && hits[0].result.primary_artist) {
      const artist = hits[0].result.primary_artist;
      setCache(cacheKey, artist, 1800);
      return artist;
    }
    
    return null;
  } catch (error) {
    console.error('Error searching artist on Genius:', error.message);
    return null;
  }
}

export async function getArtistDetails(artistId) {
  const cacheKey = `genius:artist:${artistId}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;
  
  if (!GENIUS_ACCESS_TOKEN) {
    return null;
  }
  
  try {
    const response = await axios.get(`${BASE_URL}/artists/${artistId}`, {
      headers: {
        'Authorization': `Bearer ${GENIUS_ACCESS_TOKEN}`
      },
      timeout: 10000
    });
    
    setCache(cacheKey, response.data.response.artist, 1800);
    return response.data.response.artist;
  } catch (error) {
    console.error('Error getting artist details from Genius:', error.message);
    return null;
  }
}

export async function getArtistSongs(artistId, sort = 'popularity', limit = 20) {
  const cacheKey = `genius:artist-songs:${artistId}:${sort}:${limit}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;
  
  if (!GENIUS_ACCESS_TOKEN) {
    return [];
  }
  
  try {
    const response = await axios.get(`${BASE_URL}/artists/${artistId}/songs`, {
      params: { sort, per_page: limit },
      headers: {
        'Authorization': `Bearer ${GENIUS_ACCESS_TOKEN}`
      },
      timeout: 10000
    });
    
    setCache(cacheKey, response.data.response.songs, 1800);
    return response.data.response.songs;
  } catch (error) {
    console.error('Error getting artist songs from Genius:', error.message);
    return [];
  }
}
