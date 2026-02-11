import React, { type JSX, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronUpIcon, ChevronDownIcon, ChevronRightIcon, ServerIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { Card } from '@/components/Layout/Card';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import { ClusterSpecsModal } from '@/components/Ethereum/ClusterSpecsModal';
import { intEngineNewPayloadServiceListOptions } from '@/api/@tanstack/react-query.gen';
import type { IntEngineNewPayload } from '@/api/types.gen';
import { extractClusterFromNodeName, CLUSTER_COLORS } from '@/constants/eip7870';

/**
 * Get color class for duration value relative to max (green = fast, red = slow)
 */
function getDurationColorClass(value: number, max: number): string {
  if (max === 0) return 'text-muted';

  const ratio = value / max;

  if (ratio <= 0.25) return 'text-success';
  if (ratio <= 0.5) return 'text-success/80';
  if (ratio <= 0.75) return 'text-warning';
  return 'text-danger';
}

interface ClientVersionData {
  meta_execution_implementation?: string;
  meta_execution_version?: string;
  observation_count?: number;
  avg_duration_ms?: number;
  min_duration_ms?: number;
  max_duration_ms?: number;
  avg_returned_count?: number;
  status?: string;
}

interface HourlyClientVersionData {
  meta_execution_implementation?: string;
  meta_execution_version?: string;
  observation_count?: number;
  avg_duration_ms?: number;
  p50_duration_ms?: number;
  p95_duration_ms?: number;
  min_duration_ms?: number;
  max_duration_ms?: number;
  avg_returned_count?: number;
}

export interface ClientVersionBreakdownProps {
  /** Raw per-slot data with client/version info */
  data: ClientVersionData[];
  /** Optional hourly aggregated data with true percentiles (used for P50/P95 columns) */
  hourlyData?: HourlyClientVersionData[];
  /** Title for the card */
  title?: string;
  /** Description for the card */
  description?: string;
  /** Whether to show average blob count column (for getBlobs data) */
  showBlobCount?: boolean;
  /** If true, renders without Card wrapper (for embedding in existing Cards) */
  noCard?: boolean;
  /** If true, shows only logo without client name text (compact mode for smaller spaces) */
  compactClient?: boolean;
  /** If true, hides the observations column */
  hideObservations?: boolean;
  /** If true, hides the range column */
  hideRange?: boolean;
  /** Custom label for the blob count column (defaults to "Avg Blobs") */
  blobCountLabel?: string;
  /** If true and slot is provided, rows can be expanded to show individual observations */
  expandable?: boolean;
  /** Slot number for fetching individual observations (required if expandable is true) */
  slot?: number;
  /** Only use rows with this status for duration calculation (e.g., "VALID"). Shows "-" if no matching rows. */
  durationStatusFilter?: string;
}

interface AggregatedRow {
  client: string;
  version: string;
  avgDuration: number;
  p50Duration: number;
  p95Duration: number;
  minDuration: number;
  maxDuration: number;
  observations: number;
  avgBlobCount?: number;
}

interface ClientGroupedRow extends AggregatedRow {
  otherVersions: AggregatedRow[];
  versionCount: number;
}

type SortField = 'client' | 'version' | 'avgDuration' | 'p50Duration' | 'p95Duration' | 'observations' | 'avgBlobCount';
type SortDirection = 'asc' | 'desc';

/**
 * Get status badge styling
 */
function getStatusStyle(status?: string): { bg: string; text: string } {
  switch (status?.toUpperCase()) {
    case 'VALID':
      return { bg: 'bg-success/10', text: 'text-success' };
    case 'ERROR':
    case 'INVALID':
      return { bg: 'bg-danger/10', text: 'text-danger' };
    case 'SYNCING':
      return { bg: 'bg-warning/10', text: 'text-warning' };
    default:
      return { bg: 'bg-muted/10', text: 'text-muted' };
  }
}

/**
 * Shorten node name by removing common prefixes but keeping cluster identifier
 */
function shortenNodeName(nodeName?: string): string {
  if (!nodeName) return '-';
  return nodeName
    .replace(/^ethpandaops\/mainnet\//, '')
    .replace(/^ethpandaops\//, '')
    .replace(/^utility-mainnet-/, 'utility/')
    .replace(/^sigma-mainnet-/, 'sigma/')
    .replace(/^prysm-/, '');
}

/**
 * Expanded row content that lazy loads individual observations
 */
function ExpandedRowContent({
  slot,
  client,
  colSpan,
  onClusterClick,
}: {
  slot: number;
  client: string;
  colSpan: number;
  onClusterClick: (clusterName: string) => void;
}): JSX.Element {
  // Map client display names to API values (handles case sensitivity)
  const getClientFilter = (clientName: string): string => {
    const lower = clientName.toLowerCase();
    // Map to exact database values
    const clientMap: Record<string, string> = {
      geth: 'go-ethereum',
      'go-ethereum': 'go-ethereum',
      nethermind: 'Nethermind',
      besu: 'Besu',
      reth: 'Reth',
      erigon: 'erigon',
    };
    return clientMap[lower] ?? clientName;
  };

  const clientApiValue = getClientFilter(client);

  const { data, isLoading, error } = useQuery({
    ...intEngineNewPayloadServiceListOptions({
      query: {
        slot_eq: slot,
        meta_execution_implementation_eq: clientApiValue,
        node_class_eq: 'eip7870-block-builder',
        page_size: 50,
      },
    }),
  });

  const observations = data?.int_engine_new_payload ?? [];

  if (isLoading) {
    return (
      <tr>
        <td colSpan={colSpan} className="bg-background/50 px-4 py-3">
          <div className="ml-8 flex items-center gap-2 text-sm text-muted">
            <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Loading observations...
          </div>
        </td>
      </tr>
    );
  }

  if (error) {
    return (
      <tr>
        <td colSpan={colSpan} className="bg-background/50 px-4 py-3">
          <div className="ml-8 text-sm text-danger">Failed to load observations</div>
        </td>
      </tr>
    );
  }

  if (observations.length === 0) {
    return (
      <tr>
        <td colSpan={colSpan} className="bg-background/50 px-4 py-3">
          <div className="ml-8 text-sm text-muted">No individual observations found</div>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td colSpan={colSpan} className="bg-background/50 p-0">
        <div className="ml-8 border-l-2 border-border py-2 pl-4">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-muted">
                <th className="px-2 py-1 text-left font-medium">Node</th>
                <th className="px-2 py-1 text-left font-medium">Status</th>
                <th className="px-2 py-1 text-right font-medium">Duration</th>
              </tr>
            </thead>
            <tbody>
              {observations.map((obs: IntEngineNewPayload, idx: number) => {
                const statusStyle = getStatusStyle(obs.status);
                const clusterName = extractClusterFromNodeName(obs.meta_client_name ?? '');
                const clusterColor = clusterName ? CLUSTER_COLORS[clusterName] : null;
                return (
                  <tr key={`${obs.meta_client_name}-${idx}`} className="text-sm">
                    <td className="px-2 py-1.5">
                      <span className="flex items-center gap-1.5 text-muted" title={obs.meta_client_name}>
                        {clusterColor && clusterName && (
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              onClusterClick(clusterName);
                            }}
                            className="rounded-xs p-0.5 transition-all hover:bg-primary/10 hover:ring-1 hover:ring-primary/30"
                            title={`View ${clusterName} cluster specs`}
                          >
                            <ServerIcon className={clsx('size-3.5 shrink-0', clusterColor)} />
                          </button>
                        )}
                        {shortenNodeName(obs.meta_client_name)}
                      </span>
                    </td>
                    <td className="px-2 py-1.5">
                      <span
                        className={clsx(
                          'inline-block rounded-sm px-1.5 py-0.5 text-xs font-medium',
                          statusStyle.bg,
                          statusStyle.text
                        )}
                      >
                        {obs.status ?? '-'}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <span className="font-mono text-foreground">{obs.duration_ms?.toLocaleString() ?? '-'}ms</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </td>
    </tr>
  );
}

/**
 * Displays a breakdown of execution client performance by client and version
 */
export function ClientVersionBreakdown({
  data,
  hourlyData,
  title = 'Client Version Breakdown',
  description = 'Duration statistics by execution client and version',
  showBlobCount = false,
  noCard = false,
  compactClient = false,
  hideObservations = false,
  hideRange = false,
  blobCountLabel = 'Avg Blobs',
  expandable = false,
  slot,
  durationStatusFilter,
}: ClientVersionBreakdownProps): JSX.Element {
  // Default sort by avgDuration (ascending = fastest first) when observations hidden, otherwise by observations
  const [sortField, setSortField] = useState<SortField>(hideObservations ? 'avgDuration' : 'observations');
  const [sortDirection, setSortDirection] = useState<SortDirection>(hideObservations ? 'asc' : 'desc');

  // Track which clients are expanded (for expandable mode)
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());

  // Track which client groups are expanded (for multi-version collapsing)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Cluster specs modal state
  const [clusterSpecsOpen, setClusterSpecsOpen] = useState(false);
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);

  const handleClusterClick = (clusterName: string): void => {
    setSelectedCluster(clusterName);
    setClusterSpecsOpen(true);
  };

  // Whether we have hourly data with true percentiles
  const hasHourlyData = hourlyData && hourlyData.length > 0;

  // Aggregate hourly data by client + version (for true percentiles)
  const hourlyAggregatedData = useMemo(() => {
    if (!hourlyData || hourlyData.length === 0) return new Map<string, AggregatedRow>();

    const map = new Map<
      string,
      {
        client: string;
        version: string;
        totalWeightedAvg: number;
        totalWeightedP50: number;
        totalWeightedP95: number;
        minDuration: number;
        maxDuration: number;
        totalObservations: number;
        totalWeightedBlobCount: number;
      }
    >();

    hourlyData.forEach(row => {
      const client = (row.meta_execution_implementation ?? 'unknown').toLowerCase();
      const version = row.meta_execution_version ?? 'unknown';
      const key = `${client}|${version}`;
      const obs = row.observation_count ?? 0;
      const minDur = row.min_duration_ms ?? 0;
      const maxDur = row.max_duration_ms ?? 0;

      const existing = map.get(key);
      if (existing) {
        existing.totalWeightedAvg += (row.avg_duration_ms ?? 0) * obs;
        existing.totalWeightedP50 += (row.p50_duration_ms ?? 0) * obs;
        existing.totalWeightedP95 += (row.p95_duration_ms ?? 0) * obs;
        if (minDur > 0 && (existing.minDuration === 0 || minDur < existing.minDuration)) {
          existing.minDuration = minDur;
        }
        if (maxDur > existing.maxDuration) {
          existing.maxDuration = maxDur;
        }
        existing.totalObservations += obs;
        existing.totalWeightedBlobCount += (row.avg_returned_count ?? 0) * obs;
      } else {
        map.set(key, {
          client,
          version,
          totalWeightedAvg: (row.avg_duration_ms ?? 0) * obs,
          totalWeightedP50: (row.p50_duration_ms ?? 0) * obs,
          totalWeightedP95: (row.p95_duration_ms ?? 0) * obs,
          minDuration: minDur,
          maxDuration: maxDur,
          totalObservations: obs,
          totalWeightedBlobCount: (row.avg_returned_count ?? 0) * obs,
        });
      }
    });

    // Convert to AggregatedRow format
    const result = new Map<string, AggregatedRow>();
    map.forEach((entry, key) => {
      if (entry.totalObservations > 0) {
        result.set(key, {
          client: entry.client,
          version: entry.version,
          avgDuration: entry.totalWeightedAvg / entry.totalObservations,
          p50Duration: entry.totalWeightedP50 / entry.totalObservations,
          p95Duration: entry.totalWeightedP95 / entry.totalObservations,
          minDuration: entry.minDuration,
          maxDuration: entry.maxDuration,
          observations: entry.totalObservations,
          avgBlobCount: entry.totalWeightedBlobCount / entry.totalObservations,
        });
      }
    });

    return result;
  }, [hourlyData]);

  // Aggregate per-slot data by client + version (fallback when no hourly data)
  const aggregatedData = useMemo(() => {
    // If we have hourly data, use that directly
    if (hasHourlyData) {
      return Array.from(hourlyAggregatedData.values());
    }

    // Fall back to per-slot data aggregation
    // When durationStatusFilter is set, duration is computed only from matching rows
    const map = new Map<
      string,
      {
        client: string;
        version: string;
        totalWeightedAvg: number;
        totalWeightedAvgObs: number; // observations for duration calc (may differ when filtered)
        minDuration: number;
        maxDuration: number;
        totalObservations: number;
        totalWeightedBlobCount: number;
      }
    >();

    data.forEach(row => {
      const client = (row.meta_execution_implementation ?? 'unknown').toLowerCase();
      const version = row.meta_execution_version ?? 'unknown';
      const key = `${client}|${version}`;
      const obs = row.observation_count ?? 0;
      const minDur = row.min_duration_ms ?? 0;
      const maxDur = row.max_duration_ms ?? 0;

      // Check if this row's status matches the filter for duration calculation
      const statusMatches = !durationStatusFilter || row.status?.toUpperCase() === durationStatusFilter.toUpperCase();

      const existing = map.get(key);
      if (existing) {
        // Only add to duration stats if status matches (or no filter)
        if (statusMatches) {
          existing.totalWeightedAvg += (row.avg_duration_ms ?? 0) * obs;
          existing.totalWeightedAvgObs += obs;
          if (minDur > 0 && (existing.minDuration === 0 || minDur < existing.minDuration)) {
            existing.minDuration = minDur;
          }
          if (maxDur > existing.maxDuration) {
            existing.maxDuration = maxDur;
          }
        }
        existing.totalObservations += obs;
        existing.totalWeightedBlobCount += (row.avg_returned_count ?? 0) * obs;
      } else {
        map.set(key, {
          client,
          version,
          totalWeightedAvg: statusMatches ? (row.avg_duration_ms ?? 0) * obs : 0,
          totalWeightedAvgObs: statusMatches ? obs : 0,
          minDuration: statusMatches ? minDur : 0,
          maxDuration: statusMatches ? maxDur : 0,
          totalObservations: obs,
          totalWeightedBlobCount: (row.avg_returned_count ?? 0) * obs,
        });
      }
    });

    // Convert to final format (no p50/p95 without hourly data)
    // avgDuration uses filtered observations (totalWeightedAvgObs), shows 0 if no matching status
    const result: AggregatedRow[] = [];
    map.forEach(entry => {
      if (entry.totalObservations > 0) {
        result.push({
          client: entry.client,
          version: entry.version,
          avgDuration: entry.totalWeightedAvgObs > 0 ? entry.totalWeightedAvg / entry.totalWeightedAvgObs : 0,
          p50Duration: 0,
          p95Duration: 0,
          minDuration: entry.minDuration,
          maxDuration: entry.maxDuration,
          observations: entry.totalObservations,
          avgBlobCount: entry.totalWeightedBlobCount / entry.totalObservations,
        });
      }
    });

    return result;
  }, [data, hasHourlyData, hourlyAggregatedData, durationStatusFilter]);

  // Group aggregated data by client, showing only the most-observed version per client
  const clientGroupedData = useMemo(() => {
    const clientMap = new Map<string, AggregatedRow[]>();

    for (const row of aggregatedData) {
      const existing = clientMap.get(row.client);
      if (existing) {
        existing.push(row);
      } else {
        clientMap.set(row.client, [row]);
      }
    }

    const result: ClientGroupedRow[] = [];

    clientMap.forEach(versions => {
      // Sort by observation count descending — highest count is the "primary" version
      const sorted = [...versions].sort((a, b) => b.observations - a.observations);
      const primary = sorted[0];
      const others = sorted.slice(1);

      result.push({
        ...primary,
        otherVersions: others,
        versionCount: versions.length,
      });
    });

    return result;
  }, [aggregatedData]);

  // Calculate max avg duration for color scaling
  const maxAvgDuration = useMemo(() => {
    return Math.max(...aggregatedData.map(r => r.avgDuration), 0);
  }, [aggregatedData]);

  // Sort grouped data (one row per client, showing primary version)
  const sortedData = useMemo(() => {
    return [...clientGroupedData].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'client':
          comparison = a.client.localeCompare(b.client);
          break;
        case 'version':
          comparison = a.version.localeCompare(b.version);
          break;
        case 'avgDuration':
          comparison = a.avgDuration - b.avgDuration;
          break;
        case 'p50Duration':
          comparison = a.p50Duration - b.p50Duration;
          break;
        case 'p95Duration':
          comparison = a.p95Duration - b.p95Duration;
          break;
        case 'observations':
          comparison = a.observations - b.observations;
          break;
        case 'avgBlobCount':
          comparison = (a.avgBlobCount ?? 0) - (b.avgBlobCount ?? 0);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [clientGroupedData, sortField, sortDirection]);

  const handleSort = (field: SortField): void => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }): JSX.Element | null => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUpIcon className="ml-1 inline size-4" />
    ) : (
      <ChevronDownIcon className="ml-1 inline size-4" />
    );
  };

  const headerClass =
    'cursor-pointer select-none py-3 px-3 text-left text-sm font-semibold text-foreground hover:text-accent transition-colors';

  if (aggregatedData.length === 0) {
    const emptyContent = (
      <>
        {!noCard && (
          <>
            <h4 className="mb-2 text-base font-semibold text-foreground">{title}</h4>
            <p className="mb-4 text-sm text-muted">{description}</p>
          </>
        )}
        <div className="flex h-[200px] items-center justify-center text-muted">No client version data available</div>
      </>
    );

    if (noCard) {
      return <div>{emptyContent}</div>;
    }

    return (
      <Card>
        <div className="p-4">{emptyContent}</div>
      </Card>
    );
  }

  const tableContent = (
    <>
      {!noCard && (
        <>
          <h4 className="mb-2 text-base font-semibold text-foreground">{title}</h4>
          <p className="mb-4 text-sm text-muted">{description}</p>
        </>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-surface">
            <tr>
              <th className={clsx(headerClass, 'pl-4')} onClick={() => handleSort('client')}>
                Client
                <SortIcon field="client" />
              </th>
              <th className={headerClass} onClick={() => handleSort('version')}>
                Version
                <SortIcon field="version" />
              </th>
              <th className={clsx(headerClass, 'text-right')} onClick={() => handleSort('avgDuration')}>
                Avg (ms)
                <SortIcon field="avgDuration" />
              </th>
              {hasHourlyData && (
                <th className={clsx(headerClass, 'text-right')} onClick={() => handleSort('p50Duration')}>
                  P50 (ms)
                  <SortIcon field="p50Duration" />
                </th>
              )}
              {hasHourlyData && (
                <th className={clsx(headerClass, 'text-right')} onClick={() => handleSort('p95Duration')}>
                  P95 (ms)
                  <SortIcon field="p95Duration" />
                </th>
              )}
              {!hideRange && <th className={clsx(headerClass, 'text-right')}>Range</th>}
              {showBlobCount && (
                <th className={clsx(headerClass, 'text-right')} onClick={() => handleSort('avgBlobCount')}>
                  {blobCountLabel}
                  <SortIcon field="avgBlobCount" />
                </th>
              )}
              {!hideObservations && (
                <th className={clsx(headerClass, 'pr-4 text-right')} onClick={() => handleSort('observations')}>
                  Observations
                  <SortIcon field="observations" />
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-surface">
            {sortedData.map((row, index) => {
              const isGroupExpanded = expandedGroups.has(row.client);
              const hasMultipleVersions = row.versionCount > 1;
              const rowKey = `${row.client}-${row.version}`;
              const isNodeExpanded = expandedClients.has(rowKey);
              const canExpandNode = expandable && slot !== undefined;
              const colCount =
                3 +
                (hasHourlyData ? 2 : 0) +
                (hideRange ? 0 : 1) +
                (showBlobCount ? 1 : 0) +
                (hideObservations ? 0 : 1);

              const handlePrimaryRowClick = (): void => {
                if (hasMultipleVersions) {
                  setExpandedGroups(prev => {
                    const next = new Set(prev);
                    if (next.has(row.client)) {
                      next.delete(row.client);
                    } else {
                      next.add(row.client);
                    }
                    return next;
                  });
                } else if (canExpandNode) {
                  setExpandedClients(prev => {
                    const next = new Set(prev);
                    if (next.has(rowKey)) {
                      next.delete(rowKey);
                    } else {
                      next.add(rowKey);
                    }
                    return next;
                  });
                }
              };

              const isClickable = hasMultipleVersions || canExpandNode;
              const showChevron = hasMultipleVersions || canExpandNode;
              const chevronExpanded = hasMultipleVersions ? isGroupExpanded : isNodeExpanded;

              const renderMetricCells = (metricRow: AggregatedRow): JSX.Element => (
                <>
                  <td className="px-3 py-3 text-right">
                    {metricRow.avgDuration > 0 ? (
                      <span
                        className={clsx(
                          'text-sm font-medium',
                          getDurationColorClass(metricRow.avgDuration, maxAvgDuration)
                        )}
                      >
                        {metricRow.avgDuration.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-sm text-muted">-</span>
                    )}
                  </td>
                  {hasHourlyData && (
                    <td className="px-3 py-3 text-right">
                      {metricRow.p50Duration > 0 ? (
                        <span
                          className={clsx(
                            'text-sm font-medium',
                            getDurationColorClass(metricRow.p50Duration, maxAvgDuration)
                          )}
                        >
                          {metricRow.p50Duration.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-sm text-muted">-</span>
                      )}
                    </td>
                  )}
                  {hasHourlyData && (
                    <td className="px-3 py-3 text-right">
                      {metricRow.p95Duration > 0 ? (
                        <span
                          className={clsx(
                            'text-sm font-medium',
                            getDurationColorClass(metricRow.p95Duration, maxAvgDuration)
                          )}
                        >
                          {metricRow.p95Duration.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-sm text-muted">-</span>
                      )}
                    </td>
                  )}
                  {!hideRange && (
                    <td className="px-3 py-3 text-right">
                      {metricRow.maxDuration > 0 ? (
                        <span className="text-sm text-muted">
                          {metricRow.minDuration.toFixed(0)} – {metricRow.maxDuration.toFixed(0)} ms
                        </span>
                      ) : (
                        <span className="text-sm text-muted">-</span>
                      )}
                    </td>
                  )}
                  {showBlobCount && (
                    <td className="px-3 py-3 text-right">
                      <span className="text-sm text-muted">{(metricRow.avgBlobCount ?? 0).toFixed(1)}</span>
                    </td>
                  )}
                  {!hideObservations && (
                    <td className="py-3 pr-4 pl-3 text-right">
                      <span className="text-sm text-muted">{metricRow.observations.toLocaleString()}</span>
                    </td>
                  )}
                </>
              );

              return (
                <React.Fragment key={`${row.client}-${row.version}-${index}`}>
                  {/* Primary row */}
                  <tr
                    className={clsx(
                      'transition-colors hover:bg-background',
                      isClickable && 'cursor-pointer',
                      chevronExpanded && 'bg-background'
                    )}
                    onClick={handlePrimaryRowClick}
                  >
                    <td className="py-3 pr-3 pl-4">
                      <div className="flex items-center gap-2" title={row.client}>
                        {showChevron && (
                          <ChevronRightIcon
                            className={clsx('size-4 text-muted transition-transform', chevronExpanded && 'rotate-90')}
                          />
                        )}
                        <ClientLogo client={row.client} size={compactClient ? 24 : 20} />
                        {!compactClient && <span className="text-sm font-medium text-foreground">{row.client}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-mono text-sm text-muted">{row.version}</span>
                      {hasMultipleVersions && (
                        <span className="ml-2 rounded-full bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                          {row.versionCount} versions
                        </span>
                      )}
                    </td>
                    {renderMetricCells(row)}
                  </tr>

                  {/* Per-node expansion for single-version clients */}
                  {!hasMultipleVersions && isNodeExpanded && slot !== undefined && (
                    <ExpandedRowContent
                      slot={slot}
                      client={row.client}
                      colSpan={colCount}
                      onClusterClick={handleClusterClick}
                    />
                  )}

                  {/* Group expansion: other version sub-rows */}
                  {hasMultipleVersions &&
                    isGroupExpanded &&
                    row.otherVersions.map((subRow, subIndex) => {
                      const subRowKey = `${subRow.client}-${subRow.version}`;
                      const isSubNodeExpanded = expandedClients.has(subRowKey);

                      const handleSubRowClick = (): void => {
                        if (!canExpandNode) return;
                        setExpandedClients(prev => {
                          const next = new Set(prev);
                          if (next.has(subRowKey)) {
                            next.delete(subRowKey);
                          } else {
                            next.add(subRowKey);
                          }
                          return next;
                        });
                      };

                      return (
                        <React.Fragment key={`sub-${subRow.client}-${subRow.version}-${subIndex}`}>
                          <tr
                            className={clsx(
                              'bg-background/50 transition-colors hover:bg-background',
                              canExpandNode && 'cursor-pointer',
                              isSubNodeExpanded && 'bg-background'
                            )}
                            onClick={handleSubRowClick}
                          >
                            <td className="border-l-2 border-primary/30 py-3 pr-3 pl-10">
                              <div className="flex items-center gap-2">
                                {canExpandNode && (
                                  <ChevronRightIcon
                                    className={clsx(
                                      'size-4 text-muted transition-transform',
                                      isSubNodeExpanded && 'rotate-90'
                                    )}
                                  />
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <span className="font-mono text-sm text-muted">{subRow.version}</span>
                            </td>
                            {renderMetricCells(subRow)}
                          </tr>
                          {isSubNodeExpanded && slot !== undefined && (
                            <ExpandedRowContent
                              slot={slot}
                              client={subRow.client}
                              colSpan={colCount}
                              onClusterClick={handleClusterClick}
                            />
                          )}
                        </React.Fragment>
                      );
                    })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );

  if (noCard) {
    return (
      <>
        <div>{tableContent}</div>
        <ClusterSpecsModal
          open={clusterSpecsOpen}
          onClose={() => setClusterSpecsOpen(false)}
          clusterName={selectedCluster}
        />
      </>
    );
  }

  return (
    <>
      <Card>
        <div className="p-4">{tableContent}</div>
      </Card>
      <ClusterSpecsModal
        open={clusterSpecsOpen}
        onClose={() => setClusterSpecsOpen(false)}
        clusterName={selectedCluster}
      />
    </>
  );
}
