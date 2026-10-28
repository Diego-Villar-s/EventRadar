import express from 'express';
import { searchEvents, getEventById } from '../services/ticketmaster.js';
import { buildAffinityProfile, getValidUserAccessToken } from '../services/spotify.js';
import { calculateMatchScore, sortEventsByMatch } from '../utils/matchScore.js';

const router = express.Router();

const DEFAULT_SIZE = 20;
const MAX_SIZE = 50;
const DEFAULT_RADIUS_KM = 150;
const MAX_RADIUS_KM = 500;

async function getAffinity(req) {
  const accessToken = await getValidUserAccessToken(req.session);
  if (!accessToken) return null;
  try {
    return await buildAffinityProfile(accessToken);
  } catch {
    return null;
  }
}

function validCoordinate(lat, lng) {
  const latitude = Number(lat);
  const longitude = Number(lng);
  return Number.isFinite(latitude)
    && Number.isFinite(longitude)
    && latitude >= -90
    && latitude <= 90
    && longitude >= -180
    && longitude <= 180;
}

function parseSize(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_SIZE;
  return Math.min(Math.max(parsed, 1), MAX_SIZE);
}

function parseRadius(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_RADIUS_KM;
  return Math.min(Math.max(parsed, 1), MAX_RADIUS_KM);
}

function hasResults(result) {
  return Array.isArray(result?.events) && result.events.length > 0;
}

function hasUpstreamError(result) {
  // Si Ticketmaster falla, no se insiste con las siguientes búsquedas:
  // evita 3-4 timeouts encadenados y devuelve el error real.
  return Boolean(result?.error);
}

function sortByDistance(events) {
  return [...events].sort((a, b) => {
    const aDistance = typeof a.distanceKm === 'number' ? a.distanceKm : Number.POSITIVE_INFINITY;
    const bDistance = typeof b.distanceKm === 'number' ? b.distanceKm : Number.POSITIVE_INFINITY;
    if (aDistance !== bDistance) return aDistance - bDistance;
    return (a.datetime || a.date || '').localeCompare(b.datetime || b.date || '');
  });
}

router.get('/', async (req, res) => {
  const {
    city,
    countryCode,
    keyword,
    startDateTime,
    endDateTime,
    size,
    page,
    lat,
    lng,
    radius,
    unit
  } = req.query;

  const sizeNumber = parseSize(size);
  const pageNumber = Math.max(Number.parseInt(page, 10) || 0, 0);
  const radiusKm = parseRadius(radius);
  const origin = validCoordinate(lat, lng)
    ? { lat: Number(lat), lng: Number(lng) }
    : null;
  const normalizedCountry = countryCode && /^[a-z]{2}$/i.test(countryCode)
    ? countryCode.toUpperCase()
    : null;

  const baseParams = { size: sizeNumber, page: pageNumber };
  if (keyword) baseParams.keyword = keyword;
  if (startDateTime) baseParams.startDateTime = startDateTime;
  if (endDateTime) baseParams.endDateTime = endDateTime;

  let result = null;
  let scope = 'global';

  // 1) Eventos en un radio cercano a la ubicación del usuario.
  if (origin) {
    const nearby = await searchEvents({
      ...baseParams,
      lat: origin.lat,
      lng: origin.lng,
      radius: radiusKm,
      unit: unit === 'miles' ? 'miles' : 'km',
      sort: 'distance,asc',
      origin
    });

    if (hasResults(nearby)) {
      result = nearby;
      scope = 'nearby';
    } else if (hasUpstreamError(nearby)) {
      result = nearby;
    }
  }

  // 2) Si no hay nada cerca, eventos del mismo país.
  if (!result && normalizedCountry) {
    const countryResult = await searchEvents({
      ...baseParams,
      size: MAX_SIZE,
      page: 0,
      countryCode: normalizedCountry,
      sort: 'date,asc',
      origin
    });

    if (hasResults(countryResult)) {
      result = countryResult;
      scope = 'country';
    } else if (hasUpstreamError(countryResult)) {
      result = countryResult;
    }
  }

  // 3) Si el país no tiene eventos, se intenta la ciudad.
  if (!result && city) {
    const cityResult = await searchEvents({
      ...baseParams,
      size: MAX_SIZE,
      page: 0,
      city,
      sort: 'date,asc',
      origin
    });

    if (hasResults(cityResult)) {
      result = cityResult;
      scope = 'city';
    } else if (hasUpstreamError(cityResult)) {
      result = cityResult;
    }
  }

  // 4) Último recurso: cartelera internacional (sin filtro geográfico).
  if (!result) {
    result = await searchEvents({
      ...baseParams,
      sort: 'date,asc',
      origin
    });
    scope = 'global';
  }

  let events = Array.isArray(result.events) ? result.events : [];

  if (origin) {
    events = sortByDistance(events);
  }
  if (scope === 'country' || scope === 'city') {
    events = events.slice(0, sizeNumber);
  }

  if (events.length > 0) {
    const affinity = await getAffinity(req);
    if (affinity) {
      events = sortEventsByMatch(events, affinity);
      result.hasAffinity = true;
    } else {
      events = events.map((event) => ({ ...event, matchScore: null }));
      result.hasAffinity = false;
    }
  }

  res.json({
    ...result,
    events,
    meta: {
      scope,
      origin,
      radiusKm,
      countryCode: normalizedCountry,
      city: city || null,
      page: pageNumber,
      size: sizeNumber
    }
  });
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
