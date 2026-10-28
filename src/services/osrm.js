import axios from 'axios';
import { getCache, setCache } from '../utils/cache.js';

const OSRM_BASE_URL = 'https://router.project-osrm.org';
const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
const PHOTON_BASE_URL = 'https://photon.komoot.io';
const USER_AGENT = 'EventRadar-FestivalMatch/1.0 (https://github.com/eventradar)';
const PROFILES = new Set(['driving', 'walking', 'cycling']);

function validCoordinate(value) {
  return Number.isFinite(Number(value));
}

function photonDisplayName(properties = {}) {
  return [
    properties.name,
    properties.street,
    properties.housenumber,
    properties.city,
    properties.state,
    properties.country
  ].filter(Boolean).join(', ');
}

export async function getRoute(fromLng, fromLat, toLng, toLat, profile = 'driving') {
  if (![fromLng, fromLat, toLng, toLat].every(validCoordinate)) {
    return { route: null, error: { code: 'BAD_REQUEST', message: 'Las coordenadas de origen o destino no son válidas.' } };
  }

  const normalizedProfile = PROFILES.has(profile) ? profile : 'driving';
  const cacheKey = `osrm:${normalizedProfile}:${fromLng},${fromLat}:${toLng},${toLat}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  try {
    const url = `${OSRM_BASE_URL}/route/v1/${normalizedProfile}/${fromLng},${fromLat};${toLng},${toLat}`;
    const response = await axios.get(url, {
      params: { overview: 'full', geometries: 'geojson', steps: true },
      timeout: 10000
    });

    if (response.data?.code !== 'Ok' || !response.data.routes?.length) {
      return {
        route: null,
        error: { code: 'NO_ROUTE', message: 'OSRM no encontró una ruta para esos puntos.' }
      };
    }

    const route = response.data.routes[0];
    const result = {
      route: {
        distance: route.distance / 1000,
        duration: route.duration / 60,
        geometry: route.geometry,
        legs: route.legs || [],
        profile: normalizedProfile,
        source: 'osrm'
      },
      error: null
    };
    setCache(cacheKey, result, 300);
    return result;
  } catch (error) {
    const status = error.response?.status;
    return {
      route: null,
      error: {
        code: 'OSRM_ERROR',
        status: status || null,
        message: 'No se pudo calcular la ruta con OSRM. Inténtalo de nuevo más tarde.'
      }
    };
  }
}

export async function geocode(address) {
  if (!address || !address.trim()) return null;
  const normalizedAddress = address.trim();
  const cacheKey = `geo:geocode:${normalizedAddress.toLowerCase()}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  try {
    const response = await axios.get(`${NOMINATIM_BASE_URL}/search`, {
      params: { q: normalizedAddress, format: 'json', limit: 1 },
      headers: { 'User-Agent': USER_AGENT },
      timeout: 8000
    });

    if (response.data?.length > 0) {
      const item = response.data[0];
      const result = {
        lat: Number.parseFloat(item.lat),
        lng: Number.parseFloat(item.lon),
        displayName: item.display_name,
        source: 'nominatim'
      };
      if (Number.isFinite(result.lat) && Number.isFinite(result.lng)) {
        setCache(cacheKey, result, 3600);
        return result;
      }
    }
  } catch {
    // Nominatim puede limitar o bloquear peticiones; se intenta Photon debajo.
  }

  try {
    const response = await axios.get(`${PHOTON_BASE_URL}/api/`, {
      params: { q: normalizedAddress, limit: 1 },
      timeout: 8000
    });
    const feature = response.data?.features?.[0];
    const coordinates = feature?.geometry?.coordinates;
    if (Array.isArray(coordinates) && coordinates.length >= 2) {
      const result = {
        lat: Number(coordinates[1]),
        lng: Number(coordinates[0]),
        displayName: photonDisplayName(feature.properties) || normalizedAddress,
        source: 'photon'
      };
      if (Number.isFinite(result.lat) && Number.isFinite(result.lng)) {
        setCache(cacheKey, result, 3600);
        return result;
      }
    }
  } catch {
    return null;
  }

  return null;
}

export async function reverseGeocode(lat, lng) {
  if (!validCoordinate(lat) || !validCoordinate(lng)) return null;
  const latitude = Number(lat);
  const longitude = Number(lng);
  const cacheKey = `geo:reverse:${latitude},${longitude}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  try {
    const response = await axios.get(`${NOMINATIM_BASE_URL}/reverse`, {
      params: { lat: latitude, lon: longitude, format: 'json' },
      headers: { 'User-Agent': USER_AGENT },
      timeout: 8000
    });

    if (response.data?.display_name) {
      const result = {
        displayName: response.data.display_name,
        address: response.data.address || null,
        source: 'nominatim'
      };
      setCache(cacheKey, result, 3600);
      return result;
    }
  } catch {
    // Fallback a Photon.
  }

  try {
    const response = await axios.get(`${PHOTON_BASE_URL}/reverse`, {
      params: { lat: latitude, lon: longitude, limit: 1 },
      timeout: 8000
    });
    const feature = response.data?.features?.[0];
    if (feature?.properties) {
      const result = {
        displayName: photonDisplayName(feature.properties),
        address: {
          city: feature.properties.city || null,
          state: feature.properties.state || null,
          country: feature.properties.country || null
        },
        source: 'photon'
      };
      setCache(cacheKey, result, 3600);
      return result;
    }
  } catch {
    return null;
  }

  return null;
}
