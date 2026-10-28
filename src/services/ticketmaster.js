import axios from 'axios';
import { getCache, setCache } from '../utils/cache.js';

const BASE_URL = 'https://app.ticketmaster.com/discovery/v2';

function getKey() {
  const key = process.env.TICKETMASTER_API_KEY;
  if (!key) return null;
  return key.trim();
}

export async function searchEvents(params = {}) {
  const cacheKey = `ticketmaster:${JSON.stringify(params)}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;
  
  const TICKETMASTER_API_KEY = getKey();
  if (!TICKETMASTER_API_KEY) {
    console.warn('Ticketmaster: key faltante -> fallback demo');
    return getDemoEvents(params);
  }
  
  try {
    const queryParams = {
      apikey: TICKETMASTER_API_KEY,
      classificationName: 'music',
      size: params.size || 20,
      page: params.page || 0,
      sort: params.sort || 'date,asc',
      ...params
    };
    
    const response = await axios.get(`${BASE_URL}/events.json`, {
      params: queryParams,
      timeout: 10000
    });
    
    if (!response.data._embedded || !response.data._embedded.events || response.data._embedded.events.length === 0) {
      console.log('Ticketmaster: 0 resultados -> estado vacío (sin demo)');
      return {
        events: [],
        page: response.data.page || { totalElements: 0, number: 0 },
        isDemo: false
      };
    }
    
    const events = response.data._embedded.events.map(normalizeEvent);
    const result = {
      events,
      page: response.data.page,
      totalElements: response.data.page.totalElements,
      isDemo: false
    };
    
    setCache(cacheKey, result, 300);
    console.log(`Ticketmaster: ${events.length} eventos reales`);
    return result;
  } catch (error) {
    console.error('Ticketmaster fallback:', error.response?.status || error.code || error.message);
    if (error.response?.status === 401) console.error('Ticketmaster: 401 key inválida -> fallback demo');
    else if (error.code === 'ECONNABORTED') console.error('Ticketmaster: timeout -> fallback demo');
    else console.error('Ticketmaster: error -> fallback demo');
    return getDemoEvents(params);
  }
}

function normalizeEvent(event) {
  const venue = event._embedded?.venues?.[0];
  const attractions = event._embedded?.attractions || [];
  
  // Get best image (16:9)
  let imageUrl = '';
  if (event.images && event.images.length > 0) {
    const image16x9 = event.images.find(img => img.ratio === '16_9') || event.images[0];
    imageUrl = image16x9.url;
  }
  
  return {
    id: event.id,
    name: event.name,
    date: event.dates?.start?.localDate,
    time: event.dates?.start?.localTime,
    datetime: event.dates?.start?.dateTime,
    image: imageUrl,
    venue: venue?.name || 'Venue TBA',
    address: venue?.address?.line1 || '',
    city: venue?.city?.name || '',
    country: venue?.country?.name || '',
    lat: venue?.location?.latitude ? parseFloat(venue.location.latitude) : null,
    lng: venue?.location?.longitude ? parseFloat(venue.location.longitude) : null,
    priceMin: event.priceRanges?.[0]?.min || null,
    priceMax: event.priceRanges?.[0]?.max || null,
    currency: event.priceRanges?.[0]?.currency || 'EUR',
    url: event.url,
    genres: event.classifications?.[0]?.genre ? [event.classifications[0].genre.name] : [],
    subgenres: event.classifications?.[0]?.subGenre ? [event.classifications[0].subGenre.name] : [],
    artists: attractions.map(a => ({
      id: a.id,
      name: a.name,
      image: a.images?.[0]?.url
    })),
    isDemo: false
  };
}

function getDemoEvents(params = {}) {
  const demoEvents = [
    {
      id: 'demo-1',
      name: 'Primavera Sound 2025',
      date: '2025-06-05',
      time: '14:00',
      datetime: '2025-06-05T14:00:00Z',
      image: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800',
      venue: 'Parc del Fòrum',
      address: 'Rambla Prim, 2-4',
      city: 'Barcelona',
      country: 'España',
      lat: 41.4128,
      lng: 2.2208,
      priceMin: 125,
      priceMax: 165,
      currency: 'EUR',
      url: 'https://www.primaverasound.com/',
      genres: ['rock', 'pop', 'electronic'],
      subgenres: ['indie rock', 'dance electronic'],
      artists: [
        { id: 'demo-a1', name: 'Rosalía' },
        { id: 'demo-a2', name: 'Fred Again..' },
        { id: 'demo-a3', name: 'Justice' }
      ],
      isDemo: true
    },
    {
      id: 'demo-2',
      name: 'Sónar Barcelona 2025',
      date: '2025-06-12',
      time: '16:00',
      datetime: '2025-06-12T16:00:00Z',
      image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800',
      venue: 'Fira Montjuïc',
      address: 'Av. Reina Maria Cristina, s/n',
      city: 'Barcelona',
      country: 'España',
      lat: 41.3708,
      lng: 2.1498,
      priceMin: 85,
      priceMax: 120,
      currency: 'EUR',
      url: 'https://sonar.es/',
      genres: ['electronic', 'techno'],
      subgenres: ['techno', 'house'],
      artists: [
        { id: 'demo-a4', name: 'Bicep' },
        { id: 'demo-a5', name: 'Peggy Gou' },
        { id: 'demo-a6', name: 'Four Tet' }
      ],
      isDemo: true
    },
    {
      id: 'demo-3',
      name: 'Mad Cool Festival 2025',
      date: '2025-07-09',
      time: '15:00',
      datetime: '2025-07-09T15:00:00Z',
      image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800',
      venue: 'Espacio Mad Cool',
      address: 'Valdebebas',
      city: 'Madrid',
      country: 'España',
      lat: 40.4730,
      lng: -3.6158,
      priceMin: 95,
      priceMax: 135,
      currency: 'EUR',
      url: 'https://madcoolfestival.es/',
      genres: ['rock', 'pop'],
      subgenres: ['alternative rock', 'pop'],
      artists: [
        { id: 'demo-a7', name: 'Dua Lipa' },
        { id: 'demo-a8', name: 'The Killers' },
        { id: 'demo-a9', name: 'Arctic Monkeys' }
      ],
      isDemo: true
    },
    {
      id: 'demo-4',
      name: 'Lollapalooza Argentina 2025',
      date: '2025-03-21',
      time: '13:00',
      datetime: '2025-03-21T13:00:00Z',
      image: 'https://images.unsplash.com/photo-1505236858219-8359eb29e329?w=800',
      venue: 'Hipódromo de San Isidro',
      address: 'Av. Márquez 504',
      city: 'Buenos Aires',
      country: 'Argentina',
      lat: -34.4719,
      lng: -58.5078,
      priceMin: 15000,
      priceMax: 25000,
      currency: 'ARS',
      url: 'https://www.lollapaloozaar.com/',
      genres: ['rock', 'pop', 'electronic'],
      subgenres: ['alternative', 'pop'],
      artists: [
        { id: 'demo-a10', name: 'Billie Eilish' },
        { id: 'demo-a11', name: 'The Strokes' },
        { id: 'demo-a12', name: 'ASAP Rocky' }
      ],
      isDemo: true
    }
  ];
  
  // Filter by city if provided
  let filtered = demoEvents;
  if (params.city) {
    filtered = demoEvents.filter(e => 
      e.city.toLowerCase().includes(params.city.toLowerCase())
    );
    if (filtered.length === 0) filtered = demoEvents;
  }
  
  return {
    events: filtered,
    page: { totalElements: filtered.length, number: 0 },
    isDemo: true
  };
}
