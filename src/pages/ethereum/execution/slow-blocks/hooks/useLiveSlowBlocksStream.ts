import { useState, useEffect, useRef, useCallback, type MutableRefObject } from 'react';
import { intEngineNewPayloadServiceList } from '@/api/sdk.gen';
import type { IntEngineNewPayload } from '@/api/types.gen';
import type { FilterValues } from '../IndexPage.types';
import { useBounds } from '@/hooks/useBounds';

const CONFIG = {
  QUERY_WINDOW_SECONDS: 60,
  MAX_DISPLAY: 50,
  PAGE_SIZE: 500,
  DRIP_INTERVAL: 100, // ms between each item appearing
} as const;

/**
 * Generate a unique ID for an observation
 */
function getObservationId(obs: IntEngineNewPayload): string {
  return `${obs.slot_start_date_time}:${obs.slot}:${obs.meta_client_name}`;
}

/**
 * Extract timestamp from observation ID
 */
function getTimestampFromId(id: string): number | undefined {
  const colonIndex = id.indexOf(':');
  if (colonIndex === -1) return undefined;
  const timestamp = Number(id.slice(0, colonIndex));
  return Number.isNaN(timestamp) ? undefined : timestamp;
}

/**
 * Prune entries from seenIds that are older than the query window
 */
function pruneOldSeenIds(seenIds: Set<string>, windowStart: number): void {
  for (const id of seenIds) {
    const timestamp = getTimestampFromId(id);
    if (timestamp !== undefined && timestamp < windowStart) {
      seenIds.delete(id);
    }
  }
}

interface UseLiveSlowBlocksStreamResult {
  displayedItems: IntEngineNewPayload[];
  newItemIdsRef: MutableRefObject<Set<string>>;
  hitPageLimitRef: MutableRefObject<boolean>;
  error: Error | null;
}

/**
 * Hook for live streaming slow block observations
 * Polls based on bounds changes and animates new items in
 */
