import { type JSX, useState, useMemo, useCallback } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import clsx from 'clsx';
import {
  CheckCircleIcon,
  XCircleIcon,
  QuestionMarkCircleIcon,
  MagnifyingGlassIcon,
  ServerIcon,
  ClockIcon,
  CpuChipIcon,
  ListBulletIcon,
  FunnelIcon,
  LinkIcon,
  CheckIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { intCustodyProbeServiceListOptions } from '@/api/@tanstack/react-query.gen';
import type { IntCustodyProbe } from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { Dialog } from '@/components/Overlays/Dialog';
import { Badge } from '@/components/Elements/Badge';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import { Timestamp } from '@/components/DataDisplay/Timestamp';
import { getCountryFlag } from '@/utils/country';
import { formatSlot, formatEpoch } from '@/utils';
import { ProbeFlow } from '@/pages/ethereum/data-availability/probes/components/ProbeFlow';
import type { CellProbeDialogProps, CellContext } from './CellProbeDialog.types';

/**
 * Result filter options
 */
type ResultFilter = 'all' | 'success' | 'failure' | 'missing';

/**
 * Maximum probes to fetch/display
 */
const MAX_PROBES = 50;

/**
 * Build a descriptive context string based on granularity and row data
 */
function buildContextDescription(cellContext: CellContext): string {
  const { granularity, rowIdentifier, rowLabel, isColumnOnly, contextLabel } = cellContext;

  // For column-only mode, use the provided context label (shows parent drill-down context)
  if (isColumnOnly && contextLabel) {
    return contextLabel;
  }

  switch (granularity) {
    case 'window':
      // rowLabel is a formatted date like "Dec 3"
      return `Day: ${rowLabel}`;
    case 'day':
      // rowLabel is a time like "14:00 UTC"
      return `Hour: ${rowLabel}`;
    case 'hour':
      // rowIdentifier is epoch number
      return `Epoch ${formatEpoch(Number(rowIdentifier))}`;
    case 'epoch':
      // rowIdentifier is slot number
      return `Slot ${formatSlot(Number(rowIdentifier))}`;
    case 'slot':
      // rowIdentifier is blob index, rowLabel has submitter info
      return `Blob ${rowIdentifier} — ${rowLabel}`;
    default:
      return rowLabel ?? 'Unknown';
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
 * Probe event row component
 */
function ProbeEventRow({ probe, onClick }: { probe: IntCustodyProbe; onClick: () => void }): JSX.Element {
  const slot = probe.slot;
  const columnsCount = probe.column_indices?.length ?? 0;
  const peerClient = probe.meta_peer_implementation || 'Unknown';
  const peerCountry = probe.meta_peer_geo_country || 'Unknown';
  const peerFlag = getCountryFlag(probe.meta_peer_geo_country_code);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-start gap-2 rounded-sm px-2 py-2 text-left transition-all hover:bg-muted/50"
    >
      <ClientLogo client={peerClient} size={28} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex w-full items-center gap-1.5 text-xs">
          <span className="font-medium text-foreground">{peerClient}</span>
          <span className="text-muted">·</span>
          {peerFlag && <span>{peerFlag}</span>}
          <span className="text-muted">{peerCountry}</span>
          <div className="flex-1" />
          <ResultIcon result={probe.result} />
        </div>
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
      {/* Eye icon - always visible to indicate clickability */}
      <div className="flex shrink-0 items-center self-center rounded-sm bg-accent/10 p-1.5 text-accent transition-all group-hover:bg-accent/20">
        <EyeIcon className="size-4" />
      </div>
    </button>
  );
}

/**
 * Quick filter button component - styled as standard buttons with color variants
 */
function FilterButton({
  label,
  isActive,
  onClick,
  variant,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
  variant: 'all' | 'success' | 'failure' | 'missing';
}): JSX.Element {
  // Base style inspired by the codebase's secondary button variant
  const baseStyle =
    'inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold transition-all rounded-sm shadow-xs inset-ring inset-ring-border';

  // Default (inactive) state styles per variant
  const defaultStyles = {
    all: 'bg-surface text-foreground hover:bg-background',
    success: 'bg-surface text-green-600 hover:bg-green-500/10',
    failure: 'bg-surface text-red-500 hover:bg-red-500/10',
    missing: 'bg-surface text-yellow-600 hover:bg-yellow-500/10',
  };

  // Active state styles per variant
  const activeStyles = {
    all: 'bg-primary/10 text-primary inset-ring-primary/50',
    success: 'bg-green-500/20 text-green-600 inset-ring-green-500/50',
    failure: 'bg-red-500/20 text-red-500 inset-ring-red-500/50',
    missing: 'bg-yellow-500/20 text-yellow-600 inset-ring-yellow-500/50',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(baseStyle, isActive ? activeStyles[variant] : defaultStyles[variant])}
    >
      {variant === 'success' && <CheckCircleIcon className="size-4" />}
      {variant === 'failure' && <XCircleIcon className="size-4" />}
      {variant === 'missing' && <QuestionMarkCircleIcon className="size-4" />}
      {variant === 'all' && <FunnelIcon className="size-4" />}
      <span>{label}</span>
    </button>
  );
}

/**
 * Dialog for viewing probes filtered by a specific cell (row + column)
 */
export function CellProbeDialog({
  isOpen,
  onClose,
  cellContext,
  timeRangeContext,
}: CellProbeDialogProps): JSX.Element | null {
  const { currentNetwork } = useNetwork();
  const [selectedProbe, setSelectedProbe] = useState<IntCustodyProbe | null>(null);
  const [resultFilter, setResultFilter] = useState<ResultFilter>('all');
  const [linkCopied, setLinkCopied] = useState(false);

  // Build query params from context (includes server-side result filter)
  const queryParams = useMemo(() => {
    if (!cellContext || !timeRangeContext) return null;

    const params: Record<string, unknown> = {
      // Filter by column - uses column_indices_has (array contains)
      column_indices_has: cellContext.columnIndex,
      page_size: MAX_PROBES,
      order_by: 'probe_date_time desc',
    };

    // Add time range filters
    if (timeRangeContext.timeStart !== undefined) {
      params.probe_date_time_gte = timeRangeContext.timeStart;
    }
    if (timeRangeContext.timeEnd !== undefined) {
      params.probe_date_time_lte = timeRangeContext.timeEnd;
    }

    // Add slot filter if specific slot
    if (timeRangeContext.slot !== undefined) {
      params.slot_eq = timeRangeContext.slot;
    }

    // Add slots filter if range of slots (epoch level)
    if (timeRangeContext.slots !== undefined && timeRangeContext.slots.length > 0) {
      params.slot_in_values = timeRangeContext.slots.join(',');
    }

    // Add server-side result filter
    if (resultFilter !== 'all') {
      params.result_eq = resultFilter;
    }

    return params;
  }, [cellContext, timeRangeContext, resultFilter]);

  // Fetch probes
  const { data, isLoading, error } = useQuery({
    ...intCustodyProbeServiceListOptions({
      query: queryParams as Record<string, unknown>,
    }),
    enabled: isOpen && !!currentNetwork && !!queryParams,
    placeholderData: keepPreviousData,
  });

  const probes = useMemo(() => data?.int_custody_probe ?? [], [data]);

  // Get the count from the response (server filtered)
  const probeCount = probes.length;

  // Build context description
  const contextDescription = useMemo(() => (cellContext ? buildContextDescription(cellContext) : ''), [cellContext]);

  // Build probes link params for "View All" link
  const probesLinkParams = useMemo(() => {
    if (!cellContext || !timeRangeContext) return {};

    const params: Record<string, unknown> = {
      column: cellContext.columnIndex,
    };

    if (timeRangeContext.slot !== undefined) {
      params.slot = timeRangeContext.slot;
    } else if (timeRangeContext.timeStart !== undefined && timeRangeContext.timeEnd !== undefined) {
      params.timeStart = timeRangeContext.timeStart;
      params.timeEnd = timeRangeContext.timeEnd;
    }

    return params;
  }, [cellContext, timeRangeContext]);

  // Handle probe click
  const handleProbeClick = useCallback((probe: IntCustodyProbe) => {
    setSelectedProbe(probe);
    setLinkCopied(false);
  }, []);

  // Handle detail close (go back to list)
  const handleDetailClose = useCallback(() => {
    setSelectedProbe(null);
    setLinkCopied(false);
  }, []);

  // Handle full close
  const handleClose = useCallback(() => {
    setSelectedProbe(null);
    setResultFilter('all');
    setLinkCopied(false);
    onClose();
  }, [onClose]);

  // Build direct link to the probe in the probes page
  const buildProbeLink = useCallback(
    (probe: IntCustodyProbe): string => {
      const baseUrl = window.location.origin;
      const params = new URLSearchParams();

      // Add network param to maintain network context
      if (currentNetwork?.name) {
        params.set('network', currentNetwork.name);
      }

      // Add probe identification params (probeTime only - probePeerId is not a supported filter)
      if (probe.probe_date_time) params.set('probeTime', String(probe.probe_date_time));

      // Add context filters so the probe shows in the list
      if (probe.slot !== undefined) params.set('slot', String(probe.slot));
      if (cellContext) params.set('column', String(cellContext.columnIndex));

      return `${baseUrl}/ethereum/data-availability/probes?${params.toString()}`;
    },
    [cellContext, currentNetwork]
  );

  // Handle copy link
  const handleCopyLink = useCallback(() => {
    if (!selectedProbe) return;
    const link = buildProbeLink(selectedProbe);
    navigator.clipboard.writeText(link);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }, [selectedProbe, buildProbeLink]);

  // Get display column number (0-127, matching the data)
  const displayColumn = cellContext ? cellContext.columnIndex : 0;

  if (!cellContext) return null;

  return (
    <>
      {/* Main list dialog */}
      <Dialog
        open={isOpen && selectedProbe === null}
        onClose={handleClose}
        title={
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <ServerIcon className="size-5 text-primary" />
              <span>Column {displayColumn} Probes</span>
            </div>
            <div className="text-xs font-normal text-muted">{contextDescription}</div>
          </div>
        }
        description={`Probe events that include column ${displayColumn} for ${contextDescription}`}
        size="lg"
      >
        <div className="flex flex-col gap-4">
          {/* Quick filters */}
          <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
            <FilterButton
              label="All"
              isActive={resultFilter === 'all'}
              onClick={() => setResultFilter('all')}
              variant="all"
            />
            <FilterButton
              label="Success"
              isActive={resultFilter === 'success'}
              onClick={() => setResultFilter('success')}
              variant="success"
            />
            <FilterButton
              label="Failure"
              isActive={resultFilter === 'failure'}
              onClick={() => setResultFilter('failure')}
              variant="failure"
            />
            <FilterButton
              label="Missing"
              isActive={resultFilter === 'missing'}
              onClick={() => setResultFilter('missing')}
              variant="missing"
            />
            <div className="flex-1" />
            <Link
              to="/ethereum/data-availability/probes"
              search={probesLinkParams}
              className="inline-flex items-center gap-1.5 rounded-xs border border-accent/50 bg-accent/10 px-2 py-1 text-xs font-medium text-accent transition-colors hover:bg-accent/20"
            >
              <MagnifyingGlassIcon className="size-3.5" />
              View All Probes
            </Link>
          </div>

          {/* Status message */}
          <div className="text-xs text-muted">
            {isLoading ? (
              'Loading...'
            ) : error ? (
              <span className="text-red-500">Error loading probes</span>
            ) : (
              <span>
                {probeCount} {probeCount === 1 ? 'probe' : 'probes'} found
                {probeCount === MAX_PROBES && ' (limited to 50)'}
              </span>
            )}
          </div>

          {/* Probe list */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="space-y-2 p-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2 px-2 py-1.5">
                    <div className="size-7 animate-pulse rounded-full bg-muted/50" />
                    <div className="flex flex-1 flex-col gap-1">
                      <div className="h-3 w-24 animate-pulse rounded-xs bg-muted/50" />
                      <div className="h-2 w-16 animate-pulse rounded-xs bg-muted/50" />
                    </div>
                  </div>
                ))}
              </div>
            ) : probes.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted">
                No probes found for column {displayColumn} in this time period
              </div>
            ) : (
              <div className="space-y-0.5">
                {probes.map((probe, index) => (
                  <ProbeEventRow
                    key={`${probe.probe_date_time}-${probe.peer_id_unique_key}-${index}`}
                    probe={probe}
                    onClick={() => handleProbeClick(probe)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </Dialog>

      {/* Probe detail dialog */}
      <Dialog
        open={isOpen && selectedProbe !== null}
        onClose={handleDetailClose}
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
              {/* Copy Link button */}
              <button
                type="button"
                onClick={handleCopyLink}
                className={clsx(
                  'ml-auto flex items-center gap-1.5 rounded border px-2 py-1 text-xs transition-all',
                  linkCopied
                    ? 'border-green-500/30 bg-green-500/10 text-green-500'
                    : 'border-border bg-background text-muted hover:border-primary/30 hover:bg-primary/10 hover:text-primary'
                )}
                title="Copy link to this probe on the Probes page"
              >
                {linkCopied ? <CheckIcon className="size-3.5" /> : <LinkIcon className="size-3.5" />}
                <span>{linkCopied ? 'Copied!' : 'Copy Link'}</span>
              </button>
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

              <div className="overflow-hidden rounded-xs border border-border">
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

            {/* Columns */}
            <div className="border-t border-border pt-4">
              <div className="flex items-center gap-2">
                <h4 className="flex items-center gap-2 text-xs font-semibold tracking-wider text-foreground uppercase">
                  <ListBulletIcon className="size-4 text-primary" />
                  Columns
                </h4>
                <span className="text-xs text-muted">({selectedProbe.column_indices?.length || 0})</span>
              </div>

              <div className="mt-2 flex flex-wrap gap-1">
                {selectedProbe.column_indices && selectedProbe.column_indices.length > 0 ? (
                  selectedProbe.column_indices.map(col => (
                    <Link
                      key={col}
                      to="/ethereum/data-availability/probes"
                      search={{
                        column: col,
                        ...(selectedProbe.slot !== undefined ? { slot: selectedProbe.slot } : {}),
                      }}
                      className="inline-flex items-center justify-center rounded-xs border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-foreground transition-all hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
                      title={`View all probes for column ${col}`}
                    >
                      {col}
                    </Link>
                  ))
                ) : (
                  <span className="text-xs text-muted italic">No columns</span>
                )}
              </div>

              {/* Error Section */}
              {selectedProbe.error && (
                <div className="mt-4">
                  <dt className="text-[10px] font-bold tracking-wider text-red-400 uppercase">Error</dt>
                  <dd className="mt-1 rounded-xs border border-red-500/20 bg-red-500/5 p-2 font-mono text-[10px] text-red-300">
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
