import express from 'express';
import crypto from 'crypto';
import { getAuthorizationUrl, getSpotifyConfigStatus, isSpotifyConfigured } from '../services/spotify.js';

const router = express.Router();

const CONFIG_LABELS = {
  clientId: 'SPOTIFY_CLIENT_ID',
  clientSecret: 'SPOTIFY_CLIENT_SECRET',
  redirectUri: 'SPOTIFY_REDIRECT_URI'
};

function renderConfigNotice(missing) {
  const list = missing.map((key) => CONFIG_LABELS[key] || key).join(', ');
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Spotify no configurado</title>
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #000; color: #fff; font-family: system-ui, sans-serif; padding: 1.5rem; }
    main { max-width: 32rem; background: #1c1c1e; border: 1px solid rgba(255,255,255,.08); border-radius: 1.5rem; padding: 2rem; }
    h1 { margin: 0 0 1rem; font-size: 1.35rem; }
    p { color: rgba(235,235,245,.7); line-height: 1.6; }
    code { background: rgba(255,255,255,.08); padding: .15rem .4rem; border-radius: .35rem; }
    a { display: inline-block; margin-top: 1.25rem; color: #0a84ff; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <main>
    <h1>Spotify no está configurado</h1>
    <p>Faltan o siguen siendo de ejemplo estas variables en <code>.env</code>: <strong>${list}</strong>.</p>
    <p>Completa las credenciales reales en el archivo <code>.env</code> y reinicia el servidor. No se ha generado ninguna URL de autorización.</p>
    <a href="/#/inicio">Volver a EventRadar</a>
  </main>
</body>
</html>`;
}

router.get('/login', (req, res) => {
  if (!isSpotifyConfigured()) {
    const status = getSpotifyConfigStatus();
    const missing = Object.entries(status)
      .filter(([, configured]) => !configured)
      .map(([key]) => key);

    return res.status(503).type('html').send(renderConfigNotice(missing));
  }

  const state = crypto.randomBytes(32).toString('hex');
  const codeVerifier = crypto.randomBytes(64).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

  req.session.state = state;
  req.session.codeVerifier = codeVerifier;

  req.session.save((err) => {
    if (err) {
      console.error('Error saving session before Spotify login:', err);
      return res.status(500).send('No se pudo iniciar la sesión de Spotify');
    }

    try {
      return res.redirect(getAuthorizationUrl(state, codeChallenge));
    } catch (error) {
      console.error('Error building Spotify authorization URL:', error.message);
      return res.status(503).send('Spotify no está configurado correctamente');
    }
  });
});

router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
    }
    res.redirect('/');
  });
});

export default router;