export function useLiveSlowBlocksStream({
  enabled,
  filters,
  durationMin,
}: {
  enabled: boolean;
  filters: FilterValues;
  durationMin: number;
}): UseLiveSlowBlocksStreamResult {
  const { data: allBounds } = useBounds();
  const bounds = allBounds?.['int_engine_new_payload'];

  const [displayedItems, setDisplayedItems] = useState<IntEngineNewPayload[]>([]);
  const [error, setError] = useState<Error | null>(null);

  // Use refs for frequently-updated values to avoid re-renders
  const newItemIdsRef = useRef<Set<string>>(new Set());
  const queue = useRef<IntEngineNewPayload[]>([]);
  const seenIds = useRef<Set<string>>(new Set());
  const dripTimer = useRef<NodeJS.Timeout | null>(null);
  const lastBoundsMax = useRef<number | null>(null);
  const hitPageLimitRef = useRef(false);

  const filtersRef = useRef(filters);
  const durationMinRef = useRef(durationMin);
  filtersRef.current = filters;
  durationMinRef.current = durationMin;

  // Drip one item from queue to display, then schedule next drip
  const drip = useCallback(() => {
    const item = queue.current.shift();
    if (!item) {
      dripTimer.current = null;
      return;
    }

    const id = getObservationId(item);
    newItemIdsRef.current.add(id);
    setDisplayedItems(prev => [item, ...prev].slice(0, CONFIG.MAX_DISPLAY));

    // Remove highlight after animation
    setTimeout(() => newItemIdsRef.current.delete(id), 400);

    // Schedule next drip
    if (queue.current.length > 0) {
      dripTimer.current = setTimeout(drip, CONFIG.DRIP_INTERVAL);
    } else {
      dripTimer.current = null;
    }
  }, []);

  // Fetch observations for a given bounds.max
  const fetchForBounds = useCallback(
    async (boundsMax: number) => {
      const windowEnd = boundsMax;
      const windowStart = windowEnd - CONFIG.QUERY_WINDOW_SECONDS;

      try {
        const { data, error: err } = await intEngineNewPayloadServiceList({
          query: {
            slot_start_date_time_gte: windowStart,
            slot_start_date_time_lte: windowEnd,
            duration_ms_gte: durationMinRef.current,
            page_size: CONFIG.PAGE_SIZE,
            order_by: 'duration_ms desc',
            // Apply filters
            ...(filtersRef.current.durationMax && { duration_ms_lte: filtersRef.current.durationMax }),
            ...(filtersRef.current.status && { status_eq: filtersRef.current.status }),
            ...(filtersRef.current.elClient && { meta_execution_implementation_eq: filtersRef.current.elClient }),
            ...(filtersRef.current.clClient && { meta_client_implementation_eq: filtersRef.current.clClient }),
            ...(filtersRef.current.nodeName && { meta_client_name_eq: filtersRef.current.nodeName }),
            ...(filtersRef.current.blockStatus && { block_status_eq: filtersRef.current.blockStatus }),
            ...(filtersRef.current.slot && { slot_eq: filtersRef.current.slot }),
          },
        });

        if (err) {
          setError(prev => (prev?.message === String(err) ? prev : new Error(String(err))));
          return;
        }

        setError(prev => (prev === null ? prev : null));
        const observations = data?.int_engine_new_payload ?? [];
        hitPageLimitRef.current = observations.length >= CONFIG.PAGE_SIZE;

        // Filter new observations and add to queue
        const newObs: IntEngineNewPayload[] = [];
        for (const obs of observations) {
          const id = getObservationId(obs);
          if (!seenIds.current.has(id)) {
            seenIds.current.add(id);
            newObs.push(obs);
          }
        }

        if (newObs.length > 0) {
          // Add new observations to queue (reverse so oldest drips first)
          queue.current.push(...newObs.reverse());

          // Start dripping if not already running
          if (!dripTimer.current) {
            dripTimer.current = setTimeout(drip, CONFIG.DRIP_INTERVAL);
          }
        }

        // Prune old entries from seenIds
        pruneOldSeenIds(seenIds.current, windowStart);
      } catch (e) {
        setError(e instanceof Error ? e : new Error('Failed to fetch'));
      }
    },
    [drip]
  );

  // Fetch when bounds.max changes
  useEffect(() => {
    if (!enabled || !bounds?.max) return;

    // Only fetch if bounds.max has actually changed
    if (lastBoundsMax.current === bounds.max) return;
    lastBoundsMax.current = bounds.max;

    fetchForBounds(bounds.max);
  }, [enabled, bounds?.max, fetchForBounds]);

  // Reset everything when disabled
  useEffect(() => {
    if (enabled) return;

    // Stop drip timer
    if (dripTimer.current) {
      clearTimeout(dripTimer.current);
      dripTimer.current = null;
    }

    // Reset state
    setDisplayedItems([]);
    setError(null);

    // Reset refs
    queue.current = [];
    seenIds.current.clear();
    newItemIdsRef.current.clear();
    lastBoundsMax.current = null;
    hitPageLimitRef.current = false;
  }, [enabled]);

  // Full reset on filter change
  const prevFilters = useRef('');
  useEffect(() => {
    if (!enabled) return;
    const key = JSON.stringify({ ...filters, durationMin });
    if (prevFilters.current === key) return;

    // Skip on initial mount
    if (prevFilters.current !== '') {
      // Stop drip timer
      if (dripTimer.current) {
        clearTimeout(dripTimer.current);
        dripTimer.current = null;
      }

      // Clear all refs
      seenIds.current.clear();
      queue.current = [];
      newItemIdsRef.current.clear();
      lastBoundsMax.current = null;
      hitPageLimitRef.current = false;

      // Clear all state
      setDisplayedItems([]);
      setError(null);

      // Fetch immediately with current bounds if available
      if (bounds?.max) {
        lastBoundsMax.current = bounds.max;
        fetchForBounds(bounds.max);
      }
    }

    prevFilters.current = key;
  }, [enabled, filters, durationMin, bounds?.max, fetchForBounds]);

  return { displayedItems, newItemIdsRef, hitPageLimitRef, error };
}
