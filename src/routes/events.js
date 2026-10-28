import express from 'express';
import { searchEvents, getEventById } from '../services/ticketmaster.js';
import { buildAffinityProfile, getValidUserAccessToken } from '../services/spotify.js';
import { calculateMatchScore, sortEventsByMatch } from '../utils/matchScore.js';

const router = express.Router();

async function getAffinity(req) {
  const accessToken = await getValidUserAccessToken(req.session);
  if (!accessToken) return null;
  try {
    return await buildAffinityProfile(accessToken);
  } catch {
    return null;
  }
}

router.get('/', async (req, res) => {
  const { city, countryCode, keyword, startDateTime, endDateTime, size, page } = req.query;
  const params = { size: size || 20, page: page || 0 };

  if (city) params.city = city;
  if (countryCode) params.countryCode = countryCode;
  if (keyword) params.keyword = keyword;
  if (startDateTime) params.startDateTime = startDateTime;
  if (endDateTime) params.endDateTime = endDateTime;

  const result = await searchEvents(params);

  if (result.events.length > 0) {
    const affinity = await getAffinity(req);
    if (affinity) {
      result.events = sortEventsByMatch(result.events, affinity);
      result.hasAffinity = true;
    } else {
      result.events = result.events.map((event) => ({ ...event, matchScore: null }));
      result.hasAffinity = false;
    }
  }

  res.json(result);
});

router.get('/:id', async (req, res) => {
  const { event, error } = await getEventById(req.params.id);

  if (!event) {
    const status = error?.code === 'NOT_FOUND' ? 404 : error?.code === 'MISSING_KEY' ? 503 : 502;
    return res.status(status).json({ event: null, error });
  }

  const affinity = await getAffinity(req);
  const payload = {
    ...event,
    matchScore: affinity ? calculateMatchScore(affinity, event) : null
  };

  res.json({ event: payload, error: null, hasAffinity: Boolean(affinity) });
});

export default router;
