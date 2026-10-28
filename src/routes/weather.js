import express from 'express';
import { getForecast, getWeatherAdvice } from '../services/openweather.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng are required' });
    }
    
    const forecast = await getForecast(lat, lng);
    
    // Get advice for current/next weather
    if (forecast.list && forecast.list.length > 0) {
      const advice = getWeatherAdvice(forecast.list[0]);
      forecast.advice = advice;
    }
    
    res.json(forecast);
  } catch (error) {
    console.error('Error in weather route:', error);
    res.status(500).json({ error: 'Failed to fetch weather' });
  }
});

export default router;
