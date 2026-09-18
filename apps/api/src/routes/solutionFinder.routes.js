import Anthropic from '@anthropic-ai/sdk';
import { Router } from 'express';
import { z } from 'zod';
import { SERVICE_CATALOG } from '@lexbridge/shared';
import { createRateLimiter } from '../middleware/index.js';
import { classifyLegalConcern } from '../services/index.js';

const classifyLimiter = createRateLimiter({
  name: 'solution-finder-classify',
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: 'Too many attempts. Please try again in a few minutes.',
});

const classifySchema = z.object({
  Description: z.string().trim().min(15, 'Please describe your concern in a little more detail').max(3000),
});

const UNAVAILABLE_MESSAGE = 'Our suggestion tool is unavailable right now. You can still send us your concern and our team will guide you.';

function findCatalogEntries(keys) {
  return [...new Set(keys)]
    .map((key) => SERVICE_CATALOG.find((service) => service.key === key))
    .filter(Boolean);
}

export const solutionFinderRouter = Router();

solutionFinderRouter.post('/classify', classifyLimiter, async (req, res) => {
  const { Description } = classifySchema.parse(req.body);

  let classification;
  try {
    classification = await classifyLegalConcern(Description);
  } catch (err) {
    const status = err instanceof Anthropic.APIError ? err.status : undefined;
    req.log.error({ status, error: err.message }, '[solution-finder] classification failed');
    return res.status(503).json({ error: UNAVAILABLE_MESSAGE });
  }

  if (!classification) {
    return res.json({ classification: null, services: [], message: UNAVAILABLE_MESSAGE });
  }

  res.json({
    classification,
    services: findCatalogEntries([classification.primaryCategory, ...classification.suggestedServices]),
  });
});
