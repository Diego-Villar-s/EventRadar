import express from 'express';
import { searchArtist, getArtistDetails, getArtistSongs } from '../services/genius.js';
import { getArtistAlbums } from '../services/spotify.js';
import { searchTrack, getLyrics } from '../services/musixmatch.js';

const router = express.Router();

router.get('/search', async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }
    
    const artist = await searchArtist(name);
    res.json(artist);
  } catch (error) {
    console.error('Error searching artist:', error);
    res.status(500).json({ error: 'Failed to search artist' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const artist = await getArtistDetails(id);
    res.json(artist);
  } catch (error) {
    console.error('Error getting artist:', error);
    res.status(500).json({ error: 'Failed to get artist details' });
  }
});

router.get('/:id/songs', async (req, res) => {
  try {
    const { id } = req.params;
    const { sort = 'popularity', limit = 20 } = req.query;
    const songs = await getArtistSongs(id, sort, limit);
    res.json(songs);
  } catch (error) {
    console.error('Error getting artist songs:', error);
    res.status(500).json({ error: 'Failed to get artist songs' });
  }
});

router.get('/:id/albums', async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.session.spotify) {
      return res.json([]);
    }
    
    let { accessToken, refreshToken, expiresAt } = req.session.spotify;
    const albums = await getArtistAlbums(accessToken, id);
    res.json(albums);
  } catch (error) {
    console.error('Error getting artist albums:', error);
    res.status(500).json({ error: 'Failed to get artist albums' });
  }
});

router.get('/lyrics/search', async (req, res) => {
  try {
    const { artist, track } = req.query;
    if (!artist || !track) {
      return res.status(400).json({ error: 'artist and track are required' });
    }
    
    const trackData = await searchTrack(artist, track);
    if (!trackData) {
      return res.json({ lyrics: null, message: 'No lyrics found' });
    }
    
    const lyrics = await getLyrics(trackData.track_id);
    res.json({
      track: trackData,
      ...lyrics
    });
  } catch (error) {
    console.error('Error getting lyrics:', error);
    res.status(500).json({ error: 'Failed to get lyrics' });
  }
});

export default router;
