import { type JSX, useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { SignalIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { Link } from '@tanstack/react-router';
import { intCustodyProbeOrderBySlotServiceListOptions } from '@/api/@tanstack/react-query.gen';
import type { IntCustodyProbeOrderBySlot, IntCustodyProbe } from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { ProbeEventRow } from '@/pages/ethereum/data-availability/components/ProbeEventRow';
import { ProbeDetailDialog } from '@/pages/ethereum/data-availability/probes/components/ProbeDetailDialog';
import { useFuluActivation } from '@/pages/ethereum/data-availability/custody/hooks/useFuluActivation';
import type { LiveProbeEventsProps, ProbeFilterContext } from './LiveProbeEvents.types';

/** Number of seconds in a day */
const SECONDS_PER_DAY = 86400;

/** Number of seconds in an hour */
const SECONDS_PER_HOUR = 3600;

/** Number of slots per epoch */
const SLOTS_PER_EPOCH = 32;

/** Buffer in seconds to add around time ranges (2 minutes) */
const TIME_BUFFER = 120;

/** Round to nearest minute to stabilize query params and prevent flickering */
const ROUND_INTERVAL = 60;

/**
 * Build API query parameters based on the current drill-down context
 * Uses slot_start_date_time for time filtering (matches _by_slot table primary key)
 */
function buildQueryParams(context: ProbeFilterContext): {
  slot_start_date_time_gte?: number;
  slot_start_date_time_lte?: number;
  slot_in_values?: string;
  slot_eq?: number;
} {
  // Round to nearest minute to prevent query key changes on every render
  const now = Math.floor(Date.now() / 1000 / ROUND_INTERVAL) * ROUND_INTERVAL;

  switch (context.type) {
    case 'window':
      // Last 24 hours for window view (with buffer)
      return {
        slot_start_date_time_gte: now - SECONDS_PER_DAY - TIME_BUFFER,
        slot_start_date_time_lte: now + TIME_BUFFER,
      };
    case 'day': {
      // Specific day (with buffer)
      const dayStart = Math.floor(new Date(context.date).getTime() / 1000);
      return {
        slot_start_date_time_gte: dayStart - TIME_BUFFER,
        slot_start_date_time_lte: dayStart + SECONDS_PER_DAY + TIME_BUFFER,
      };
    }
    case 'hour':
      // Specific hour (with buffer)
      return {
        slot_start_date_time_gte: context.hourStartDateTime - TIME_BUFFER,
        slot_start_date_time_lte: context.hourStartDateTime + SECONDS_PER_HOUR + TIME_BUFFER,
      };
    case 'epoch':
      // Specific epoch - use hour time range with buffer, plus slot filter
      return {
        slot_start_date_time_gte: context.hourStartDateTime - TIME_BUFFER,
        slot_start_date_time_lte: context.hourStartDateTime + SECONDS_PER_HOUR + TIME_BUFFER,
        slot_in_values: Array.from({ length: SLOTS_PER_EPOCH }, (_, i) => context.epoch * SLOTS_PER_EPOCH + i).join(
          ','
        ),
      };
    case 'slot':
      // Specific slot - use hour time range with buffer, plus slot filter
      return {
        slot_start_date_time_gte: context.hourStartDateTime - TIME_BUFFER,
        slot_start_date_time_lte: context.hourStartDateTime + SECONDS_PER_HOUR + TIME_BUFFER,
        slot_eq: context.slot,
      };
  }
}

/** Generate a unique key for a probe */
function getProbeKey(probe: IntCustodyProbeOrderBySlot): string {
  return `${probe.probe_date_time}-${probe.peer_id_unique_key}-${probe.slot}-${probe.column_indices?.join(',')}`;
}

/**
 * Live probe events component showing recent probes relevant to the current view
 */
export function LiveProbeEvents({
  context,
  maxEvents = 30,
  pollInterval = 60000,
  probesLinkParams,
}: LiveProbeEventsProps): JSX.Element | null {
  const { currentNetwork } = useNetwork();
  const { fuluActivation } = useFuluActivation();
  const [selectedProbe, setSelectedProbe] = useState<IntCustodyProbeOrderBySlot | null>(null);

  // Track known probe keys to detect new items
  const knownProbeKeysRef = useRef<Set<string>>(new Set());
  const [newProbeKeys, setNewProbeKeys] = useState<Set<string>>(new Set());

  // Build query parameters based on context
  const queryParams = useMemo(() => buildQueryParams(context), [context]);

  // Fetch probe data with polling
  // Use placeholderData to keep showing previous data during refetches (prevents flickering)
  const { data, isLoading, error, isFetched } = useQuery({
    ...intCustodyProbeOrderBySlotServiceListOptions({
      query: {
        ...queryParams,
        page_size: maxEvents,
        order_by: 'probe_date_time desc',
        // Filter out pre-Fulu slots server-side (PeerDAS only exists after Fulu)
        ...(fuluActivation && { slot_gte: fuluActivation.slot }),
      },
    }),
    enabled: !!currentNetwork && !!fuluActivation,
    refetchInterval: pollInterval,
    placeholderData: keepPreviousData,
  });

  const probes = useMemo(() => data?.int_custody_probe_order_by_slot ?? [], [data]);

  // Detect new probes and update tracking
  useEffect(() => {
    if (!isFetched || probes.length === 0) return;

    const currentKeys = new Set(probes.map(getProbeKey));
    const newKeys = new Set<string>();

    // Find keys that weren't in our known set
    currentKeys.forEach(key => {
      if (!knownProbeKeysRef.current.has(key)) {
        newKeys.add(key);
      }
    });

    // Only trigger animation if we had previous data (not initial load)
    if (knownProbeKeysRef.current.size > 0 && newKeys.size > 0) {
      setNewProbeKeys(newKeys);
      // Clear the "new" state after animation completes
      const timer = setTimeout(() => setNewProbeKeys(new Set()), 1000);
      // Update known keys
      knownProbeKeysRef.current = currentKeys;
      return () => clearTimeout(timer);
    }

    // Update known keys
    knownProbeKeysRef.current = currentKeys;
  }, [probes, isFetched]);

  // Handle probe click
  const handleProbeClick = useCallback((probe: IntCustodyProbeOrderBySlot) => {
    setSelectedProbe(probe);
  }, []);

  // Handle dialog close
  const handleCloseDialog = useCallback(() => {
    setSelectedProbe(null);
  }, []);

  // Get context label for header subtitle
  const contextLabel = useMemo(() => {
    switch (context.type) {
      case 'window':
        return 'Last 24 hours';
      case 'day':
        return context.date;
      case 'hour':
        return 'Current hour';
      case 'epoch':
        return `Epoch ${context.epoch}`;
      case 'slot':
        return `Slot ${context.slot}`;
    }
  }, [context]);

  if (error) {
    return null; // Silently fail - this is supplementary data
  }

  return (
    <>
      <div className="bg-card text-card-foreground flex max-h-[32rem] flex-col overflow-hidden rounded-lg border border-border shadow-sm">
        {/* Header */}
        <div className="border-b border-border bg-muted/20 px-4 py-3">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-foreground">Recent Probes</h2>
              <p className="truncate text-sm text-muted">{contextLabel}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {probesLinkParams && (
                <Link
                  to="/ethereum/data-availability/probes"
                  search={probesLinkParams}
                  className="flex items-center gap-1.5 rounded-sm border border-accent/30 bg-accent/10 px-2.5 py-1.5 text-xs font-medium text-accent transition-all hover:border-accent/50 hover:bg-accent/20"
                >
                  <MagnifyingGlassIcon className="size-3.5" />
                  View All
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Events list - scrollable */}
        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {isLoading && !isFetched ? (
            // Loading skeleton - only on initial load, not refetches
            <div className="space-y-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2.5 px-2 py-1.5">
                  <div className="size-6 animate-pulse rounded-full bg-muted/30" />
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="h-3 w-20 animate-pulse rounded-sm bg-muted/30" />
                    <div className="h-2.5 w-28 animate-pulse rounded-sm bg-muted/30" />
                  </div>
                  <div className="size-4 animate-pulse rounded-full bg-muted/30" />
                </div>
              ))}
            </div>
          ) : probes.length === 0 ? (
            // Empty state
            <div className="py-8 text-center">
              <SignalIcon className="mx-auto mb-2 size-8 text-muted/50" />
              <p className="text-sm text-muted">No probes found</p>
              <p className="text-xs text-muted/70">{contextLabel}</p>
            </div>
          ) : (
            // Event rows
            <div>
              {probes.map(probe => {
                const key = getProbeKey(probe);
                return (
                  <ProbeEventRow
                    key={key}
                    probe={probe}
                    onClick={() => handleProbeClick(probe)}
                    isNew={newProbeKeys.has(key)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Probe Detail Dialog - using shared component */}
      <ProbeDetailDialog
        probe={selectedProbe as IntCustodyProbe | null}
        isOpen={selectedProbe !== null}
        onClose={handleCloseDialog}
      />
    </>
  );
}
