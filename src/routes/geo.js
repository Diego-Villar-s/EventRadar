import express from 'express';
import { getRoute, geocode, reverseGeocode } from '../services/osrm.js';

const router = express.Router();

router.get('/route', async (req, res) => {
  try {
    const { fromLng, fromLat, toLng, toLat, profile = 'driving' } = req.query;
    
    if (!fromLng || !fromLat || !toLng || !toLat) {
      return res.status(400).json({ error: 'Missing coordinates' });
    }
    
    const route = await getRoute(fromLng, fromLat, toLng, toLat, profile);
    res.json(route);
  } catch (error) {
    console.error('Error in route:', error);
    res.status(500).json({ error: 'Failed to get route' });
  }
});

router.get('/geocode', async (req, res) => {
  try {
    const { address } = req.query;
    if (!address) {
      return res.status(400).json({ error: 'address is required' });
    }
    
    const result = await geocode(address);
    res.json(result);
  } catch (error) {
    console.error('Error in geocode:', error);
    res.status(500).json({ error: 'Failed to geocode' });
  }
});

router.get('/reverse', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng are required' });
    }
    
    const result = await reverseGeocode(lat, lng);
    res.json(result);
  } catch (error) {
    console.error('Error in reverse geocode:', error);
    res.status(500).json({ error: 'Failed to reverse geocode' });
  }
});

export default router;
