'use client';

import { createContext, useContext } from 'react';

/*
  Runtime feature switches fetched on the server each request and shared with every client
  component. The owner's kill-switch in the admin panel therefore hides features from the UI
  on the next navigation without a redeploy.
*/
const FeaturesContext = createContext(null);

export function FeaturesProvider({ features, children }) {
  return <FeaturesContext.Provider value={features}>{children}</FeaturesContext.Provider>;
}

export function useFeatures() {
  return useContext(FeaturesContext);
}

export function useIsFeatureEnabled(featureKey) {
  const features = useContext(FeaturesContext);
  return Boolean(features?.[featureKey]);
}
