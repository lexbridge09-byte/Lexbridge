import { notFound } from 'next/navigation';
import { isFeatureEnabled } from '@lexbridge/shared';

// Call at the top of a page or layout: a switched-off feature renders the 404 page
export function requireFeaturePage(featureKey) {
  if (!isFeatureEnabled(featureKey)) notFound();
}
