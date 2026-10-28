const API_BASE = window.location.origin;

export async function apiGet(endpoint, options = {}) {
  return apiRequest(endpoint, { ...options, method: 'GET' });
}

export async function apiPost(endpoint, options = {}) {
  return apiRequest(endpoint, { ...options, method: 'POST' });
}

export async function apiRequest(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

// Auth
export async function getCurrentUser() {
  try {
    return await apiRequest('/api/me');
  } catch (error) {
    return null;
  }
}

export async function getAffinityProfile() {
  try {
    return await apiRequest('/api/profile/affinity');
  } catch (error) {
    return null;
  }
}

// Events
export async function getEvents(params = {}) {
  const queryString = new URLSearchParams(params).toString();
  try {
    return await apiRequest(`/api/events?${queryString}`);
  } catch (error) {
    console.error('Error fetching events:', error);
    return { events: [], isDemo: true };
  }
}

// Weather
export async function getWeather(lat, lng) {
  try {
    return await apiRequest(`/api/weather?lat=${lat}&lng=${lng}`);
  } catch (error) {
    console.error('Error fetching weather:', error);
    return null;
  }
}

// Geo
export async function geocodeAddress(address) {
  try {
    return await apiRequest(`/api/geo/geocode?address=${encodeURIComponent(address)}`);
  } catch (error) {
    console.error('Error geocoding:', error);
    return null;
  }
}

export async function getRoute(fromLng, fromLat, toLng, toLat, profile = 'driving') {
  try {
    return await apiRequest(`/api/geo/route?fromLng=${fromLng}&fromLat=${fromLat}&toLng=${toLng}&toLat=${toLat}&profile=${profile}`);
  } catch (error) {
    console.error('Error getting route:', error);
    return null;
  }
}

// Artist
export async function searchArtist(name) {
  try {
    return await apiRequest(`/api/artist/search?name=${encodeURIComponent(name)}`);
  } catch (error) {
    console.error('Error searching artist:', error);
    return null;
  }
}

export async function getArtistLyrics(artist, track) {
  try {
    return await apiRequest(`/api/artist/lyrics/search?artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(track)}`);
  } catch (error) {
    console.error('Error getting lyrics:', error);
    return null;
  }
}

// Auth UI
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
      window.location.href = '/auth/logout';
    });
  }
  
  getCurrentUser().then(user => {
    if (user && loginBtn && profileDiv) {
      loginBtn.style.display = 'none';
      profileDiv.style.display = 'flex';
      if (profileImg && user.images && user.images[0]) {
        profileImg.src = user.images[0].url;
      }
      if (profileName) {
        profileName.textContent = user.display_name || user.id;
      }
    }
  });
}
