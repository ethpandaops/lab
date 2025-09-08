/**
 * Feature flags for controlling API data sources
 * These allow gradual migration from static JSON to REST API
 */
export const FEATURE_FLAGS = {
  useRestApiForXatu: true, // Toggle xatu data source to use REST API
  useRestApiForNetworks: false, // Toggle networks list to use REST API
  useRestApiForContributors: false, // Toggle contributor data to use REST API
};

export function isFeatureEnabled(flag: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS[flag];
}
