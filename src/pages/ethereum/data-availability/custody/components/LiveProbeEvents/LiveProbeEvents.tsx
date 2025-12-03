import { type JSX, useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  CheckCircleIcon,
  XCircleIcon,
  QuestionMarkCircleIcon,
  SignalIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { Link } from '@tanstack/react-router';
import clsx from 'clsx';
import { intCustodyProbeOrderBySlotServiceListOptions } from '@/api/@tanstack/react-query.gen';
import type { IntCustodyProbeOrderBySlot, IntCustodyProbe } from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import { Timestamp } from '@/components/DataDisplay/Timestamp';
import { getCountryFlag } from '@/utils/country';
import { formatSlot } from '@/utils';
import { ProbeDetailDialog } from '@/pages/ethereum/data-availability/probes/components/ProbeDetailDialog';
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

/**
 * Get result icon based on probe result
 */
function ResultIcon({ result }: { result?: string }): JSX.Element {
  if (result === 'success') {
    return <CheckCircleIcon className="size-4 text-green-500" />;
  }
  if (result === 'failure') {
    return <XCircleIcon className="size-4 text-red-500" />;
  }
  return <QuestionMarkCircleIcon className="size-4 text-yellow-500" />;
}

/**
 * Probe event row - client logo prominent with two-line details
 */
function ProbeEventRow({
  probe,
  onClick,
  isNew,
}: {
  probe: IntCustodyProbeOrderBySlot;
  onClick: () => void;
  isNew?: boolean;
}): JSX.Element {
  const slot = probe.slot;
  const columnsCount = probe.column_indices?.length ?? 0;

  // Peer details
  const peerClient = probe.meta_peer_implementation || 'Unknown';
  const peerCountry = probe.meta_peer_geo_country || 'Unknown';
  const peerFlag = getCountryFlag(probe.meta_peer_geo_country_code);

  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'group flex w-full items-start gap-2 rounded-xs px-2 py-1.5 text-left transition-all hover:bg-muted/50',
        isNew && 'animate-highlight-new'
      )}
    >
      {/* Left: Client logo (spans both rows) */}
      <ClientLogo client={peerClient} size={28} />

      {/* Right: Two rows of details */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {/* Row 1: Client name, country, result */}
        <div className="flex w-full items-center gap-1.5 text-xs">
          <span className="font-medium text-foreground">{peerClient}</span>
          <span className="text-muted">·</span>
          {peerFlag && <span>{peerFlag}</span>}
          <span className="text-muted">{peerCountry}</span>
          <div className="flex-1" />
          <ResultIcon result={probe.result} />
        </div>

        {/* Row 2: Slot, columns, time */}
        <div className="flex w-full items-center gap-1.5 text-[10px] text-muted">
          <span>Slot</span>
          <span className="font-mono">{slot !== undefined ? formatSlot(slot) : '?'}</span>
          <span>·</span>
          <span>{columnsCount} cols</span>
          <div className="flex-1" />
          <Timestamp
            timestamp={probe.probe_date_time ?? 0}
            format="relative"
            className="!p-0 text-[10px] !text-muted"
            disableModal
          />
        </div>
      </div>
    </button>
  );
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
      },
    }),
    enabled: !!currentNetwork,
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

  // Get context label for header
  const contextLabel = useMemo(() => {
    switch (context.type) {
      case 'window':
        return 'last 24h';
      case 'day':
        return context.date;
      case 'hour':
        return 'this hour';
      case 'epoch':
        return `epoch ${context.epoch}`;
      case 'slot':
        return `slot ${context.slot}`;
    }
  }, [context]);

  if (error) {
    return null; // Silently fail - this is supplementary data
  }

  return (
    <>
      <div className="flex max-h-[32rem] flex-col rounded-xs border border-border/50 bg-surface/50">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border/50 px-3 py-2">
          <div className="flex items-center gap-2">
            <SignalIcon className="size-4 text-accent" />
            <span className="text-xs font-medium text-foreground">Live Probes</span>
            <span className="text-[10px] text-muted">({contextLabel})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-[10px] text-muted">
              <span className="size-1.5 animate-pulse rounded-full bg-green-500" />
              <span>every 60s</span>
            </div>
            {probesLinkParams && (
              <Link
                to="/ethereum/data-availability/probes"
                search={probesLinkParams}
                className="inline-flex items-center gap-1 rounded-xs border border-accent/50 bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent transition-colors hover:bg-accent/20"
              >
                <MagnifyingGlassIcon className="size-3" />
                View All
              </Link>
            )}
          </div>
        </div>

        {/* Events list - scrollable */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {isLoading && !isFetched ? (
            // Loading skeleton - only on initial load, not refetches
            <div className="space-y-1 p-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2 px-2 py-1">
                  <div className="size-4 animate-pulse rounded-full bg-muted/50" />
                  <div className="h-3 w-16 animate-pulse rounded-xs bg-muted/50" />
                  <div className="h-3 w-8 animate-pulse rounded-xs bg-muted/50" />
                  <div className="flex-1" />
                  <div className="h-3 w-10 animate-pulse rounded-xs bg-muted/50" />
                </div>
              ))}
            </div>
          ) : probes.length === 0 ? (
            // Empty state
            <div className="px-3 py-4 text-center text-xs text-muted">No probe events found for {contextLabel}</div>
          ) : (
            // Event rows
            <div className="p-1">
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
