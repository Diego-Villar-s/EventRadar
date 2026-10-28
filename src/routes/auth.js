import express from 'express';
import crypto from 'crypto';
import {
  getAuthorizationUrl,
  getSpotifyConfigStatus,
  getSpotifyRedirectUri,
  isSpotifyConfigured
} from '../services/spotify.js';
import {
  getUserInfo,
  isLastfmConfigured,
  lastfmErrorPayload
} from '../services/lastfm.js';

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

function renderLastfmConnectPage({ error = null, username = '', configured = true } = {}) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Conectar Last.fm · EventRadar</title>
  <style>
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: radial-gradient(circle at 50% 0%, #1b2a3a, #05070a 62%); color: #f5f5f7; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 1.5rem; }
    main { width: min(100%, 34rem); background: rgba(28, 28, 30, .94); border: 1px solid rgba(255, 255, 255, .1); border-radius: 1.5rem; padding: 2rem; box-shadow: 0 30px 80px rgba(0, 0, 0, .45); }
    .kicker { display: inline-flex; align-items: center; gap: .45rem; font-size: .75rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #30d158; margin-bottom: 1rem; }
    .kicker::before { content: ""; width: .5rem; height: .5rem; border-radius: 50%; background: #30d158; box-shadow: 0 0 12px #30d158; }
    h1 { margin: 0 0 .75rem; font-size: 1.65rem; line-height: 1.2; }
    p { color: rgba(235, 235, 245, .72); line-height: 1.65; margin: .55rem 0; }
    .notice { margin: 1.25rem 0; padding: 1rem; border-radius: 1rem; background: rgba(255, 159, 10, .1); border: 1px solid rgba(255, 159, 10, .28); color: #ffd60a; font-size: .9rem; line-height: 1.5; }
    .error { margin: 1rem 0; padding: .85rem 1rem; border-radius: .9rem; background: rgba(255, 69, 58, .12); border: 1px solid rgba(255, 69, 58, .3); color: #ffb4ab; font-size: .9rem; line-height: 1.5; }
    form { margin-top: 1.5rem; display: grid; gap: .75rem; }
    label { font-size: .85rem; font-weight: 600; color: rgba(235, 235, 245, .82); }
    input { width: 100%; padding: .85rem 1rem; border-radius: .85rem; border: 1px solid rgba(255, 255, 255, .16); background: rgba(255, 255, 255, .06); color: #fff; font-size: 1rem; outline: none; }
    input:focus { border-color: #30d158; box-shadow: 0 0 0 3px rgba(48, 209, 88, .18); }
    button { padding: .9rem 1.1rem; border: 0; border-radius: .9rem; background: #30d158; color: #06240f; font-weight: 700; font-size: .95rem; cursor: pointer; }
    button:hover { filter: brightness(1.06); }
    .actions { display: flex; flex-wrap: wrap; gap: .75rem; margin-top: 1.35rem; }
    a { color: #0a84ff; text-decoration: none; font-weight: 600; }
    a.secondary { display: inline-flex; align-items: center; padding: .8rem 1rem; border-radius: .9rem; border: 1px solid rgba(255, 255, 255, .14); color: #f5f5f7; }
    code { background: rgba(255, 255, 255, .08); padding: .15rem .4rem; border-radius: .35rem; word-break: break-all; }
    .fine { font-size: .8rem; color: rgba(235, 235, 245, .5); margin-top: 1.25rem; line-height: 1.6; }
  </style>
</head>
<body>
  <main>
    <span class="kicker">EventRadar</span>
    <h1>Conecta tu Last.fm</h1>
    <p>El inicio de sesión con Spotify está <strong>temporalmente en pausa</strong>: su Web API exige una suscripción Premium en la cuenta dueña de la app. Para que EventRadar siga funcionando gratis, calculamos tu afinidad musical con <strong>Last.fm</strong>.</p>
    <div class="notice">Solo necesitamos tu nombre de usuario público de Last.fm. No pedimos contraseña ni permisos de escritura.</div>
    ${error ? `<div class="error" role="alert">${escapeHtml(error)}</div>` : ''}
    ${configured ? `
      <form method="post" action="/auth/lastfm">
        <label for="lastfmUsername">Usuario de Last.fm</label>
        <input id="lastfmUsername" name="username" type="text" value="${escapeHtml(username)}" placeholder="Ej. diego_villar" autocomplete="username" maxlength="64" required autofocus>
        <button type="submit">Conectar Last.fm</button>
      </form>
      <p class="fine">¿Aún no tienes cuenta? <a href="https://www.last.fm/join" target="_blank" rel="noopener noreferrer">Crea una gratis</a>. La app usa una API key gratuita configurada en el servidor con <code>LASTFM_API_KEY</code>.</p>
    ` : `
      <div class="notice">Falta <code>LASTFM_API_KEY</code> en el servidor. Añádela en Render → Environment y vuelve a desplegar.</div>
      <p>Crea una API key gratuita en <a href="https://www.last.fm/api/account/create" target="_blank" rel="noopener noreferrer">last.fm/api/account/create</a> y cópiala en la variable <code>LASTFM_API_KEY</code>.</p>
    `}
    <div class="actions">
      <a class="secondary" href="/#/match">Explorar eventos sin conectar</a>
      <a class="secondary" href="/">Volver al inicio</a>
    </div>
  </main>
</body>
</html>`;
}

// Login activo: Last.fm por nombre de usuario público, sin OAuth.
router.get('/login', (req, res) => {
  res.set('Cache-Control', 'no-store');
  const configured = isLastfmConfigured();
  return res.type('html').send(renderLastfmConnectPage({ configured }));
});

router.post('/lastfm', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const username = String(req.body?.username || '').trim();

  if (!isLastfmConfigured()) {
    return res.status(503).type('html').send(
      renderLastfmConnectPage({ configured: false, username })
    );
  }

  if (!username || username.length > 64) {
    return res.status(400).type('html').send(
      renderLastfmConnectPage({
        username,
        error: 'Escribe un nombre de usuario de Last.fm válido (máximo 64 caracteres).'
      })
    );
  }

  try {
    const user = await getUserInfo(username);
    req.session.lastfm = {
      username: user.username,
      user,
      connectedAt: Date.now()
    };
    // cookie-session firma y escribe la cookie al finalizar esta respuesta.
    return res.redirect('/#/match');
  } catch (error) {
    const payload = lastfmErrorPayload(error, 'No se pudo verificar tu usuario de Last.fm.');
    const status = payload.code === 'LASTFM_USER_NOT_FOUND' ? 404 : 502;
    return res.status(status).type('html').send(
      renderLastfmConnectPage({ username, error: payload.message })
    );
  }
});

// Flujo OAuth de Spotify conservado para reactivarlo en el futuro. El login
// activo es /auth/login (Last.fm); este endpoint no está enlazado en la UI.
router.get('/spotify', (req, res) => {
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
