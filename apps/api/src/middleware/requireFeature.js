import { FEATURE_FLAG_KEYS } from '@lexbridge/shared';
import { isRuntimeFeatureEnabled } from '../services/index.js';

/*
  Responds 404 while a feature is switched off, so disabled features look like they don't exist.
  The switch is read from the database (cached briefly), so the owner's kill-switch takes effect
  without a redeploy.
*/
export function requireFeature(featureKey) {
  // Fail at startup on a typo rather than on the first request
  if (!FEATURE_FLAG_KEYS.includes(featureKey)) {
    throw new Error(`Unknown feature flag: ${featureKey}`);
  }
  return async (req, res, next) => {
    try {
      if (await isRuntimeFeatureEnabled(featureKey)) return next();
    } catch (err) {
      return next(err);
    }
    res.status(404).json({ error: 'This feature is not available.' });
  };
}
