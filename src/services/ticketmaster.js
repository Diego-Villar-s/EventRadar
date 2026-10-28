import axios from 'axios';
import { getCache, setCache } from '../utils/cache.js';

const BASE_URL = 'https://app.ticketmaster.com/discovery/v2';
const DEFAULT_SIZE = 20;
const MAX_SIZE = 50;

function getKey() {
  const key = process.env.TICKETMASTER_API_KEY;
  if (!key) return null;
  const trimmed = key.trim();
  if (!trimmed || /^(your_|tu_|change|example|placeholder|xxx)/i.test(trimmed)) return null;
  return trimmed;
}

function safeUrl(value) {
  if (!value || typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function bestImage(images = []) {
  if (!Array.isArray(images) || images.length === 0) return null;
  const image = images.find((item) => item.ratio === '16_9' && item.url)
    || images.find((item) => item.url)
    || null;
  return image ? safeUrl(image.url) : null;
}

function numberOrNull(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function haversineKm(origin, destination) {
  if (!origin || !destination) return null;
  const toRad = (value) => (Number(value) * Math.PI) / 180;
  const lat1 = toRad(origin.lat);
  const lat2 = toRad(destination.lat);
  const deltaLat = lat2 - lat1;
  const deltaLng = toRad(destination.lng - origin.lng);
  const h = Math.sin(deltaLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return Math.round(6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h))) * 10) / 10;
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

function ticketmasterDate(date = new Date()) {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export function isTicketmasterConfigured() {
  return Boolean(getKey());
}

export function getDefaultStartDateTime() {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  return ticketmasterDate(start);
}

export function normalizeEvent(event, origin = null) {
  const venue = event?._embedded?.venues?.[0] || null;
  const attractions = event?._embedded?.attractions || [];
  const classification = event?.classifications?.find((item) => item?.genre?.name) || event?.classifications?.[0] || null;
  const genres = [
    classification?.genre?.name,
    classification?.subGenre?.name
  ].filter((genre) => genre && genre !== 'Undefined');
  const lat = numberOrNull(venue?.location?.latitude);
  const lng = numberOrNull(venue?.location?.longitude);
  const distanceKm = origin && lat !== null && lng !== null
    ? haversineKm(origin, { lat, lng })
    : null;

  return {
    id: event?.id || null,
    name: event?.name || 'Evento sin nombre',
    date: event?.dates?.start?.localDate || null,
    time: event?.dates?.start?.localTime || null,
    datetime: event?.dates?.start?.dateTime || null,
    timezone: event?.dates?.timezone || null,
    image: bestImage(event?.images),
    venue: venue?.name || 'Recinto por confirmar',
    address: venue?.address?.line1 || '',
    city: venue?.city?.name || '',
    country: venue?.country?.name || '',
    countryCode: venue?.country?.countryCode || '',
    lat,
    lng,
    distanceKm,
    priceMin: numberOrNull(event?.priceRanges?.[0]?.min),
    priceMax: numberOrNull(event?.priceRanges?.[0]?.max),
    currency: event?.priceRanges?.[0]?.currency || null,
    url: safeUrl(event?.url),
    genres,
    subgenres: classification?.subGenre?.name && classification.subGenre.name !== 'Undefined'
      ? [classification.subGenre.name]
      : [],
    artists: attractions
      .filter((artist) => artist?.name)
      .map((artist) => ({
        id: artist.id || null,
        name: artist.name,
        image: bestImage(artist.images)
      })),
    source: 'ticketmaster'
  };
}

function emptyResult(error = null) {
  return {
    events: [],
    page: { totalElements: 0, number: 0, size: 0, totalPages: 0 },
    totalElements: 0,
    source: 'ticketmaster',
    error
  };
}

export async function searchEvents(params = {}) {
  const cacheKey = `ticketmaster:search:${JSON.stringify(params)}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const apiKey = getKey();
  if (!apiKey) {
    return emptyResult({
      code: 'MISSING_KEY',
      message: 'Ticketmaster no está configurado. Añade TICKETMASTER_API_KEY para cargar eventos reales.'
    });
  }

  const size = Math.min(Math.max(Number.parseInt(params.size, 10) || DEFAULT_SIZE, 1), MAX_SIZE);
  const page = Math.max(Number.parseInt(params.page, 10) || 0, 0);
  const hasOrigin = validCoordinate(params.lat, params.lng);
  const distanceOrigin = validCoordinate(params.origin?.lat, params.origin?.lng)
    ? { lat: Number(params.origin.lat), lng: Number(params.origin.lng) }
    : hasOrigin
      ? { lat: Number(params.lat), lng: Number(params.lng) }
      : null;
  const requestedSort = params.sort || 'date,asc';
  const sort = requestedSort === 'distance,asc' && !hasOrigin ? 'date,asc' : requestedSort;
  const queryParams = {
    apikey: apiKey,
    classificationName: 'music',
    size,
    page,
    sort,
    startDateTime: params.startDateTime || getDefaultStartDateTime()
  };

  if (hasOrigin) {
    const radius = Math.min(Math.max(Number.parseInt(params.radius, 10) || 100, 1), 500);
    queryParams.latlong = `${Number(params.lat)},${Number(params.lng)}`;
    queryParams.radius = radius;
    queryParams.unit = params.unit === 'miles' ? 'miles' : 'km';
  }

  if (params.city) queryParams.city = params.city;
  if (params.countryCode) queryParams.countryCode = params.countryCode;
  if (params.keyword) queryParams.keyword = params.keyword;
  if (params.endDateTime) queryParams.endDateTime = params.endDateTime;
  if (params.venueId) queryParams.venueId = params.venueId;

  try {
    const response = await axios.get(`${BASE_URL}/events.json`, {
      params: queryParams,
      timeout: 10000
    });

    const rawEvents = response.data?._embedded?.events || [];
    if (rawEvents.length === 0) {
      const result = {
        ...emptyResult(null),
        page: response.data?.page || emptyResult().page
      };
      setCache(cacheKey, result, 120);
      return result;
    }

    const result = {
      events: rawEvents.map((event) => normalizeEvent(event, distanceOrigin)).filter((event) => event.id),
      page: response.data?.page || { number: page, size, totalElements: rawEvents.length },
      totalElements: response.data?.page?.totalElements ?? rawEvents.length,
      source: 'ticketmaster',
      error: null
    };

    setCache(cacheKey, result, 300);
    return result;
  } catch (error) {
    const status = error.response?.status;
    const isTimeout = error.code === 'ECONNABORTED';
    const code = status === 401 || status === 403
      ? 'INVALID_KEY'
      : isTimeout
        ? 'TIMEOUT'
        : 'UPSTREAM_ERROR';

    return emptyResult({
      code,
      status: status || null,
      message: code === 'INVALID_KEY'
        ? 'Ticketmaster rechazó la API key configurada.'
        : code === 'TIMEOUT'
          ? 'Ticketmaster tardó demasiado en responder. Inténtalo de nuevo.'
          : 'No se pudieron cargar los eventos desde Ticketmaster.'
    });
  }
}

export async function getEventById(id) {
  if (!id) {
    return { event: null, error: { code: 'BAD_REQUEST', message: 'Falta el identificador del evento.' } };
  }

  const cacheKey = `ticketmaster:event:${id}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const apiKey = getKey();
  if (!apiKey) {
    return {
      event: null,
      error: {
        code: 'MISSING_KEY',
        message: 'Ticketmaster no está configurado. Añade TICKETMASTER_API_KEY para cargar los detalles del evento.'
      }
    };
  }

  try {
    const response = await axios.get(`${BASE_URL}/events/${encodeURIComponent(id)}.json`, {
      params: { apikey: apiKey },
      timeout: 10000
    });
    const event = normalizeEvent(response.data);
    const result = { event, error: null };
    setCache(cacheKey, result, 300);
    return result;
  } catch (error) {
    const status = error.response?.status;
    if (status === 404) {
      return { event: null, error: { code: 'NOT_FOUND', message: 'El evento no existe o ya no está disponible.' } };
    }
    return {
      event: null,
      error: {
        code: status === 401 || status === 403 ? 'INVALID_KEY' : 'UPSTREAM_ERROR',
        status: status || null,
        message: 'No se pudo cargar el evento desde Ticketmaster.'
      }
    };
  }
}
