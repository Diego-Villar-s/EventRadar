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

const ORIGIN_KEY = 'eventradar.origin';
const LOCATION_PROMPT_KEY = 'eventradar.locationPrompted';
export const DEFAULT_RADIUS_KM = 150;

export async function getSession() {
  try {
    return await apiRequest('/api/session');
  } catch {
    return null;
  }
}

function showProfile(user) {
  if (!user) return;
  const loginBtn = document.getElementById('spotifyLoginBtn');
  const profileDiv = document.getElementById('navProfile');
  const profileImg = document.getElementById('navProfileImg');
  const profileName = document.getElementById('navProfileName');

  const name = user.display_name || user.id || 'Cuenta de Spotify';
  if (loginBtn) loginBtn.style.display = 'none';
  if (profileDiv) profileDiv.style.display = 'flex';
  if (profileImg) profileImg.src = avatarUrl(user.images, name);
  if (profileName) profileName.textContent = name;

  if (profileName) {
    profileName.title = user.profileUnavailable
      ? 'Spotify conectado, pero rechazó la lectura del perfil (403). Revisa Users and Access en Spotify Dashboard.'
      : name;
  }
}

export function initAuth() {
  const loginBtn = document.getElementById('spotifyLoginBtn');
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

  getSession().then((session) => {
    if (session?.authenticated) {
      // La sesión ya existe: mostramos la instantánea guardada al hacer login
      // aunque Spotify tarde o falle al responder /api/me.
      if (session.user) {
        showProfile({
          id: session.user.id,
          display_name: session.user.displayName,
          images: session.user.image ? [{ url: session.user.image }] : []
        });
      } else {
        // /me devolvió 403: la cuenta está conectada, pero Spotify no permite
        // leer el nombre. Mostramos igualmente el perfil para no confundir al
        // usuario con un "sin conectar".
        showProfile({
          display_name: 'Cuenta de Spotify',
          images: [],
          profileUnavailable: true
        });
      }
      getCurrentUser(true).then((user) => {
        if (user) showProfile(user);
      });
      return;
    }

    getCurrentUser().then((user) => {
      if (user) showProfile(user);
    });
  });
}

function locationLabel(origin) {
  if (!origin) return 'Seleccionar ubicación';
  const place = origin.city || origin.label;
  if (!place) return 'Mi ubicación';
  return origin.country ? `${place}, ${origin.country}` : place;
}

export function getSavedOrigin() {
  try {
    const raw = localStorage.getItem(ORIGIN_KEY);
    if (!raw) return null;
    const origin = JSON.parse(raw);
    const lat = Number(origin?.lat);
    const lng = Number(origin?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    const radiusKm = Number(origin?.radiusKm);
    return {
      lat,
      lng,
      label: origin?.label || 'Mi ubicación',
      city: origin?.city || null,
      country: origin?.country || null,
      countryCode: origin?.countryCode || null,
      radiusKm: Number.isFinite(radiusKm) && radiusKm > 0 ? radiusKm : DEFAULT_RADIUS_KM
    };
  } catch {
    return null;
  }
}

export function saveOrigin(origin) {
  try {
    localStorage.setItem(ORIGIN_KEY, JSON.stringify(origin));
  } catch {
    // Sin localStorage la app sigue usando la ubicación en memoria.
  }
  window.dispatchEvent(new CustomEvent('eventradar:origin', { detail: origin }));
  return origin;
}

export function clearOrigin() {
  try {
    localStorage.removeItem(ORIGIN_KEY);
  } catch {
    // Ignorar.
  }
  window.dispatchEvent(new CustomEvent('eventradar:origin', { detail: null }));
}

function originFromPosition(position, geocode) {
  const { latitude, longitude } = position.coords;
  const result = geocode?.result || null;
  const address = result?.address || {};
  const city = result?.city || address.city || address.town || address.village || address.municipality || null;
  const country = result?.country || address.country || null;
  const rawCode = result?.countryCode || address.country_code || '';
  const countryCode = /^[a-z]{2}$/i.test(rawCode) ? rawCode.toUpperCase() : null;

  return {
    lat: latitude,
    lng: longitude,
    label: city || result?.displayName || 'Mi ubicación',
    city,
    country,
    countryCode,
    radiusKm: DEFAULT_RADIUS_KM
  };
}

export function detectOrigin() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ origin: null, error: 'Geolocalización no disponible' });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        let geocode = null;
        try {
          geocode = await reverseGeocode(position.coords.latitude, position.coords.longitude);
        } catch {
          // La ubicación por coordenadas sigue siendo válida sin geocodificación.
        }
        resolve({ origin: originFromPosition(position, geocode), error: null });
      },
      (error) => {
        const message = error?.code === 1
          ? 'Permiso de ubicación denegado'
          : 'No se pudo obtener la ubicación';
        resolve({ origin: null, error: message });
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
    );
  });
}

export function initNavLocation() {
  const button = document.getElementById('navLocationBtn');
  const text = document.getElementById('navLocationText');
  if (!button || !text) return;

  let current = getSavedOrigin();

  const paint = () => {
    text.textContent = locationLabel(current);
    button.classList.toggle('active', Boolean(current));
    button.title = current ? 'Cambiar ubicación' : 'Usar mi ubicación actual';
  };
  paint();

  const requestLocation = async (auto = false) => {
    const previous = text.textContent;
    text.textContent = 'Obteniendo ubicación…';
    button.disabled = true;

    const { origin, error } = await detectOrigin();

    button.disabled = false;
    if (!origin) {
      text.textContent = previous;
      button.title = error || 'No se pudo obtener la ubicación. Revisa los permisos del navegador.';
      if (!auto) {
        window.dispatchEvent(new CustomEvent('eventradar:location-error', { detail: error }));
      }
      return;
    }

    current = saveOrigin(origin);
    paint();
  };

  button.addEventListener('click', () => requestLocation(false));

  window.addEventListener('eventradar:origin', (event) => {
    current = event.detail || getSavedOrigin();
    paint();
  });

  // Al entrar por primera vez se pide la ubicación para mostrar eventos cercanos.
  if (!current) {
    let alreadyPrompted = false;
    try {
      alreadyPrompted = sessionStorage.getItem(LOCATION_PROMPT_KEY) === '1';
    } catch {
      // Ignorar.
    }

    if (!alreadyPrompted) {
      try {
        sessionStorage.setItem(LOCATION_PROMPT_KEY, '1');
      } catch {
        // Ignorar.
      }

      const start = () => setTimeout(() => requestLocation(true), 400);
      if (navigator.permissions?.query) {
        navigator.permissions.query({ name: 'geolocation' })
          .then((status) => {
            if (status.state !== 'denied') start();
          })
          .catch(start);
      } else {
        start();
      }
    }
  }
}
