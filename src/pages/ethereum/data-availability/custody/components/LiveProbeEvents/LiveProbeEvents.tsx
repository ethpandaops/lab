import { type JSX, useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircleIcon,
  XCircleIcon,
  QuestionMarkCircleIcon,
  SignalIcon,
  ClockIcon,
  ServerIcon,
  CpuChipIcon,
  ListBulletIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { Link } from '@tanstack/react-router';
import clsx from 'clsx';
import { intCustodyProbeServiceListOptions } from '@/api/@tanstack/react-query.gen';
import type { IntCustodyProbe } from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import { Badge } from '@/components/Elements/Badge';
import { Dialog } from '@/components/Overlays/Dialog';
import { Timestamp } from '@/components/DataDisplay/Timestamp';
import { getCountryFlag } from '@/utils/country';
import { formatSlot } from '@/utils';
import { ProbeFlow } from '@/pages/ethereum/data-availability/probes/components/ProbeFlow';
import type { LiveProbeEventsProps, ProbeFilterContext } from './LiveProbeEvents.types';

/** Number of seconds in a day */
const SECONDS_PER_DAY = 86400;

/** Number of seconds in an hour */
const SECONDS_PER_HOUR = 3600;

/** Number of slots per epoch */
const SLOTS_PER_EPOCH = 32;

/**
 * Build API query parameters based on the current drill-down context
 */
function buildQueryParams(context: ProbeFilterContext): {
  probe_date_time_gte?: number;
  probe_date_time_lte?: number;
  slots_has_any_values?: number[];
} {
  const now = Math.floor(Date.now() / 1000);

  switch (context.type) {
    case 'window':
      // Last 24 hours for window view
      return {
        probe_date_time_gte: now - SECONDS_PER_DAY,
        probe_date_time_lte: now,
      };
    case 'day': {
      // Specific day
      const dayStart = Math.floor(new Date(context.date).getTime() / 1000);
      return {
        probe_date_time_gte: dayStart,
        probe_date_time_lte: dayStart + SECONDS_PER_DAY,
      };
    }
    case 'hour':
      // Specific hour
      return {
        probe_date_time_gte: context.hourStartDateTime,
        probe_date_time_lte: context.hourStartDateTime + SECONDS_PER_HOUR,
      };
    case 'epoch': {
      // Specific epoch - filter by slots in that epoch
      const firstSlot = context.epoch * SLOTS_PER_EPOCH;
      const slots = Array.from({ length: SLOTS_PER_EPOCH }, (_, i) => firstSlot + i);
      return {
        probe_date_time_gte: context.hourStartDateTime,
        probe_date_time_lte: context.hourStartDateTime + SECONDS_PER_HOUR,
        slots_has_any_values: slots,
      };
    }
    case 'slot':
      // Specific slot
      return {
        probe_date_time_gte: context.hourStartDateTime,
        probe_date_time_lte: context.hourStartDateTime + SECONDS_PER_HOUR,
        slots_has_any_values: [context.slot],
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
  probe: IntCustodyProbe;
  onClick: () => void;
  isNew?: boolean;
}): JSX.Element {
  const slot = probe.slots?.[0];
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

/**
 * Copyable badge for slots/columns in the detail dialog
 */
function CopyableBadge({ value, label }: { value: string | number; label?: string }): JSX.Element {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent): void => {
    e.stopPropagation();
    navigator.clipboard.writeText(String(value));
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex cursor-pointer items-center justify-center rounded-sm border px-1.5 py-0.5 font-mono text-[10px] transition-all ${
        copied
          ? 'border-green-500/30 bg-green-500/10 text-green-500'
          : 'border-border bg-background text-foreground hover:border-primary/30 hover:bg-primary/10'
      }`}
      title={`Copy ${label || value}`}
    >
      {value}
    </button>
  );
}

/** Generate a unique key for a probe */
function getProbeKey(probe: IntCustodyProbe): string {
  return `${probe.probe_date_time}-${probe.peer_id_unique_key}-${probe.slots?.join(',')}-${probe.column_indices?.join(',')}`;
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
  const [selectedProbe, setSelectedProbe] = useState<IntCustodyProbe | null>(null);

  // Track known probe keys to detect new items
  const knownProbeKeysRef = useRef<Set<string>>(new Set());
  const [newProbeKeys, setNewProbeKeys] = useState<Set<string>>(new Set());

  // Build query parameters based on context
  const queryParams = useMemo(() => buildQueryParams(context), [context]);

  // Fetch probe data with polling
  // Use isLoading only for initial load, not refetches (to avoid flickering)
  const { data, isLoading, error, isFetched } = useQuery({
    ...intCustodyProbeServiceListOptions({
      query: {
        ...queryParams,
        page_size: maxEvents,
        order_by: 'probe_date_time desc',
      },
    }),
    enabled: !!currentNetwork,
    refetchInterval: pollInterval,
  });

  const probes = data?.int_custody_probe ?? [];

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
  const handleProbeClick = useCallback((probe: IntCustodyProbe) => {
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

      {/* Probe Detail Dialog */}
      <Dialog
        open={selectedProbe !== null}
        onClose={handleCloseDialog}
        title={
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <ServerIcon className="size-5 text-primary" />
              <span>Probe Details</span>
              {selectedProbe && (
                <div className="ml-2 flex items-center gap-2">
                  <Badge
                    variant="flat"
                    color={
                      selectedProbe.result === 'success'
                        ? 'green'
                        : selectedProbe.result === 'failure'
                          ? 'red'
                          : 'yellow'
                    }
                    className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase"
                  >
                    {selectedProbe.result}
                  </Badge>
                  <span className="font-mono text-xs text-muted">{selectedProbe.response_time_ms}ms</span>
                </div>
              )}
            </div>
            {selectedProbe && (
              <div className="flex items-center gap-2 text-xs font-normal text-muted">
                <ClockIcon className="size-3" />
                <Timestamp
                  timestamp={selectedProbe.probe_date_time ?? 0}
                  format="long"
                  disableModal
                  className="!p-0 !text-muted"
                />
              </div>
            )}
          </div>
        }
        description="Complete information about this custody probe attempt"
        size="xl"
      >
        {selectedProbe && (
          <div className="space-y-4">
            {/* Visual Flow */}
            <ProbeFlow probe={selectedProbe} />

            {/* Client Details Table */}
            <div>
              <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wider text-foreground uppercase">
                <CpuChipIcon className="size-4 text-primary" />
                Client Details
              </h4>

              <div className="overflow-hidden rounded-sm border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 font-medium text-muted uppercase">
                    <tr>
                      <th className="px-3 py-1.5 text-left">Attribute</th>
                      <th className="px-3 py-1.5 text-left">Prober</th>
                      <th className="px-3 py-1.5 text-left">Peer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr className="bg-surface/30">
                      <td className="px-3 py-1.5 font-medium text-muted">Client</td>
                      <td className="px-3 py-1.5">
                        <div className="flex items-center gap-1.5">
                          <ClientLogo client={selectedProbe.meta_client_implementation || 'Unknown'} size={16} />
                          <span className="font-medium">{selectedProbe.meta_client_implementation || '-'}</span>
                        </div>
                      </td>
                      <td className="px-3 py-1.5">
                        <div className="flex items-center gap-1.5">
                          <ClientLogo client={selectedProbe.meta_peer_implementation || 'Unknown'} size={16} />
                          <span className="font-medium">{selectedProbe.meta_peer_implementation || '-'}</span>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-1.5 font-medium text-muted">Version</td>
                      <td className="px-3 py-1.5 font-mono text-[10px]">{selectedProbe.meta_client_version || '-'}</td>
                      <td className="px-3 py-1.5 font-mono text-[10px]">{selectedProbe.meta_peer_version || '-'}</td>
                    </tr>
                    <tr className="bg-surface/30">
                      <td className="px-3 py-1.5 font-medium text-muted">Country</td>
                      <td className="px-3 py-1.5">
                        <div className="flex items-center gap-1.5">
                          <span>{getCountryFlag(selectedProbe.meta_client_geo_country_code)}</span>
                          <span>{selectedProbe.meta_client_geo_country || '-'}</span>
                        </div>
                      </td>
                      <td className="px-3 py-1.5">
                        <div className="flex items-center gap-1.5">
                          <span>{getCountryFlag(selectedProbe.meta_peer_geo_country_code)}</span>
                          <span>{selectedProbe.meta_peer_geo_country || '-'}</span>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-1.5 font-medium text-muted">City</td>
                      <td className="px-3 py-1.5">{selectedProbe.meta_client_geo_city || '-'}</td>
                      <td className="px-3 py-1.5">{selectedProbe.meta_peer_geo_city || '-'}</td>
                    </tr>
                    <tr className="bg-surface/30">
                      <td className="px-3 py-1.5 font-medium text-muted">ASN</td>
                      <td className="px-3 py-1.5 font-mono text-[10px]">
                        {selectedProbe.meta_client_geo_autonomous_system_number
                          ? `AS${selectedProbe.meta_client_geo_autonomous_system_number}`
                          : '-'}
                      </td>
                      <td className="px-3 py-1.5 font-mono text-[10px]">
                        {selectedProbe.meta_peer_geo_autonomous_system_number
                          ? `AS${selectedProbe.meta_peer_geo_autonomous_system_number}`
                          : '-'}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-1.5 font-medium text-muted">Peer ID</td>
                      <td className="px-3 py-1.5 text-muted">-</td>
                      <td className="px-3 py-1.5 font-mono text-[10px]">{selectedProbe.peer_id_unique_key || '-'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Request Details */}
            <div className="border-t border-border pt-4">
              <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wider text-foreground uppercase">
                <ListBulletIcon className="size-4 text-primary" />
                Request Details
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="mb-1 flex justify-between text-[10px] font-medium tracking-wider text-muted uppercase">
                    <span>Slots</span>
                    <span className="text-foreground">{selectedProbe.slots?.length || 0}</span>
                  </dt>
                  <div className="max-h-24 overflow-y-auto rounded-sm border border-border/50 bg-muted/30 p-1.5">
                    <div className="flex flex-wrap gap-1">
                      {selectedProbe.slots?.map(slot => <CopyableBadge key={slot} value={slot} label="Slot" />) || (
                        <span className="text-[10px] text-muted italic">None</span>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <dt className="mb-1 flex justify-between text-[10px] font-medium tracking-wider text-muted uppercase">
                    <span>Columns</span>
                    <span className="text-foreground">{selectedProbe.column_indices?.length || 0}</span>
                  </dt>
                  <div className="max-h-24 overflow-y-auto rounded-sm border border-border/50 bg-muted/30 p-1.5">
                    <div className="flex flex-wrap gap-1">
                      {selectedProbe.column_indices?.map(col => (
                        <CopyableBadge key={col} value={col} label="Column" />
                      )) || <span className="text-[10px] text-muted italic">None</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Error Section */}
              {selectedProbe.error && (
                <div className="mt-4">
                  <dt className="text-[10px] font-bold tracking-wider text-red-400 uppercase">Error</dt>
                  <dd className="mt-1 rounded-sm border border-red-500/20 bg-red-500/5 p-2 font-mono text-[10px] text-red-300">
                    {selectedProbe.error}
                  </dd>
                </div>
              )}
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}
