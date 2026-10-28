import express from 'express';
import {
  getTokens,
  getUserProfile,
  buildAffinityProfile,
  getValidUserAccessToken
} from '../services/spotify.js';

const router = express.Router();

export async function handleSpotifyCallback(req, res) {
  const { code, state, error: spotifyError } = req.query;

  if (spotifyError) {
    return res.redirect('/#callback=error');
  }

  if (!state || !req.session?.state || state !== req.session.state) {
    return res.status(400).type('text').send('La sesión de autenticación no coincide. Vuelve a iniciar sesión desde EventRadar.');
  }

  const codeVerifier = req.session.codeVerifier;
  delete req.session.state;
  delete req.session.codeVerifier;

  if (!code) {
    return res.status(400).type('text').send('Spotify no devolvió un código de autorización.');
  }

  if (!codeVerifier) {
    return res.status(400).type('text').send('Falta el verificador PKCE. Vuelve a iniciar sesión desde EventRadar.');
  }

  try {
    const tokens = await getTokens(code, codeVerifier);

    req.session.spotify = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: Date.now() + tokens.expiresIn * 1000
    };

    // cookie-session escribe la cookie firmada al finalizar esta respuesta.
    return res.redirect('/#callback=success');
  } catch (error) {
    console.error('Spotify token exchange failed:', error?.response?.status || error?.message || 'unknown error');
    return res.redirect('/#callback=error');
  }
}

router.get('/me', async (req, res) => {
  const accessToken = await getValidUserAccessToken(req.session);
  if (!accessToken) return res.json(null);

  try {
    const profile = await getUserProfile(accessToken);
    res.json(profile);
  } catch {
    res.status(502).json({
      error: { code: 'PROVIDER_ERROR', message: 'No se pudo cargar el perfil de Spotify.' }
    });
  }
});

router.get('/profile/affinity', async (req, res) => {
  const accessToken = await getValidUserAccessToken(req.session);
  if (!accessToken) return res.json(null);

  try {
    const affinity = await buildAffinityProfile(accessToken);
    res.json(affinity);
  } catch {
    res.status(502).json({
      error: { code: 'PROVIDER_ERROR', message: 'No se pudo calcular tu afinidad musical.' }
    });
  }
});

export default router;
