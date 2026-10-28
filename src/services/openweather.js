import axios from 'axios';
import dotenv from 'dotenv';
import { getCache, setCache } from '../utils/cache.js';

dotenv.config();

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

export async function getForecast(lat, lng) {
  const cacheKey = `weather:forecast:${lat},${lng}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;
  
  if (!OPENWEATHER_API_KEY) {
    console.warn('OpenWeather API key not configured, using demo weather');
    return getDemoWeather();
  }
  
  try {
    const response = await axios.get(`${BASE_URL}/forecast`, {
      params: {
        lat,
        lon: lng,
        appid: OPENWEATHER_API_KEY,
        units: 'metric',
        lang: 'es'
      },
      timeout: 10000
    });
    
    setCache(cacheKey, response.data, 600);
    return response.data;
  } catch (error) {
    console.error('Error fetching weather:', error.message);
    return getDemoWeather();
  }
}

export async function getCurrentWeather(lat, lng) {
  const cacheKey = `weather:current:${lat},${lng}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;
  
  if (!OPENWEATHER_API_KEY) {
    return getDemoWeather().list[0];
  }
  
  try {
    const response = await axios.get(`${BASE_URL}/weather`, {
      params: {
        lat,
        lon: lng,
        appid: OPENWEATHER_API_KEY,
        units: 'metric',
        lang: 'es'
      },
      timeout: 10000
    });
    
    setCache(cacheKey, response.data, 600);
    return response.data;
  } catch (error) {
    console.error('Error fetching current weather:', error.message);
    return getDemoWeather().list[0];
  }
}

function getDemoWeather() {
  const now = Date.now();
  const list = [];
  
  for (let i = 0; i < 40; i++) {
    const dt = Math.floor((now + i * 3 * 3600 * 1000) / 1000);
    list.push({
      dt,
      main: {
        temp: 20 + Math.sin(i / 8) * 5,
        feels_like: 19 + Math.sin(i / 8) * 5,
        temp_min: 15,
        temp_max: 25,
        humidity: 65 + Math.random() * 10
      },
      weather: [{
        id: i % 3 === 0 ? 800 : 801,
        main: i % 3 === 0 ? 'Clear' : 'Clouds',
        description: i % 3 === 0 ? 'cielo despejado' : 'parcialmente nublado',
        icon: i % 3 === 0 ? '01d' : '02d'
      }],
      wind: {
        speed: 3 + Math.random() * 5
      },
      pop: i % 4 === 0 ? 0.3 : 0
    });
  }
  
  return {
    list,
    city: {
      name: 'Barcelona',
      coord: { lat: 41.3851, lon: 2.1734 }
    }
  };
}

export function getWeatherAdvice(weather) {
  const temp = weather.main?.temp || 20;
  const pop = weather.pop || 0;
  const description = weather.weather?.[0]?.description || '';
  
  if (pop > 0.3 || description.includes('lluvia')) {
    return {
      type: 'rain',
      message: 'Lluvia prevista: llevar impermeable',
      checklist: ['Impermeable/Chubasquero', 'Botas impermeables', 'Bolsa para ropa húmeda']
    };
  }
  
  if (temp < 12) {
    return {
      type: 'cold',
      message: 'Frío: lleva abrigo',
      checklist: ['Abrigo/Cortavientos', 'Bufanda', 'Guantes']
    };
  }
  
  if (temp > 28) {
    return {
      type: 'hot',
      message: 'Calor: hidrátate y usa protector solar',
      checklist: ['Protector solar SPF50', 'Gorra/Sombrero', 'Botella reutilizable', 'Ropa ligera']
    };
  }
  
  if (description.includes('despejado') || description.includes('soleado')) {
    return {
      type: 'sunny',
      message: 'Día soleado: ideal para festival al aire libre',
      checklist: ['Protector solar', 'Gafas de sol', 'Gorra']
    };
  }
  
  return {
    type: 'mild',
    message: 'Clima agradable para festival',
    checklist: ['Ropa cómoda', 'Calzado deportivo', 'Chaqueta ligera para la noche']
  };
}
