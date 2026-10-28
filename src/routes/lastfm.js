import express from 'express';
import {
  buildAffinityProfile,
  getUserInfo,
  isLastfmConfigured,
  lastfmErrorPayload
} from '../services/lastfm.js';

const router = express.Router();

function sessionUsername(session) {
  const username = session?.lastfm?.username;
  return typeof username === 'string' && username.trim() ? username.trim() : null;
}

function sessionUser(session) {
  const lastfm = session?.lastfm;
  if (!lastfm?.username) return null;
  const user = lastfm.user || null;
  return {
    id: user?.id || lastfm.username,
    displayName: user?.displayName || user?.display_name || lastfm.username,
    image: user?.image || null,
    url: user?.url || null
  };
}

router.get('/session', (req, res) => {
  res.set('Cache-Control', 'no-store');
  const username = sessionUsername(req.session);
  res.json({
    authenticated: Boolean(username),
    provider: 'lastfm',
    user: sessionUser(req.session),
    connectedAt: req.session?.lastfm?.connectedAt || null
  });
});

router.get('/me', (req, res) => {
  res.set('Cache-Control', 'no-store');
  const lastfm = req.session?.lastfm;
  if (!lastfm?.username) return res.json(null);

  if (lastfm.user) return res.json(lastfm.user);

  // Sesión antigua o incompleta: se devuelve un perfil mínimo para no perder
  // la cuenta conectada mientras Last.fm vuelve a responder.
  return res.json({
    id: lastfm.username,
    username: lastfm.username,
    display_name: lastfm.username,
    displayName: lastfm.username,
    images: [],
    image: null,
    url: null
  });
});

router.get('/profile/affinity', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const username = sessionUsername(req.session);
  if (!username) return res.json(null);

  try {
    const affinity = await buildAffinityProfile(username);
    res.json(affinity);
  } catch (error) {
    const payload = lastfmErrorPayload(error, 'No se pudo calcular tu afinidad musical con Last.fm.');
    console.warn('Last.fm affinity lookup failed:', JSON.stringify(payload));
    const status = payload.code === 'LASTFM_NOT_CONFIGURED'
      ? 503
      : payload.status === 404 || payload.status === 429
        ? payload.status
        : 502;
    res.status(status).json({ error: payload });
  }
});

router.get('/lastfm/status', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({
    configured: isLastfmConfigured(),
    connected: Boolean(sessionUsername(req.session)),
    username: sessionUsername(req.session)
  });
});

router.post('/lastfm/connect', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const username = String(req.body?.username || '').trim();

  if (!username || username.length > 64) {
    return res.status(400).json({
      connected: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'Escribe un nombre de usuario de Last.fm válido (máximo 64 caracteres).'
      }
    });
  }

  if (!isLastfmConfigured()) {
    return res.status(503).json({
      connected: false,
      error: lastfmErrorPayload(null, 'Last.fm no está configurado.')
    });
  }

  try {
    const user = await getUserInfo(username);
    req.session.lastfm = {
      username: user.username,
      user,
      connectedAt: Date.now()
    };
    return res.json({ connected: true, user });
  } catch (error) {
    const payload = lastfmErrorPayload(error, 'No se pudo verificar tu usuario de Last.fm.');
    const status = payload.code === 'LASTFM_USER_NOT_FOUND' ? 404 : 502;
    return res.status(status).json({ connected: false, error: payload });
  }
});

router.post('/lastfm/disconnect', (req, res) => {
  res.set('Cache-Control', 'no-store');
  if (req.session) req.session.lastfm = null;
  res.json({ connected: false });
});

export default router;
