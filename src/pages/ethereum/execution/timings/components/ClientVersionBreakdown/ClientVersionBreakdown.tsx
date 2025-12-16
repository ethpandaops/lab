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
  median_duration_ms?: number;
  p95_duration_ms?: number;
  avg_returned_count?: number;
}

export interface ClientVersionBreakdownProps {
  /** Raw per-slot data with client/version info */
  data: ClientVersionData[];
  /** Title for the card */
  title?: string;
  /** Description for the card */
  description?: string;
  /** Whether to show average blob count column (for getBlobs data) */
  showBlobCount?: boolean;
}

interface AggregatedRow {
  client: string;
  version: string;
  medianDuration: number;
  p95Duration: number;
  observations: number;
  avgBlobCount?: number;
}

type SortField = 'client' | 'version' | 'medianDuration' | 'p95Duration' | 'observations' | 'avgBlobCount';
type SortDirection = 'asc' | 'desc';

/**
 * Displays a breakdown of execution client performance by client and version
 */
export function ClientVersionBreakdown({
  data,
  title = 'Client Version Breakdown',
  description = 'Duration statistics by execution client and version',
  showBlobCount = false,
}: ClientVersionBreakdownProps): JSX.Element {
  const [sortField, setSortField] = useState<SortField>('observations');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Aggregate data by client + version
  const aggregatedData = useMemo(() => {
    const map = new Map<
      string,
      {
        client: string;
        version: string;
        totalWeightedMedian: number;
        maxP95: number;
        totalObservations: number;
        totalWeightedBlobCount: number;
      }
    >();

    data.forEach(row => {
      const client = (row.meta_execution_implementation ?? 'unknown').toLowerCase();
      const version = row.meta_execution_version ?? 'unknown';
      const key = `${client}|${version}`;
      const obs = row.observation_count ?? 0;

      const existing = map.get(key);
      if (existing) {
        existing.totalWeightedMedian += (row.median_duration_ms ?? 0) * obs;
        existing.maxP95 = Math.max(existing.maxP95, row.p95_duration_ms ?? 0);
        existing.totalObservations += obs;
        existing.totalWeightedBlobCount += (row.avg_returned_count ?? 0) * obs;
      } else {
        map.set(key, {
          client,
          version,
          totalWeightedMedian: (row.median_duration_ms ?? 0) * obs,
          maxP95: row.p95_duration_ms ?? 0,
          totalObservations: obs,
          totalWeightedBlobCount: (row.avg_returned_count ?? 0) * obs,
        });
      }
    });

    // Convert to final format
    const result: AggregatedRow[] = [];
    map.forEach(entry => {
      if (entry.totalObservations > 0) {
        result.push({
          client: entry.client,
          version: entry.version,
          medianDuration: entry.totalWeightedMedian / entry.totalObservations,
          p95Duration: entry.maxP95,
          observations: entry.totalObservations,
          avgBlobCount: entry.totalWeightedBlobCount / entry.totalObservations,
        });
      }
    });

    return result;
  }, [data]);

  // Calculate max median for color scaling
  const maxMedianDuration = useMemo(() => {
    return Math.max(...aggregatedData.map(r => r.medianDuration), 0);
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
        case 'medianDuration':
          comparison = a.medianDuration - b.medianDuration;
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
    return (
      <Card>
        <div className="p-4">
          <h4 className="mb-2 text-base font-semibold text-foreground">{title}</h4>
          <p className="mb-4 text-sm text-muted">{description}</p>
          <div className="flex h-[200px] items-center justify-center text-muted">No client version data available</div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-4">
        <h4 className="mb-2 text-base font-semibold text-foreground">{title}</h4>
        <p className="mb-4 text-sm text-muted">{description}</p>

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
                <th className={clsx(headerClass, 'text-right')} onClick={() => handleSort('medianDuration')}>
                  Median
                  <SortIcon field="medianDuration" />
                </th>
                <th className={clsx(headerClass, 'text-right')} onClick={() => handleSort('p95Duration')}>
                  P95
                  <SortIcon field="p95Duration" />
                </th>
                {showBlobCount && (
                  <th className={clsx(headerClass, 'text-right')} onClick={() => handleSort('avgBlobCount')}>
                    Avg Blobs
                    <SortIcon field="avgBlobCount" />
                  </th>
                )}
                <th className={clsx(headerClass, 'pr-4 text-right')} onClick={() => handleSort('observations')}>
                  Observations
                  <SortIcon field="observations" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {sortedData.map((row, index) => (
                <tr key={`${row.client}-${row.version}-${index}`} className="transition-colors hover:bg-background">
                  <td className="py-3 pr-3 pl-4">
                    <div className="flex items-center gap-2">
                      <ClientLogo client={row.client} size={20} />
                      <span className="text-sm font-medium text-foreground">{row.client}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className="font-mono text-sm text-muted">{row.version}</span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span
                      className={clsx(
                        'text-sm font-medium',
                        getDurationColorClass(row.medianDuration, maxMedianDuration)
                      )}
                    >
                      {row.medianDuration.toFixed(0)} ms
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className="text-sm text-muted">{row.p95Duration.toFixed(0)} ms</span>
                  </td>
                  {showBlobCount && (
                    <td className="px-3 py-3 text-right">
                      <span className="text-sm text-muted">{(row.avgBlobCount ?? 0).toFixed(1)}</span>
                    </td>
                  )}
                  <td className="py-3 pr-4 pl-3 text-right">
                    <span className="text-sm text-muted">{row.observations.toLocaleString()}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}
