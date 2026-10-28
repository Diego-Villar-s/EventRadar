import 'dotenv/config';
import express from 'express';
import session from 'cookie-session';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

// Routes
import authRoutes from './src/routes/auth.js';
import spotifyRoutes, { handleSpotifyCallback } from './src/routes/spotify.js';
import { isSpotifyConfigured, getSpotifyRedirectUri } from './src/services/spotify.js';
import eventsRoutes from './src/routes/events.js';
import weatherRoutes from './src/routes/weather.js';
import artistRoutes from './src/routes/artist.js';
import geoRoutes from './src/routes/geo.js';
import healthRoutes from './src/routes/health.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const environment = process.env.NODE_ENV || 'development';
const isProduction = environment === 'production';
const configuredPort = Number.parseInt(process.env.PORT || '', 10);
const PORT = Number.isInteger(configuredPort) && configuredPort > 0 ? configuredPort : 3000;
const HOST = process.env.HOST || '0.0.0.0';
const BASE_URL = (process.env.BASE_URL || `http://127.0.0.1:${PORT}`).replace(/\/+$/, '');
const usesHttps = BASE_URL.startsWith('https://');
const trustProxy = process.env.TRUST_PROXY === 'true' || isProduction;

if (trustProxy) {
  app.set('trust proxy', 1);
}

if (isProduction && !usesHttps) {
  console.warn('⚠️  BASE_URL no usa HTTPS. Las cookies Secure no se enviarán por HTTP.');
}

app.disable('x-powered-by');

const contentSecurityPolicy = {
  useDefaults: true,
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'",
      // La API iFrame de Spotify evalúa parte de su propio código.
      "'unsafe-eval'",
      'https://open.spotify.com',
      'https://embed-cdn.spotifycdn.com',
      'https://unpkg.com'
    ],
    styleSrc: [
      "'self'",
      "'unsafe-inline'",
      'https://fonts.googleapis.com',
      'https://unpkg.com'
    ],
    fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
    imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
    mediaSrc: ["'self'", 'blob:', 'https:'],
    connectSrc: ["'self'", 'https://open.spotify.com', 'https://*.spotifycdn.com'],
    frameSrc: ['https://open.spotify.com', 'https://open.spotifycdn.com'],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
    upgradeInsecureRequests: isProduction ? [] : null
  }
};

app.use(helmet({
  contentSecurityPolicy,
  crossOriginEmbedderPolicy: false,
  hsts: isProduction
    ? { maxAge: 31536000, includeSubDomains: true, preload: false }
    : false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

app.use(express.json({ limit: '32kb' }));
app.use(express.urlencoded({ extended: true, limit: '32kb' }));

const configuredSessionSecret = (process.env.SESSION_SECRET || '').trim();
const isPlaceholderSecret = !configuredSessionSecret
  || /your[_-]|tu[_-]|change[_-]?me|example|placeholder|secret-key-change/i.test(configuredSessionSecret)
  || configuredSessionSecret.length < 32;

if (isProduction && isPlaceholderSecret) {
  console.error('SESSION_SECRET debe ser un valor aleatorio de al menos 32 caracteres en producción.');
  process.exit(1);
}

if (isPlaceholderSecret) {
  console.warn('⚠️  SESSION_SECRET no es seguro. Se usará una clave temporal de desarrollo; las sesiones se perderán al reiniciar.');
}

const sessionSecret = isPlaceholderSecret
  ? crypto.randomBytes(32).toString('hex')
  : configuredSessionSecret;

app.use(session({
  name: 'eventradar.sid',
  keys: [sessionSecret],
  maxAge: 24 * 60 * 60 * 1000,
  httpOnly: true,
  sameSite: 'lax',
  secure: isProduction || usesHttps,
  path: '/'
}));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMITED',
        message: 'Demasiadas solicitudes. Espera unos minutos e inténtalo de nuevo.'
      }
    });
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMITED',
        message: 'Demasiados intentos de autenticación. Espera unos minutos.'
      }
    });
  }
});

// OAuth callback (must be handled before static files and the SPA)
app.get('/callback', authLimiter, handleSpotifyCallback);

// Health checks are intentionally cheap and do not call third-party APIs.
app.use('/api/health', healthRoutes);
app.use('/health', healthRoutes);

app.use('/auth', authLimiter, authRoutes);
app.use('/api', apiLimiter, spotifyRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/artist', artistRoutes);
app.use('/api/geo', geoRoutes);

// API 404s never fall through to the SPA HTML.
app.use('/api', (req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'El recurso solicitado no existe.'
    }
  });
});

// Static files
app.use(express.static(path.join(__dirname, 'public'), {
  index: false,
  maxAge: isProduction ? '1h' : 0
}));

// Serve main HTML for the hash-router application.
app.get('/', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('*', (req, res, next) => {
  if (!req.accepts('html') || path.extname(req.path)) return next();
  res.set('Cache-Control', 'no-store');
  return res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((req, res) => {
  res.status(404).type('text').send('No encontrado');
});

// Production-safe error handler: details stay in the server log.
app.use((err, req, res, next) => {
  const status = Number.isInteger(err?.status) && err.status >= 400 && err.status < 600
    ? err.status
    : 500;
  const requestId = crypto.randomBytes(6).toString('hex');
  console.error(`[${requestId}] ${req.method} ${req.originalUrl}`, err?.stack || err);

  if (res.headersSent) return next(err);

  const message = status >= 500
    ? 'Ocurrió un error interno. Inténtalo de nuevo más tarde.'
    : 'La solicitud no se pudo procesar.';

  if (req.path.startsWith('/api')) {
    return res.status(status).json({
      error: { code: status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR', message, requestId }
    });
  }

  return res.status(status).type('text').send(message);
});

if (!isSpotifyConfigured()) {
  console.warn('⚠️  Spotify no está configurado (claves ausentes o de ejemplo). /auth/login responderá 503.');
} else {
  const spotifyRedirect = getSpotifyRedirectUri();
  const expectedRedirect = `${BASE_URL}/callback`;
  if (spotifyRedirect !== expectedRedirect) {
    console.warn(`⚠️  SPOTIFY_REDIRECT_URI (${spotifyRedirect}) no coincide con BASE_URL (${expectedRedirect}).`);
    console.warn('   El login fallará si esa URL no está registrada exactamente en Spotify Dashboard.');
  }
}

const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 EventRadar server running on ${BASE_URL}`);
  console.log(`📝 Environment: ${environment}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    console.log(`\n${signal} recibido. Cerrando servidor...`);
    server.close(() => process.exit(0));
  });
}

export default app;
