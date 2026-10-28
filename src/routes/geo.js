import express from 'express';
import { getRoute, geocode, reverseGeocode } from '../services/osrm.js';

const router = express.Router();

router.get('/route', async (req, res) => {
  const { fromLng, fromLat, toLng, toLat, profile = 'driving' } = req.query;
  if (!fromLng || !fromLat || !toLng || !toLat) {
    return res.status(400).json({ route: null, error: { code: 'BAD_REQUEST', message: 'Faltan las coordenadas de origen o destino.' } });
  }

  const result = await getRoute(fromLng, fromLat, toLng, toLat, profile);
  res.json(result);
});

router.get('/geocode', async (req, res) => {
  const { address } = req.query;
  if (!address || !address.trim()) {
    return res.status(400).json({ result: null, error: { code: 'BAD_REQUEST', message: 'Escribe una dirección.' } });
  }

  const result = await geocode(address);
  if (!result) {
    return res.json({
      result: null,
      error: { code: 'NOT_FOUND', message: 'No se encontró esa dirección. Prueba con una más específica.' }
    });
  }
  res.json({ result, error: null });
});

router.get('/reverse', async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) {
    return res.status(400).json({ result: null, error: { code: 'BAD_REQUEST', message: 'Faltan lat y lng.' } });
  }

  const result = await reverseGeocode(lat, lng);
  if (!result) {
    return res.json({
      result: null,
      error: { code: 'NOT_FOUND', message: 'No se pudo identificar esa ubicación.' }
    });
  }
  res.json({ result, error: null });
});

export default router;
