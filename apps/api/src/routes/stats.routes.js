import { Router } from 'express';
import { getPublicStats } from '../services/index.js';

export const statsRouter = Router();

statsRouter.get('/public', async (req, res) => {
  res.set('Cache-Control', 'public, max-age=60');
  res.json({ stats: await getPublicStats() });
});
