import { useState, useEffect, useRef, useCallback, type MutableRefObject } from 'react';
import { intCustodyProbeServiceList } from '@/api/sdk.gen';
import type { IntCustodyProbe } from '@/api/types.gen';
import type { FilterValues } from '../components/FilterPanel';
import { useBounds } from '@/hooks/useBounds';

const CONFIG = {
  QUERY_WINDOW_SECONDS: 60,
  MAX_DISPLAY: 50,
  PAGE_SIZE: 500,
  DRIP_INTERVAL: 100, // ms between each item appearing
} as const;

function getProbeId(probe: IntCustodyProbe): string {
  return `${probe.probe_date_time}:${probe.peer_id_unique_key}`;
}

/**
 * Extract timestamp from probe ID (format: "timestamp:peerId")
 * Returns undefined if parsing fails
 */
function getTimestampFromId(id: string): number | undefined {
  const colonIndex = id.indexOf(':');
  if (colonIndex === -1) return undefined;
  const timestamp = Number(id.slice(0, colonIndex));
  return Number.isNaN(timestamp) ? undefined : timestamp;
}

/**
 * Prune entries from seenIds that are older than the query window.
 * This prevents unbounded memory growth during long live sessions.
 */
function pruneOldSeenIds(seenIds: Set<string>, windowStart: number): void {
  for (const id of seenIds) {
    const timestamp = getTimestampFromId(id);
    if (timestamp !== undefined && timestamp < windowStart) {
      seenIds.delete(id);
    }
  }
}

interface UseLiveProbeStreamResult {
  displayedItems: IntCustodyProbe[];
  newItemIdsRef: MutableRefObject<Set<string>>;
  hitPageLimitRef: MutableRefObject<boolean>;
  error: Error | null;
}

export function useLiveProbeStream({
  enabled,
  filters,
  fuluSlot,
}: {
  enabled: boolean;
  filters: FilterValues;
  fuluSlot?: number;
}): UseLiveProbeStreamResult {
  const { data: allBounds } = useBounds();
  const bounds = allBounds?.['int_custody_probe'] ?? allBounds?.['int_custody_probe_order_by_slot'];

  const [displayedItems, setDisplayedItems] = useState<IntCustodyProbe[]>([]);
  const [error, setError] = useState<Error | null>(null);

  // Use refs for frequently-updated values to avoid re-renders
  const newItemIdsRef = useRef<Set<string>>(new Set());
  const queue = useRef<IntCustodyProbe[]>([]);
  const seenIds = useRef<Set<string>>(new Set());
  const dripTimer = useRef<NodeJS.Timeout | null>(null);
  const lastBoundsMax = useRef<number | null>(null);
  const hitPageLimitRef = useRef(false);

  const filtersRef = useRef(filters);
  const fuluSlotRef = useRef(fuluSlot);
  filtersRef.current = filters;
  fuluSlotRef.current = fuluSlot;

  // Drip one item from queue to display, then schedule next drip
  const drip = useCallback(() => {
    const item = queue.current.shift();
    if (!item) {
      dripTimer.current = null;
      return;
    }

    const id = getProbeId(item);
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

  // Fetch probes for a given bounds.max
  const fetchForBounds = useCallback(
    async (boundsMax: number) => {
      const windowEnd = boundsMax;
      const windowStart = windowEnd - CONFIG.QUERY_WINDOW_SECONDS;

      try {
        const { data, error: err } = await intCustodyProbeServiceList({
          query: {
            probe_date_time_gte: windowStart,
            probe_date_time_lte: windowEnd,
            page_size: CONFIG.PAGE_SIZE,
            order_by: 'probe_date_time desc',
            ...(fuluSlotRef.current && { slot_gte: fuluSlotRef.current }),
            ...(filtersRef.current.result && { result_eq: filtersRef.current.result }),
            ...(filtersRef.current.prober && { meta_client_implementation_eq: filtersRef.current.prober }),
            ...(filtersRef.current.peer && { meta_peer_implementation_eq: filtersRef.current.peer }),
            ...(filtersRef.current.peerId && { peer_id_unique_key_eq: Number(filtersRef.current.peerId) }),
            ...(filtersRef.current.nodeId && { node_id_eq: filtersRef.current.nodeId }),
            ...(filtersRef.current.proberCountry && { meta_client_geo_country_eq: filtersRef.current.proberCountry }),
            ...(filtersRef.current.peerCountry && { meta_peer_geo_country_eq: filtersRef.current.peerCountry }),
            ...(filtersRef.current.proberCity && { meta_client_geo_city_eq: filtersRef.current.proberCity }),
            ...(filtersRef.current.peerCity && { meta_peer_geo_city_eq: filtersRef.current.peerCity }),
            ...(filtersRef.current.proberVersion && { meta_client_version_eq: filtersRef.current.proberVersion }),
            ...(filtersRef.current.peerVersion && { meta_peer_version_eq: filtersRef.current.peerVersion }),
            ...(filtersRef.current.proberAsn && {
              meta_client_geo_autonomous_system_number_eq: filtersRef.current.proberAsn,
            }),
            ...(filtersRef.current.peerAsn && {
              meta_peer_geo_autonomous_system_number_eq: filtersRef.current.peerAsn,
            }),
            ...(filtersRef.current.slot && { slot_eq: filtersRef.current.slot }),
            ...(filtersRef.current.column && { column_indices_has: filtersRef.current.column }),
            ...(filtersRef.current.blobPosters?.length && {
              blob_submitters_has_any_values: filtersRef.current.blobPosters,
            }),
          },
        });

        if (err) {
          setError(prev => (prev?.message === String(err) ? prev : new Error(String(err))));
          return;
        }

        // Only update error state if it changed
        setError(prev => (prev === null ? prev : null));
        const probes = data?.int_custody_probe ?? [];
        hitPageLimitRef.current = probes.length >= CONFIG.PAGE_SIZE;

        // Filter new probes and add to queue
        const newProbes: IntCustodyProbe[] = [];
        for (const probe of probes) {
          const id = getProbeId(probe);
          if (!seenIds.current.has(id)) {
            seenIds.current.add(id);
            newProbes.push(probe);
          }
        }

        if (newProbes.length > 0) {
          // Add new probes to queue (reverse so oldest drips first, newest ends at top)
          queue.current.push(...newProbes.reverse());

          // Start dripping if not already running
          if (!dripTimer.current) {
            dripTimer.current = setTimeout(drip, CONFIG.DRIP_INTERVAL);
          }
        }

        // Prune old entries from seenIds to prevent unbounded memory growth
        pruneOldSeenIds(seenIds.current, windowStart);
      } catch (e) {
        setError(e instanceof Error ? e : new Error('Failed to fetch'));
      }
    },
    [drip]
  );

  // Fetch when bounds.max changes (replaces polling)
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
    const key = JSON.stringify(filters);
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
  }, [enabled, filters, bounds?.max, fetchForBounds]);

  return { displayedItems, newItemIdsRef, hitPageLimitRef, error };
}
