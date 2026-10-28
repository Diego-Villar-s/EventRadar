import express from 'express';
import { getTokens, refreshAccessToken, getUserProfile, buildAffinityProfile } from '../services/spotify.js';

const router = express.Router();

export async function handleSpotifyCallback(req, res) {
  const { code, state, error: spotifyError } = req.query;

  if (spotifyError) {
    console.error('Spotify callback returned an error:', spotifyError);
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

    return req.session.save((err) => {
      if (err) {
        console.error('Error saving Spotify session:', err);
        return res.redirect('/#callback=error');
      }
      return res.redirect('/#callback=success');
    });
  } catch (error) {
    const detail = error.response?.data?.error_description || error.response?.data?.error || error.message;
    console.error('Error in callback:', detail);
    return res.redirect('/#callback=error');
  }
}

router.get('/me', async (req, res) => {
  if (!req.session.spotify) {
    return res.json(null);
  }
  
  try {
    let { accessToken, refreshToken, expiresAt } = req.session.spotify;
    
    // Check if token expired
    if (Date.now() >= expiresAt - 60000) { // Refresh 1 minute before expiry
      const refreshed = await refreshAccessToken(refreshToken);
      accessToken = refreshed.accessToken;
      req.session.spotify.accessToken = accessToken;
      req.session.spotify.expiresAt = Date.now() + refreshed.expiresIn * 1000;
    }
    
    const profile = await getUserProfile(accessToken);
    res.json(profile);
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
});

router.get('/profile/affinity', async (req, res) => {
  if (!req.session.spotify) {
    return res.json(null);
  }
  
  try {
    let { accessToken, refreshToken, expiresAt } = req.session.spotify;
    
    if (Date.now() >= expiresAt - 60000) {
      const refreshed = await refreshAccessToken(refreshToken);
      accessToken = refreshed.accessToken;
      req.session.spotify.accessToken = accessToken;
      req.session.spotify.expiresAt = Date.now() + refreshed.expiresIn * 1000;
    }
    
    const affinity = await buildAffinityProfile(accessToken);
    res.json(affinity);
  } catch (error) {
    console.error('Error getting affinity:', error);
    res.status(500).json({ error: 'Failed to build affinity profile' });
  }
});

export default router;
