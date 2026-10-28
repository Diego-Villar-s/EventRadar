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

export function normalizeEvent(event) {
  const venue = event?._embedded?.venues?.[0] || null;
  const attractions = event?._embedded?.attractions || [];
  const classification = event?.classifications?.find((item) => item?.genre?.name) || event?.classifications?.[0] || null;
  const genres = [
    classification?.genre?.name,
    classification?.subGenre?.name
  ].filter((genre) => genre && genre !== 'Undefined');

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
    lat: numberOrNull(venue?.location?.latitude),
    lng: numberOrNull(venue?.location?.longitude),
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
  const queryParams = {
    apikey: apiKey,
    classificationName: 'music',
    size,
    page,
    sort: params.sort || 'date,asc',
    startDateTime: params.startDateTime || getDefaultStartDateTime()
  };

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
      events: rawEvents.map(normalizeEvent).filter((event) => event.id),
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
