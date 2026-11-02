import { buttonClassName } from '@/components/Elements/Button';
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
import { Card } from '@/components/Layout/Card';
import { ScrollArea } from '@/components/Layout/ScrollArea';
import type { LiveProbeEventsProps } from './LiveProbeEvents.types';

/** Generate a unique key for a probe */
function getProbeKey(probe: IntCustodyProbeOrderBySlot): string {
  return `${probe.probe_date_time}-${probe.peer_id_unique_key}-${probe.slot}-${probe.column_indices?.join(',')}`;
}

/**
 * Live probe events component showing the latest probes of the current view's slots
 */
export function LiveProbeEvents({
  range,
  scopeLabel,
  maxEvents = 30,
  pollInterval = 60000,
}: LiveProbeEventsProps): JSX.Element | null {
  const { currentNetwork } = useNetwork();
  const { fuluActivation } = useFuluActivation();
  const [selectedProbe, setSelectedProbe] = useState<IntCustodyProbeOrderBySlot | null>(null);

  // Track known probe keys to detect new items
  const knownProbeKeysRef = useRef<Set<string>>(new Set());
  const [newProbeKeys, setNewProbeKeys] = useState<Set<string>>(new Set());

  // Fetch probe data with polling
  // Use placeholderData to keep showing previous data during refetches (prevents flickering)
  const { data, isLoading, error, isFetched } = useQuery({
    ...intCustodyProbeOrderBySlotServiceListOptions({
      query: {
        // Starts no earlier than Fulu (PeerDAS only exists after it). Bounded by time, not slot_gte: the API drops
        // the slot_start_date_time filters when a slot range filter is present.
        slot_start_date_time_gte: Math.max(range.timeStart, fuluActivation?.dateTime ?? 0),
        slot_start_date_time_lt: range.timeEnd,
        ...(range.slot !== undefined && { slot_eq: range.slot }),
        page_size: maxEvents,
        order_by: 'probe_date_time desc',
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

  if (error) {
    return null; // Silently fail - this is supplementary data
  }

  return (
    <>
      <Card
        title={`Latest ${maxEvents} Probes`}
        subtitle={scopeLabel}
        className="h-[32rem] *:data-[slot=card-body]:p-0"
        actions={
          <Link
            to="/ethereum/data-availability/probes"
            search={{ timeStart: range.timeStart, timeEnd: range.timeEnd, slot: range.slot }}
            className={buttonClassName({ variant: 'secondary', size: 'sm' })}
          >
            <MagnifyingGlassIcon className="size-3.5" />
            View All
          </Link>
        }
      >
        {/* Events list - scrollable (header is ~70px, so calc remaining height) */}
        <ScrollArea className="h-[calc(32rem-70px)]">
          <div className="px-2 py-2">
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
        </ScrollArea>
      </Card>

      {/* Probe Detail Dialog - using shared component */}
      <ProbeDetailDialog
        probe={selectedProbe as IntCustodyProbe | null}
        isOpen={selectedProbe !== null}
        onClose={handleCloseDialog}
      />
    </>
  );
}
