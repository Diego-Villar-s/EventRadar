import express from 'express';
import {
  searchArtists,
  getArtistDetails,
  getArtistPreview,
  getArtistAlbums,
  deezerErrorPayload
} from '../services/deezer.js';
import { getArtistTopTags, isLastfmConfigured } from '../services/lastfm.js';
import { findArtist } from '../services/genius.js';
import { findLyrics } from '../services/lyrics.js';

const router = express.Router();
const DEEZER_ID = /^\d+$/;

function providerFailure(error, fallback) {
  return {
    code: 'PROVIDER_ERROR',
    status: error?.status || error?.response?.status || null,
    message: fallback
  };
}

async function withLastfmGenres(artist) {
  if (!artist || !isLastfmConfigured()) return artist;
  try {
    const tags = await getArtistTopTags(artist.name, 8);
    if (tags.length === 0) return artist;
    return { ...artist, genres: tags.map((tag) => tag.name) };
  } catch {
    // La ficha sigue siendo útil sin etiquetas; Deezer no expone géneros.
    return artist;
  }
}

router.get('/search', async (req, res) => {
  const name = req.query.name || req.query.q;
  if (!name || !String(name).trim()) {
    return res.status(400).json({
      artists: [],
      error: { code: 'BAD_REQUEST', message: 'Escribe el nombre de un artista.' }
    });
  }

  try {
    const artists = await searchArtists(name, 8);
    res.json({ artists, error: null });
  } catch (error) {
    res.json({
      artists: [],
      error: deezerErrorPayload(error, 'No se pudo buscar el artista en Deezer.')
    });
  }
});

router.get('/preview', async (req, res) => {
  const name = req.query.name;
  if (!name || !String(name).trim()) {
    return res.status(400).json({
      track: null,
      error: { code: 'BAD_REQUEST', message: 'Falta el nombre del artista.' }
    });
  }

  try {
    const track = await getArtistPreview(name);
    if (!track) {
      return res.json({
        track: null,
        error: {
          code: 'NOT_FOUND',
          message: 'Deezer no encontró una vista previa de 30 segundos para este artista.'
        }
      });
    }
    res.json({ track, error: null });
  } catch (error) {
    res.json({
      track: null,
      error: deezerErrorPayload(error, 'No se pudo obtener una vista previa de Deezer.')
    });
  }
});

router.get('/lyrics', async (req, res) => {
  const { artist, track } = req.query;
  if (!artist || !track) {
    return res.status(400).json({
      error: { code: 'BAD_REQUEST', message: 'Faltan el artista o la canción.' }
    });
  }
  const result = await findLyrics(artist, track);
  res.json(result);
});

router.get('/lyrics/search', async (req, res) => {
  const { artist, track } = req.query;
  if (!artist || !track) {
    return res.status(400).json({
      error: { code: 'BAD_REQUEST', message: 'Faltan el artista o la canción.' }
    });
  }
  const result = await findLyrics(artist, track);
  res.json(result);
});

router.get('/:id/albums', async (req, res) => {
  if (!DEEZER_ID.test(req.params.id)) {
    return res.status(400).json({
      albums: [],
      error: { code: 'BAD_REQUEST', message: 'El identificador del artista no es válido.' }
    });
  }

  try {
    const albums = await getArtistAlbums(req.params.id, Number(req.query.limit) || 20);
    res.json({ albums, error: null });
  } catch (error) {
    res.json({
      albums: [],
      error: deezerErrorPayload(error, 'No se pudo cargar la discografía desde Deezer.')
    });
  }
});

router.get('/:id', async (req, res) => {
  const rawId = req.params.id;

  try {
    let artistId = rawId;
    if (!DEEZER_ID.test(rawId)) {
      const matches = await searchArtists(rawId, 1);
      if (matches.length === 0) {
        return res.status(404).json({
          artist: null,
          error: { code: 'NOT_FOUND', message: 'No se encontró ese artista en Deezer.' }
        });
      }
      artistId = matches[0].id;
    }

    const artist = await withLastfmGenres(await getArtistDetails(artistId));
    const geniusResult = await findArtist(artist.name);

    res.json({
      artist,
      genius: geniusResult.artist,
      geniusError: geniusResult.error,
      error: null
    });
  } catch (error) {
    if (error?.status === 404 || error?.deezer?.code === 800) {
      return res.status(404).json({
        artist: null,
        error: { code: 'NOT_FOUND', message: 'No se encontró ese artista en Deezer.' }
      });
    }

    const payload = error?.deezer || error?.response
      ? deezerErrorPayload(error, 'No se pudo cargar el artista desde Deezer.')
      : providerFailure(error, 'No se pudo cargar el artista.');

    res.json({ artist: null, genius: null, error: payload });
  }
});

export default router;
