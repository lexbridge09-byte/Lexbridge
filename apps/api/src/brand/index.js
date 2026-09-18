export { BRAND } from './brandConfig.js';
// Feature flags live in @lexbridge/shared so the website and the API read the same switchboard
export { FEATURE_FLAGS, FEATURE_FLAG_KEYS, isFeatureEnabled, getEnabledFeatures } from '@lexbridge/shared';
export { EMAIL_COPY } from './emailCopy.js';
