import axios from 'axios';
import { getCache, setCache } from '../utils/cache.js';

const OSRM_BASE_URL = 'https://router.project-osrm.org';

export async function getRoute(fromLng, fromLat, toLng, toLat, profile = 'driving') {
  const cacheKey = `osrm:${profile}:${fromLng},${fromLat}:${toLng},${toLat}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;
  
  try {
    // OSRM uses lng,lat order
    const url = `${OSRM_BASE_URL}/route/v1/${profile}/${fromLng},${fromLat};${toLng},${toLat}`;
    const response = await axios.get(url, {
      params: {
        overview: 'full',
        geometries: 'geojson',
        steps: true
      },
      timeout: 10000
    });
    
    if (response.data.routes && response.data.routes.length > 0) {
      const route = response.data.routes[0];
      const result = {
        distance: route.distance / 1000, // km
        duration: route.duration / 60, // minutes
        geometry: route.geometry,
        legs: route.legs
      };
      setCache(cacheKey, result, 300);
      return result;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting route from OSRM:', error.message);
    return null;
  }
}

export async function geocode(address) {
  const cacheKey = `nominatim:geocode:${address}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;
  
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: address,
        format: 'json',
        limit: 1
      },
      headers: {
        'User-Agent': 'EventRadar-FestivalMatch/1.0'
      },
      timeout: 10000
    });
    
    if (response.data && response.data.length > 0) {
      const result = {
        lat: parseFloat(response.data[0].lat),
        lng: parseFloat(response.data[0].lon),
        displayName: response.data[0].display_name
      };
      setCache(cacheKey, result, 3600);
      return result;
    }
    
    return null;
  } catch (error) {
    console.error('Error geocoding:', error.message);
    return null;
  }
}

export async function reverseGeocode(lat, lng) {
  const cacheKey = `nominatim:reverse:${lat},${lng}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;
  
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: {
        lat,
        lon: lng,
        format: 'json'
      },
      headers: {
        'User-Agent': 'EventRadar-FestivalMatch/1.0'
      },
      timeout: 10000
    });
    
    if (response.data) {
      const result = {
        displayName: response.data.display_name,
        address: response.data.address
      };
      setCache(cacheKey, result, 3600);
      return result;
    }
    
    return null;
  } catch (error) {
    console.error('Error reverse geocoding:', error.message);
    return null;
  }
}
