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
  FunnelIcon,
} from '@heroicons/react/24/outline';
import { intCustodyProbeServiceListOptions } from '@/api/@tanstack/react-query.gen';
import type { IntCustodyProbe } from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { Dialog } from '@/components/Overlays/Dialog';
import { formatEpoch, formatSlot } from '@/utils';
import { ProbeEventRow } from '@/pages/ethereum/data-availability/components/ProbeEventRow';
import { ProbeDetailDialog } from '@/pages/ethereum/data-availability/probes/components/ProbeDetailDialog';
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
 * Includes full hierarchy context (slot, epoch, etc.) for clarity
 */
function buildContextDescription(cellContext: CellContext): string {
  const { granularity, rowIdentifier, rowLabel, isColumnOnly, contextLabel, parentContext } = cellContext;

  // For column-only mode, use the provided context label (shows parent drill-down context)
  if (isColumnOnly && contextLabel) {
    return contextLabel;
  }

  // Build context parts from parent context + current row
  const parts: string[] = [];

  switch (granularity) {
    case 'window':
      // rowLabel is a formatted date like "Dec 3"
      parts.push(rowLabel ?? rowIdentifier ?? 'Unknown');
      break;
    case 'day':
      // rowLabel is a time like "14:00", add date from parent
      if (parentContext?.date) {
        const dateStr = new Date(parentContext.date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          timeZone: 'UTC',
        });
        parts.push(dateStr);
      }
      parts.push(rowLabel ?? 'Unknown');
      break;
    case 'hour':
      // rowIdentifier is epoch number, add date/time from parent
      if (parentContext?.date) {
        const dateStr = new Date(parentContext.date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          timeZone: 'UTC',
        });
        parts.push(dateStr);
      }
      if (parentContext?.hourStartDateTime) {
        const timeStr = new Date(parentContext.hourStartDateTime * 1000).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: 'UTC',
        });
        parts.push(timeStr);
      }
      parts.push(`Epoch ${formatEpoch(Number(rowIdentifier))}`);
      break;
    case 'epoch':
      // rowIdentifier is slot number, add epoch from parent
      if (parentContext?.epoch !== undefined) {
        parts.push(`Epoch ${formatEpoch(parentContext.epoch)}`);
      }
      parts.push(`Slot ${formatSlot(Number(rowIdentifier))}`);
      break;
    case 'slot':
      // rowIdentifier is blob index, add slot from parent
      if (parentContext?.slot !== undefined) {
        parts.push(`Slot ${formatSlot(parentContext.slot)}`);
      }
      parts.push(`Blob ${rowLabel}`);
      break;
    default:
      parts.push(rowLabel ?? 'Unknown');
  }

  return parts.join(' · ');
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
  // failure = yellow (transient/one-off failure - less severe)
  // missing = red (peer responded but didn't have the data - serious)
  const defaultStyles = {
    all: 'bg-surface text-foreground hover:bg-background',
    success: 'bg-surface text-green-600 hover:bg-green-500/10',
    failure: 'bg-surface text-yellow-600 hover:bg-yellow-500/10',
    missing: 'bg-surface text-red-500 hover:bg-red-500/10',
  };

  // Active state styles per variant
  const activeStyles = {
    all: 'bg-primary/10 text-primary inset-ring-primary/50',
    success: 'bg-green-500/20 text-green-600 inset-ring-green-500/50',
    failure: 'bg-yellow-500/20 text-yellow-600 inset-ring-yellow-500/50',
    missing: 'bg-red-500/20 text-red-500 inset-ring-red-500/50',
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
  }, []);

  // Handle detail close (go back to list)
  const handleDetailClose = useCallback(() => {
    setSelectedProbe(null);
  }, []);

  // Handle full close
  const handleClose = useCallback(() => {
    setSelectedProbe(null);
    setResultFilter('all');
    onClose();
  }, [onClose]);

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
                    showViewIcon
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </Dialog>

      {/* Probe detail dialog - shared component */}
      <ProbeDetailDialog probe={selectedProbe} isOpen={isOpen && selectedProbe !== null} onClose={handleDetailClose} />
    </>
  );
}
