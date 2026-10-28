import express from 'express';
import {
  searchArtists,
  getArtistDetails,
  getArtistPreview,
  getArtistAlbums,
  spotifyErrorPayload,
  isSpotifyConfigured
} from '../services/spotify.js';
import { findArtist } from '../services/genius.js';
import { findLyrics } from '../services/musixmatch.js';

const router = express.Router();
const SPOTIFY_ID = /^[A-Za-z0-9]{22}$/;

function providerFailure(error, fallback) {
  return { code: 'PROVIDER_ERROR', status: error?.response?.status || null, message: fallback };
}

router.get('/search', async (req, res) => {
  const name = req.query.name || req.query.q;
  if (!name || !name.trim()) {
    return res.status(400).json({ artists: [], error: { code: 'BAD_REQUEST', message: 'Escribe el nombre de un artista.' } });
  }

  if (!isSpotifyConfigured()) {
    return res.json({
      artists: [],
      error: {
        code: 'SPOTIFY_NOT_CONFIGURED',
        message: 'Spotify no está configurado. Añade SPOTIFY_CLIENT_ID y SPOTIFY_CLIENT_SECRET para buscar artistas.'
      }
    });
  }

  try {
    const artists = await searchArtists(name, 8);
    res.json({ artists, error: null });
  } catch (error) {
    res.json({ artists: [], error: spotifyErrorPayload(error, 'No se pudo buscar el artista en Spotify.') });
  }
});

router.get('/preview', async (req, res) => {
  const name = req.query.name;
  if (!name || !name.trim()) {
    return res.status(400).json({ track: null, error: { code: 'BAD_REQUEST', message: 'Falta el nombre del artista.' } });
  }
  if (!isSpotifyConfigured()) {
    return res.json({
      track: null,
      error: {
        code: 'SPOTIFY_NOT_CONFIGURED',
        message: 'Spotify no está configurado. No se puede reproducir una vista previa real.'
      }
    });
  }

  try {
    const track = await getArtistPreview(name);
    if (!track) {
      return res.json({ track: null, error: { code: 'NOT_FOUND', message: 'Spotify no encontró una canción para este artista.' } });
    }
    res.json({ track, error: null });
  } catch (error) {
    res.json({ track: null, error: spotifyErrorPayload(error, 'No se pudo obtener una canción de Spotify.') });
  }
});

router.get('/lyrics', async (req, res) => {
  const { artist, track } = req.query;
  if (!artist || !track) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Faltan el artista o la canción.' } });
  }
  const result = await findLyrics(artist, track);
  res.json(result);
});

router.get('/lyrics/search', async (req, res) => {
  const { artist, track } = req.query;
  if (!artist || !track) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Faltan el artista o la canción.' } });
  }
  const result = await findLyrics(artist, track);
  res.json(result);
});

router.get('/:id/albums', async (req, res) => {
  if (!isSpotifyConfigured()) {
    return res.json({
      albums: [],
      error: {
        code: 'SPOTIFY_NOT_CONFIGURED',
        message: 'Spotify no está configurado. Añade SPOTIFY_CLIENT_ID y SPOTIFY_CLIENT_SECRET.'
      }
    });
  }
  try {
    const albums = await getArtistAlbums(req.params.id, Number(req.query.limit) || 20);
    res.json({ albums, error: null });
  } catch (error) {
    res.json({ albums: [], error: spotifyErrorPayload(error, 'No se pudo cargar la discografía.') });
  }
});

router.get('/:id', async (req, res) => {
  const rawId = req.params.id;
  if (!isSpotifyConfigured()) {
    return res.json({
      artist: null,
      genius: null,
      error: {
        code: 'SPOTIFY_NOT_CONFIGURED',
        message: 'Spotify no está configurado. Añade SPOTIFY_CLIENT_ID y SPOTIFY_CLIENT_SECRET para ver la ficha del artista.'
      }
    });
  }

  try {
    let artistId = rawId;
    if (!SPOTIFY_ID.test(rawId)) {
      const matches = await searchArtists(rawId, 1);
      if (matches.length === 0) {
        return res.status(404).json({
          artist: null,
          error: { code: 'NOT_FOUND', message: 'No se encontró ese artista en Spotify.' }
        });
      }
      artistId = matches[0].id;
    }

    const artist = await getArtistDetails(artistId);
    const geniusResult = await findArtist(artist.name);
    res.json({
      artist,
      genius: geniusResult.artist,
      geniusError: geniusResult.error,
      error: null
    });
  } catch (error) {
    if (error?.response?.status === 404) {
      return res.status(404).json({
        artist: null,
        error: { code: 'NOT_FOUND', message: 'No se encontró ese artista en Spotify.' }
      });
    }
    res.json({
      artist: null,
      genius: null,
      error: error?.response
        ? spotifyErrorPayload(error, 'No se pudo cargar el artista desde Spotify.')
        : providerFailure(error, 'No se pudo cargar el artista.')
    });
  }
});

export default router;
