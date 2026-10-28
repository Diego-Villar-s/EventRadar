import { findLyrics as findOnLrclib } from './lrclib.js';
import { findLyrics as findOnMusixmatch, isMusixmatchConfigured } from './musixmatch.js';

/**
 * Orden de fuentes:
 * 1. LRCLIB: gratuita, sin clave y con letra completa (texto y versión sincronizada).
 * 2. Musixmatch: solo si hay una API key configurada; el plan free suele devolver
 *    fragmentos, pero sirve como respaldo cuando LRCLIB no tiene la canción.
 */
export async function findLyrics(artistName, trackName) {
  const lrclib = await findOnLrclib(artistName, trackName);
  if (lrclib.lyrics) return lrclib;

  if (isMusixmatchConfigured()) {
    const musixmatch = await findOnMusixmatch(artistName, trackName);
    if (musixmatch.lyrics) {
      return { ...musixmatch, source: 'musixmatch' };
    }
  }

  return lrclib;
}
