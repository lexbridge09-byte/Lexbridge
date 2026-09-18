import { isFeatureEnabled } from '../brand/index.js';

// Responds 404 while a feature is switched off, so disabled features look like they don't exist
export function requireFeature(featureKey) {
  // Fail at startup on a typo rather than on the first request
  isFeatureEnabled(featureKey);
  return (req, res, next) => {
    if (isFeatureEnabled(featureKey)) return next();
    res.status(404).json({ error: 'This feature is not available.' });
  };
}
