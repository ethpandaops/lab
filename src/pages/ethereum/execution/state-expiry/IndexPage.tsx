import type { JSX } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/20/solid';
import { Container } from '@/components/Layout/Container';
import { Card } from '@/components/Layout/Card';
import { useStorageSlotStateDaily } from './hooks';
import {
  StateExpirySkeleton,
  StorageSummaryCards,
  StorageExpiryChart,
  TopAddressesByStorage,
  TopContractsByExpiredStorage,
} from './components';

export function IndexPage(): JSX.Element {
  const { data, latestData, isLoading, error, isMockData } = useStorageSlotStateDaily();

  return (
    <Container>
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl/tight font-bold text-foreground">State Expiry</h1>
          <p className="mt-1 text-muted">Track Ethereum execution layer state expiry metrics (6-month inactivity)</p>
        </div>
      </div>

      {/* Mock Data Banner */}
      {isMockData && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <ExclamationTriangleIcon className="size-5 shrink-0 text-amber-500" />
          <div>
            <p className="text-sm font-medium text-amber-400">Displaying Mock Data</p>
            <p className="text-xs text-amber-400/70">
              Real API data is not yet available. The visualizations below use simulated data for demonstration
              purposes.
            </p>
          </div>
        </div>
      )}

      {isLoading && <StateExpirySkeleton />}

      {error && (
        <Card rounded className="p-6">
          <p className="text-danger">Failed to load state expiry data: {error.message}</p>
        </Card>
      )}

      {data && latestData && (
        <div className="space-y-6">
          {/* Summary Cards: Total vs Expired Storage */}
          <StorageSummaryCards data={latestData} />

          {/* Cumulative Storage Chart Over Time */}
          <StorageExpiryChart data={data} />

          {/* Top 10 Tables - Side by Side on Large Screens */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <TopAddressesByStorage />
            <TopContractsByExpiredStorage />
          </div>
        </div>
      )}
    </Container>
  );
}
