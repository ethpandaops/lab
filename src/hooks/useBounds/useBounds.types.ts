export interface TableBounds {
  min: number;
  max: number;
}

export type Bounds = Record<string, TableBounds>;

/**
 * Aggregated statistics across multiple tables.
 *
 * - `minOfMins`: Earliest point across all tables (min of all mins)
 * - `maxOfMaxes`: Latest point across all tables (max of all maxes)
 * - `maxOfMins`: Latest starting point (max of all mins) - useful for finding intersection
 * - `minOfMaxes`: Earliest ending point (min of all maxes) - useful for finding intersection
 *
 * @example
 * ```
 * // Table A: min=100, max=500
 * // Table B: min=200, max=400
 * // Table C: min=150, max=600
 *
 * aggregate = {
 *   minOfMins: 100,   // earliest start (Table A)
 *   maxOfMaxes: 600,  // latest end (Table C)
 *   maxOfMins: 200,   // latest start (Table B)
 *   minOfMaxes: 400,  // earliest end (Table B)
 * }
 *
 * // Intersection range (where all tables have data): [200, 400]
 * // Union range (all data across tables): [100, 600]
 * ```
 */
export interface AggregateBounds {
  minOfMins: number | undefined;
  maxOfMaxes: number | undefined;
  maxOfMins: number | undefined;
  minOfMaxes: number | undefined;
}

export interface TablesBoundsResult {
  tables: Record<string, TableBounds>;
  aggregate: AggregateBounds;
}
