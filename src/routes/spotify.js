import express from 'express';
import {
  getTokens,
  getUserProfile,
  buildAffinityProfile,
  getValidUserAccessToken
} from '../services/spotify.js';

const router = express.Router();

function sessionUserFromProfile(profile) {
  if (!profile) return null;
  const image = Array.isArray(profile.images) ? profile.images.find((item) => item?.url)?.url || null : null;
  return {
    id: profile.id || null,
    displayName: profile.display_name || profile.id || null,
    image
  };
}

export async function handleSpotifyCallback(req, res) {
  const { code, state, error: spotifyError } = req.query;

  if (spotifyError) {
    const reason = spotifyError === 'access_denied' ? 'access_denied' : 'spotify_error';
    return res.redirect(`/#callback=error&reason=${reason}`);
  }

  if (!state || !req.session?.state || state !== req.session.state) {
    return res.redirect('/#callback=error&reason=state');
  }

  const codeVerifier = req.session.codeVerifier;
  delete req.session.state;
  delete req.session.codeVerifier;

  if (!code) {
    return res.redirect('/#callback=error&reason=missing_code');
  }

  if (!codeVerifier) {
    return res.redirect('/#callback=error&reason=missing_verifier');
  }

  try {
    const tokens = await getTokens(code, codeVerifier);

    // Guardamos una instantánea mínima del perfil para que la navbar pueda
    // mostrar la cuenta incluso si Spotify falla al pedir /me más tarde.
    let user = null;
    try {
      const profile = await getUserProfile(tokens.accessToken);
      user = sessionUserFromProfile(profile);
    } catch (profileError) {
      console.warn('Spotify profile lookup failed after login:', profileError?.response?.status || profileError?.message);
    }

    req.session.spotify = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: Date.now() + tokens.expiresIn * 1000,
      user
    };

    // cookie-session escribe la cookie firmada al finalizar esta respuesta.
    return res.redirect('/#callback=success');
  } catch (error) {
    console.error('Spotify token exchange failed:', error?.response?.status || error?.message || 'unknown error');
    return res.redirect('/#callback=error&reason=token');
  }
}

router.get('/session', (req, res) => {
  res.set('Cache-Control', 'no-store');
  const spotify = req.session?.spotify;
  res.json({
    authenticated: Boolean(spotify?.accessToken),
    user: spotify?.user || null,
    expiresAt: spotify?.expiresAt || null
  });
});

function profileFromSessionUser(user) {
  if (!user) return null;
  return {
    id: user.id || null,
    display_name: user.displayName || user.id || null,
    images: user.image ? [{ url: user.image }] : []
  };
}

router.get('/me', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const sessionUser = req.session?.spotify?.user || null;
  const accessToken = await getValidUserAccessToken(req.session);

  if (!accessToken) {
    // La sesión pudo caducar, pero si guardamos la instantánea del perfil la
    // mostramos para no dar la impresión de que la cuenta desapareció.
    return res.json(profileFromSessionUser(sessionUser));
  }

  try {
    const profile = await getUserProfile(accessToken);
    if (req.session?.spotify) {
      req.session.spotify = { ...req.session.spotify, user: sessionUserFromProfile(profile) };
    }
    res.json(profile);
  } catch {
    const fallback = profileFromSessionUser(sessionUser);
    if (fallback) return res.json(fallback);
    res.status(502).json({
      error: { code: 'PROVIDER_ERROR', message: 'No se pudo cargar el perfil de Spotify.' }
    });
  }
});

router.get('/profile/affinity', async (req, res) => {
  res.set('Cache-Control', 'no-store');
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
