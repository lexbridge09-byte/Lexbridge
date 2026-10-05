import { notFound } from 'next/navigation';
import { getServerFeatures } from './runtimeFlags.js';

// Call at the top of a page or layout: a switched-off feature renders the 404 page.
// Reads the runtime switchboard, so the owner's kill-switch applies on the next render.
export async function requireFeaturePage(featureKey) {
  const features = await getServerFeatures();
  if (!features[featureKey]) notFound();
}
