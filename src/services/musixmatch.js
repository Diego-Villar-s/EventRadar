import axios from 'axios';
import dotenv from 'dotenv';
import { getCache, setCache } from '../utils/cache.js';

dotenv.config();

const MUSIXMATCH_API_KEY = process.env.MUSIXMATCH_API_KEY;
const BASE_URL = 'https://api.musixmatch.com/ws/1.1';

export async function searchTrack(artistName, trackName) {
  const cacheKey = `musixmatch:search:${artistName}:${trackName}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;
  
  if (!MUSIXMATCH_API_KEY) {
    console.warn('Musixmatch API key not configured');
    return null;
  }
  
  try {
    const response = await axios.get(`${BASE_URL}/track.search`, {
      params: {
        apikey: MUSIXMATCH_API_KEY,
        q_artist: artistName,
        q_track: trackName,
        format: 'json',
        f_has_lyrics: 1
      },
      timeout: 10000
    });
    
    if (response.data.message.body.track_list && response.data.message.body.track_list.length > 0) {
      const track = response.data.message.body.track_list[0].track;
      setCache(cacheKey, track, 1800);
      return track;
    }
    
    return null;
  } catch (error) {
    console.error('Error searching track on Musixmatch:', error.message);
    return null;
  }
}

export async function getLyrics(trackId) {
  const cacheKey = `musixmatch:lyrics:${trackId}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;
  
  if (!MUSIXMATCH_API_KEY) {
    return null;
  }
  
  try {
    const response = await axios.get(`${BASE_URL}/track.lyrics.get`, {
      params: {
        apikey: MUSIXMATCH_API_KEY,
        track_id: trackId,
        format: 'json'
      },
      timeout: 10000
    });
    
    if (response.data.message.body.lyrics) {
      const lyrics = response.data.message.body.lyrics.lyrics_body;
      // Musixmatch free tier only gives snippet
      setCache(cacheKey, lyrics, 1800);
      return {
        lyrics: lyrics,
        hasFullLyrics: false,
        disclaimer: response.data.message.body.lyrics.lyrics_copyright
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting lyrics from Musixmatch:', error.message);
    return null;
  }
}
