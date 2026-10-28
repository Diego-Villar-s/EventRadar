import { avatarUrl } from './utils.js';

const API_BASE = window.location.origin;
let currentUserPromise = null;

export async function apiRequest(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    credentials: 'include',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers
    }
  });

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }
  }

  if (!response.ok) {
    const message = data?.error?.message || data?.error || `La solicitud falló (${response.status}).`;
    const error = new Error(typeof message === 'string' ? message : 'La solicitud falló.');
    error.status = response.status;
    error.payload = data;
    throw error;
  }

  return data;
}

function networkError(error, fallback) {
  return {
    code: 'NETWORK_ERROR',
    status: error?.status || null,
    message: error?.message || fallback
  };
}

export function getCurrentUser(force = false) {
  if (force || !currentUserPromise) {
    currentUserPromise = apiRequest('/api/me').catch(() => null);
  }
  return currentUserPromise;
}

export function clearCurrentUserCache() {
  currentUserPromise = null;
}

export async function getAffinityProfile() {
  try {
    return await apiRequest('/api/profile/affinity');
  } catch {
    return null;
  }
}

export async function getEvents(params = {}) {
  const queryString = new URLSearchParams(params).toString();
  try {
    return await apiRequest(`/api/events${queryString ? `?${queryString}` : ''}`);
  } catch (error) {
    return { events: [], error: networkError(error, 'No se pudieron cargar los eventos.') };
  }
}

export async function getEvent(id) {
  try {
    return await apiRequest(`/api/events/${encodeURIComponent(id)}`);
  } catch (error) {
    return {
      event: null,
      error: error.payload?.error || networkError(error, 'No se pudo cargar el evento.')
    };
  }
}

export async function getWeather(lat, lng) {
  try {
    return await apiRequest(`/api/weather?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`);
  } catch (error) {
    return { list: [], advice: null, error: networkError(error, 'No se pudo cargar el pronóstico.') };
  }
}

export async function geocodeAddress(address) {
  try {
    return await apiRequest(`/api/geo/geocode?address=${encodeURIComponent(address)}`);
  } catch (error) {
    return { result: null, error: networkError(error, 'No se pudo buscar la dirección.') };
  }
}

export async function reverseGeocode(lat, lng) {
  try {
    return await apiRequest(`/api/geo/reverse?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`);
  } catch (error) {
    return { result: null, error: networkError(error, 'No se pudo identificar la ubicación.') };
  }
}

export async function getRoute(fromLng, fromLat, toLng, toLat, profile = 'driving') {
  try {
    return await apiRequest(
      `/api/geo/route?fromLng=${encodeURIComponent(fromLng)}&fromLat=${encodeURIComponent(fromLat)}&toLng=${encodeURIComponent(toLng)}&toLat=${encodeURIComponent(toLat)}&profile=${encodeURIComponent(profile)}`
    );
  } catch (error) {
    return { route: null, error: networkError(error, 'No se pudo calcular la ruta.') };
  }
}

export async function searchArtist(name) {
  try {
    return await apiRequest(`/api/artist/search?name=${encodeURIComponent(name)}`);
  } catch (error) {
    return { artists: [], error: networkError(error, 'No se pudo buscar el artista.') };
  }
}

export async function getArtistDetails(id) {
  try {
    return await apiRequest(`/api/artist/${encodeURIComponent(id)}`);
  } catch (error) {
    return {
      artist: null,
      genius: null,
      error: error.payload?.error || networkError(error, 'No se pudo cargar el artista.')
    };
  }
}

export async function getArtistPreview(name) {
  try {
    return await apiRequest(`/api/artist/preview?name=${encodeURIComponent(name)}`);
  } catch (error) {
    return { track: null, error: networkError(error, 'No se pudo cargar la vista previa.') };
  }
}

export async function getArtistLyrics(artist, track) {
  try {
    return await apiRequest(`/api/artist/lyrics?artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(track)}`);
  } catch (error) {
    return { lyrics: null, track: null, error: networkError(error, 'No se pudo cargar la letra.') };
  }
}

function navLocationLabel(origin) {
  return origin?.label || 'Seleccionar ubicación';
}

export function initAuth() {
  const loginBtn = document.getElementById('spotifyLoginBtn');
  const profileDiv = document.getElementById('navProfile');
  const profileImg = document.getElementById('navProfileImg');
  const profileName = document.getElementById('navProfileName');
  const logoutBtn = document.getElementById('logoutBtn');

  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      window.location.href = '/auth/login';
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      clearCurrentUserCache();
      window.location.href = '/auth/logout';
    });
  }

  getCurrentUser().then((user) => {
    if (!user) return;
    if (loginBtn && profileDiv) {
      loginBtn.style.display = 'none';
      profileDiv.style.display = 'flex';
    }
    if (profileImg) profileImg.src = avatarUrl(user.images, user.display_name || user.id);
    if (profileName) profileName.textContent = user.display_name || user.id || 'Usuario';
  });
}

export function initNavLocation() {
  const button = document.getElementById('navLocationBtn');
  const text = document.getElementById('navLocationText');
  if (!button || !text) return;

  const saved = localStorage.getItem('eventradar.origin');
  if (saved) {
    try {
      const origin = JSON.parse(saved);
      text.textContent = navLocationLabel(origin);
    } catch {
      localStorage.removeItem('eventradar.origin');
    }
  }

  button.addEventListener('click', () => {
    if (!navigator.geolocation) {
      text.textContent = 'Geolocalización no disponible';
      return;
    }

    const previous = text.textContent;
    text.textContent = 'Obteniendo ubicación…';
    button.disabled = true;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const response = await reverseGeocode(latitude, longitude);
        const label = response.result?.address?.city
          || response.result?.address?.town
          || response.result?.address?.state
          || response.result?.displayName
          || 'Mi ubicación';
        const origin = { lat: latitude, lng: longitude, label };
        localStorage.setItem('eventradar.origin', JSON.stringify(origin));
        text.textContent = label;
        button.disabled = false;
      },
      () => {
        text.textContent = previous;
        button.disabled = false;
        button.title = 'No se pudo obtener la ubicación. Revisa los permisos del navegador.';
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  });
}
