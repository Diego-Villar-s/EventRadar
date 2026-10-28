import express from 'express';
import { searchEvents } from '../services/ticketmaster.js';
import { buildAffinityProfile } from '../services/spotify.js';
import { sortEventsByMatch } from '../utils/matchScore.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { city, countryCode, keyword, startDateTime, endDateTime, size, page } = req.query;
    
    const params = {
      size: size || 20,
      page: page || 0
    };
    
    if (city) params.city = city;
    if (countryCode) params.countryCode = countryCode;
    if (keyword) params.keyword = keyword;
    if (startDateTime) params.startDateTime = startDateTime;
    if (endDateTime) params.endDateTime = endDateTime;
    
    const result = await searchEvents(params);
    
    // If user is authenticated with Spotify, calculate match scores
    if (req.session.spotify && result.events) {
      try {
        let { accessToken, refreshToken, expiresAt } = req.session.spotify;
        // For simplicity, skip token refresh in this route
        const affinity = await buildAffinityProfile(accessToken);
        result.events = sortEventsByMatch(result.events, affinity);
      } catch (error) {
        console.error('Error calculating match scores:', error);
        // Continue without match scores
      }
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error in events route:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

export default router;
