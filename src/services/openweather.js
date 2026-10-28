import axios from 'axios';
import { getCache, setCache } from '../utils/cache.js';

const BASE_URL = 'https://api.openweathermap.org/data/2.5';

function getKey() {
  const key = process.env.OPENWEATHER_API_KEY;
  if (!key) return null;
  const trimmed = key.trim();
  if (!trimmed || /^(your_|tu_|change|example|placeholder|xxx)/i.test(trimmed)) return null;
  return trimmed;
}

export function isOpenWeatherConfigured() {
  return Boolean(getKey());
}

function emptyForecast(error) {
  return { list: [], city: null, source: 'openweather', error };
}

export async function getForecast(lat, lng) {
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return emptyForecast({ code: 'BAD_REQUEST', message: 'Las coordenadas del recinto no son válidas.' });
  }

  const cacheKey = `weather:forecast:${latitude},${longitude}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const key = getKey();
  if (!key) {
    return emptyForecast({
      code: 'MISSING_KEY',
      message: 'OpenWeatherMap no está configurado. Añade OPENWEATHER_API_KEY para ver el pronóstico.'
    });
  }

  try {
    const response = await axios.get(`${BASE_URL}/forecast`, {
      params: {
        lat: latitude,
        lon: longitude,
        appid: key,
        units: 'metric',
        lang: 'es'
      },
      timeout: 10000
    });

    const result = {
      ...response.data,
      source: 'openweather',
      error: null
    };
    setCache(cacheKey, result, 600);
    return result;
  } catch (error) {
    const status = error.response?.status;
    return emptyForecast({
      code: status === 401 || status === 403 ? 'INVALID_KEY' : 'UPSTREAM_ERROR',
      status: status || null,
      message: status === 401 || status === 403
        ? 'OpenWeatherMap rechazó la API key configurada.'
        : 'No se pudo cargar el pronóstico desde OpenWeatherMap.'
    });
  }
}

export function getWeatherAdvice(weather) {
  if (!weather) {
    return { type: 'unknown', message: 'Sin datos suficientes para generar recomendaciones.', checklist: [] };
  }

  const temp = Number(weather.main?.temp);
  const pop = Number(weather.pop) || 0;
  const description = (weather.weather?.[0]?.description || '').toLowerCase();

  if (pop > 0.3 || description.includes('lluvia') || description.includes('tormenta')) {
    return {
      type: 'rain',
      message: 'Lluvia prevista: lleva impermeable y protege tus dispositivos.',
      checklist: ['Impermeable o chubasquero', 'Calzado impermeable', 'Bolsa para ropa húmeda']
    };
  }

  if (Number.isFinite(temp) && temp < 12) {
    return {
      type: 'cold',
      message: 'Frío previsto: lleva una capa de abrigo.',
      checklist: ['Abrigo o cortavientos', 'Bufanda', 'Guantes']
    };
  }

  if (Number.isFinite(temp) && temp > 28) {
    return {
      type: 'hot',
      message: 'Calor previsto: hidrátate y protege tu piel.',
      checklist: ['Protector solar SPF50', 'Gorra o sombrero', 'Botella reutilizable', 'Ropa ligera']
    };
  }

  if (description.includes('despejado') || description.includes('soleado')) {
    return {
      type: 'sunny',
      message: 'Día soleado: ideal para un festival al aire libre.',
      checklist: ['Protector solar', 'Gafas de sol', 'Gorra']
    };
  }

  return {
    type: 'mild',
    message: 'Clima agradable: lleva ropa cómoda y una capa ligera para la noche.',
    checklist: ['Ropa cómoda', 'Calzado deportivo', 'Chaqueta ligera para la noche']
  };
}
