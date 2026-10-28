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

  if (!state || state !== req.session.state) {
    return res.status(400).send('State mismatch');
  }

  const codeVerifier = req.session.codeVerifier;
  delete req.session.state;
  delete req.session.codeVerifier;

  if (!code) {
    return res.status(400).send('Missing authorization code');
  }

  if (!codeVerifier) {
    return res.status(400).send('Missing PKCE code verifier');
  }

  try {
    const tokens = await getTokens(code, codeVerifier);

    req.session.spotify = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: Date.now() + tokens.expiresIn * 1000
    };

    const save = (next) => {
      if (typeof req.session.save === 'function') return req.session.save(next);
      next();
      return undefined;
    };

    return save((err) => {
      if (err) return res.redirect('/#callback=error');
      return res.redirect('/#callback=success');
    });
  } catch {
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
    res.status(502).json({ error: 'No se pudo cargar el perfil de Spotify.' });
  }
});

router.get('/profile/affinity', async (req, res) => {
  const accessToken = await getValidUserAccessToken(req.session);
  if (!accessToken) return res.json(null);

  try {
    const affinity = await buildAffinityProfile(accessToken);
    res.json(affinity);
  } catch {
    res.status(502).json({ error: 'No se pudo calcular tu afinidad musical.' });
  }
});

export default router;
