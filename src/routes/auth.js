import express from 'express';
import crypto from 'crypto';
import {
  getAuthorizationUrl,
  getSpotifyConfigStatus,
  getSpotifyRedirectUri,
  isSpotifyConfigured
} from '../services/spotify.js';

const router = express.Router();

const CONFIG_LABELS = {
  clientId: 'SPOTIFY_CLIENT_ID',
  clientSecret: 'SPOTIFY_CLIENT_SECRET',
  redirectUri: 'SPOTIFY_REDIRECT_URI'
};

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[character]));
}

function requestOrigin(req) {
  const forwardedHost = (req.get('x-forwarded-host') || '').split(',')[0].trim();
  const host = forwardedHost || req.get('host');
  return host ? `${req.protocol}://${host}` : '';
}

function redirectHostMatches(req, redirectUri) {
  try {
    const redirect = new URL(redirectUri);
    const current = requestOrigin(req);
    if (!current) return true;
    return redirect.host.toLowerCase() === new URL(current).host.toLowerCase();
  } catch {
    return false;
  }
}

function renderRedirectNotice(configured, current) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redirect URI de Spotify mal configurado</title>
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #000; color: #fff; font-family: system-ui, sans-serif; padding: 1.5rem; }
    main { max-width: 36rem; background: #1c1c1e; border: 1px solid rgba(255,255,255,.08); border-radius: 1.5rem; padding: 2rem; }
    h1 { margin: 0 0 1rem; font-size: 1.35rem; }
    p { color: rgba(235,235,245,.7); line-height: 1.6; }
    code { background: rgba(255,255,255,.08); padding: .15rem .4rem; border-radius: .35rem; word-break: break-all; }
    a { display: inline-block; margin-top: 1.25rem; color: #0a84ff; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <main>
    <h1>El callback de Spotify apunta a otro dominio</h1>
    <p>Estás entrando desde <code>${escapeHtml(current || 'este dominio')}</code>, pero <code>SPOTIFY_REDIRECT_URI</code> es <code>${escapeHtml(configured)}</code>.</p>
    <p>Si los dominios no coinciden, la cookie de sesión no se comparte y Spotify rechazará el login. Corrige la variable en Render (o en <code>.env</code> en local) para que sea <code>${escapeHtml(current)}/callback</code> y añade exactamente esa URL en <strong>Redirect URIs</strong> del Spotify Developer Dashboard.</p>
    <a href="/#/inicio">Volver a EventRadar</a>
  </main>
</body>
</html>`;
}

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
    <p>Faltan o siguen siendo de ejemplo estas variables en <code>.env</code>: <strong>${escapeHtml(list)}</strong>.</p>
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

  const redirectUri = getSpotifyRedirectUri();
  if (!redirectHostMatches(req, redirectUri)) {
    console.warn(`SPOTIFY_REDIRECT_URI (${redirectUri}) no coincide con el dominio actual (${requestOrigin(req)}).`);
    return res.status(503).type('html').send(renderRedirectNotice(redirectUri, requestOrigin(req)));
  }

  const state = crypto.randomBytes(32).toString('hex');
  const codeVerifier = crypto.randomBytes(64).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

  req.session.state = state;
  req.session.codeVerifier = codeVerifier;

  try {
    // cookie-session firma y escribe la cookie al finalizar la respuesta.
    return res.redirect(getAuthorizationUrl(state, codeChallenge));
  } catch (error) {
    console.error('Error building Spotify authorization URL:', error.message);
    return res.status(503).send('Spotify no está configurado correctamente');
  }
});

router.get('/logout', (req, res) => {
  req.session = null;
  res.redirect('/');
});

export default router;
