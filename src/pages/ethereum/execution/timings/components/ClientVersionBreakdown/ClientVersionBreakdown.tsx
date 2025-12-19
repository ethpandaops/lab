import type { JSX } from 'react';
import { useState, useMemo } from 'react';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { Card } from '@/components/Layout/Card';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';

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

type SortField = 'client' | 'version' | 'avgDuration' | 'p50Duration' | 'p95Duration' | 'observations' | 'avgBlobCount';
type SortDirection = 'asc' | 'desc';

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
}: ClientVersionBreakdownProps): JSX.Element {
  // Default sort by avgDuration (ascending = fastest first) when observations hidden, otherwise by observations
  const [sortField, setSortField] = useState<SortField>(hideObservations ? 'avgDuration' : 'observations');
  const [sortDirection, setSortDirection] = useState<SortDirection>(hideObservations ? 'asc' : 'desc');

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
    const map = new Map<
      string,
      {
        client: string;
        version: string;
        totalWeightedAvg: number;
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

      const existing = map.get(key);
      if (existing) {
        existing.totalWeightedAvg += (row.avg_duration_ms ?? 0) * obs;
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
          minDuration: minDur,
          maxDuration: maxDur,
          totalObservations: obs,
          totalWeightedBlobCount: (row.avg_returned_count ?? 0) * obs,
        });
      }
    });

    // Convert to final format (no p50/p95 without hourly data)
    const result: AggregatedRow[] = [];
    map.forEach(entry => {
      if (entry.totalObservations > 0) {
        result.push({
          client: entry.client,
          version: entry.version,
          avgDuration: entry.totalWeightedAvg / entry.totalObservations,
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
  }, [data, hasHourlyData, hourlyAggregatedData]);

  // Calculate max avg duration for color scaling
  const maxAvgDuration = useMemo(() => {
    return Math.max(...aggregatedData.map(r => r.avgDuration), 0);
  }, [aggregatedData]);

  // Sort data
  const sortedData = useMemo(() => {
    return [...aggregatedData].sort((a, b) => {
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
  }, [aggregatedData, sortField, sortDirection]);

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
            {sortedData.map((row, index) => (
              <tr key={`${row.client}-${row.version}-${index}`} className="transition-colors hover:bg-background">
                <td className="py-3 pr-3 pl-4">
                  <div className="flex items-center gap-2" title={row.client}>
                    <ClientLogo client={row.client} size={compactClient ? 24 : 20} />
                    {!compactClient && <span className="text-sm font-medium text-foreground">{row.client}</span>}
                  </div>
                </td>
                <td className="px-3 py-3">
                  <span className="font-mono text-sm text-muted">{row.version}</span>
                </td>
                <td className="px-3 py-3 text-right">
                  {row.avgDuration > 0 ? (
                    <span
                      className={clsx('text-sm font-medium', getDurationColorClass(row.avgDuration, maxAvgDuration))}
                    >
                      {row.avgDuration.toFixed(1)}
                    </span>
                  ) : (
                    <span className="text-sm text-muted">-</span>
                  )}
                </td>
                {hasHourlyData && (
                  <td className="px-3 py-3 text-right">
                    {row.p50Duration > 0 ? (
                      <span
                        className={clsx('text-sm font-medium', getDurationColorClass(row.p50Duration, maxAvgDuration))}
                      >
                        {row.p50Duration.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-sm text-muted">-</span>
                    )}
                  </td>
                )}
                {hasHourlyData && (
                  <td className="px-3 py-3 text-right">
                    {row.p95Duration > 0 ? (
                      <span
                        className={clsx('text-sm font-medium', getDurationColorClass(row.p95Duration, maxAvgDuration))}
                      >
                        {row.p95Duration.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-sm text-muted">-</span>
                    )}
                  </td>
                )}
                {!hideRange && (
                  <td className="px-3 py-3 text-right">
                    {row.maxDuration > 0 ? (
                      <span className="text-sm text-muted">
                        {row.minDuration.toFixed(0)} – {row.maxDuration.toFixed(0)} ms
                      </span>
                    ) : (
                      <span className="text-sm text-muted">-</span>
                    )}
                  </td>
                )}
                {showBlobCount && (
                  <td className="px-3 py-3 text-right">
                    <span className="text-sm text-muted">{(row.avgBlobCount ?? 0).toFixed(1)}</span>
                  </td>
                )}
                {!hideObservations && (
                  <td className="py-3 pr-4 pl-3 text-right">
                    <span className="text-sm text-muted">{row.observations.toLocaleString()}</span>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );

  if (noCard) {
    return <div>{tableContent}</div>;
  }

  return (
    <Card>
      <div className="p-4">{tableContent}</div>
    </Card>
  );
}
