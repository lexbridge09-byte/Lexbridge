import { cache } from 'react';
import { getEnabledFeatures } from '@lexbridge/shared';
import { loadPublicApi } from '@/lib/serverApi';

/*
  Server-side runtime features. Flags live in the API's database (owner-controlled kill switches),
  so every server render asks the API once per request. If the API is unreachable the code defaults
  keep the site standing.
*/
export const getServerFeatures = cache(async () => {
  const { status, data } = await loadPublicApi('/features');
  if (status === 200 && data?.features) {
    // Fill any keys the API doesn't know yet with the build defaults
    return { ...getEnabledFeatures(), ...data.features };
  }
  return getEnabledFeatures();
});
