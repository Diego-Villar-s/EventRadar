import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Routes
import authRoutes from './src/routes/auth.js';
import spotifyRoutes, { handleSpotifyCallback } from './src/routes/spotify.js';
import { isSpotifyConfigured } from './src/services/spotify.js';
import eventsRoutes from './src/routes/events.js';
import weatherRoutes from './src/routes/weather.js';
import artistRoutes from './src/routes/artist.js';
import geoRoutes from './src/routes/geo.js';
import healthRoutes from './src/routes/health.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.BASE_URL || 'http://127.0.0.1:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'eventradar-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// OAuth callback (must be handled before static files and the SPA)
app.get('/callback', handleSpotifyCallback);

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/auth', authRoutes);
app.use('/api', spotifyRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/artist', artistRoutes);
app.use('/api/geo', geoRoutes);
app.use('/api/health', healthRoutes);

// Serve main HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!', message: err.message });
});

const sessionSecret = process.env.SESSION_SECRET ? process.env.SESSION_SECRET.trim() : '';
if (!sessionSecret) {
  console.warn('⚠️  SESSION_SECRET no está configurado. Se usará un valor de desarrollo inseguro.');
} else if (/your[_-]|change[_-]?me|example|placeholder/i.test(sessionSecret)) {
  console.warn('⚠️  SESSION_SECRET parece un valor de ejemplo. Cámbialo antes de publicar.');
}

if (!isSpotifyConfigured()) {
  console.warn('⚠️  Spotify no está configurado (claves ausentes o de ejemplo). /auth/login responderá 503.');
}

app.listen(PORT, '127.0.0.1', () => {
  console.log(`🚀 EventRadar server running on http://127.0.0.1:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
});
