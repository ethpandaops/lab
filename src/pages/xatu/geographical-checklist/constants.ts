/**
 * Configuration constants for the Geographical Checklist experiment
 */

/**
 * Number of top locations (countries/cities) to show in insights
 */
export const TOP_LOCATIONS_LIMIT = 10;

/**
 * Map camera distance constraints
 */
export const MAP_MIN_DISTANCE = 60;
export const MAP_MAX_DISTANCE = 120;

/**
 * Default filter values
 */
export const DEFAULT_FILTERS = {
  search: '',
  continent: 'all' as const,
  country: 'all',
  clientImplementation: 'all',
};
