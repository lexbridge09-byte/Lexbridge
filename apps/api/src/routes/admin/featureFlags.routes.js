import { Router } from 'express';
import { z } from 'zod';
import { FEATURE_FLAGS } from '@lexbridge/shared';
import { requireOwner } from '../../middleware/index.js';
import { getFlagDetails, setFlagEnabled } from '../../services/index.js';
import { createHttpError } from '../../utils.js';

const toggleSchema = z.object({
  enabled: z.boolean(),
});

export const adminFeatureFlagsRouter = Router();

// Both routes are owner-only: the kill-switch is the one thing a manager must not touch
adminFeatureFlagsRouter.use(requireOwner);

adminFeatureFlagsRouter.get('/', async (req, res) => {
  res.json({ flags: await getFlagDetails() });
});

adminFeatureFlagsRouter.patch('/:key', async (req, res) => {
  if (!Object.hasOwn(FEATURE_FLAGS, req.params.key)) {
    throw createHttpError(404, 'Unknown feature');
  }
  const { enabled } = toggleSchema.parse(req.body ?? {});
  await setFlagEnabled(req.params.key, enabled, req.user.id);
  res.json({ flags: await getFlagDetails() });
});
