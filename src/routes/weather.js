import express from 'express';
import { getForecast, getWeatherAdvice } from '../services/openweather.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const { lat, lng } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ list: [], error: { code: 'BAD_REQUEST', message: 'lat y lng son obligatorios.' } });
  }

  const forecast = await getForecast(lat, lng);

  if (forecast.error) {
    return res.json({ ...forecast, advice: null });
  }

  const advice = forecast.list?.length ? getWeatherAdvice(forecast.list[0]) : null;
  res.json({ ...forecast, advice });
});

export default router;
