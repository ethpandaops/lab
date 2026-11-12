import type { JSX } from 'react';
import { Card } from '@/components/Layout/Card';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';

/** Chart card placeholder matching the PopoutCard layout */
function ChartCardSkeleton(): JSX.Element {
  return (
    <Card rounded>
      <div className="flex flex-col gap-4 p-4">
        <div className="flex flex-col gap-1">
          <LoadingContainer className="h-5 w-48 rounded-xs" />
          <LoadingContainer className="h-3 w-64 rounded-xs" />
        </div>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <LoadingContainer key={`legend-${i}`} className="h-6 w-24 rounded-xs" />
          ))}
        </div>
        <LoadingContainer className="h-72 w-full rounded-sm" />
      </div>
    </Card>
  );
}

/** Layer table placeholder matching LayerClients: a row per client with two share bars */
function LayerSkeleton(): JSX.Element {
  return (
    <Card rounded>
      <div className="flex flex-col gap-3 p-4">
        <LoadingContainer className="h-5 w-40 rounded-xs" />
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={`row-${i}`} className="flex items-center gap-4">
            <LoadingContainer className="size-5 rounded-xs" />
            <LoadingContainer className="h-4 w-24 rounded-xs" />
            <LoadingContainer className="h-2 flex-1 rounded-xs" />
            <LoadingContainer className="h-2 flex-1 rounded-xs" />
            <LoadingContainer className="h-4 w-20 rounded-xs" />
          </div>
        ))}
      </div>
    </Card>
  );
}

/**
 * Loading skeleton for the clients overview: a layer table and its two share charts.
 */
export function ClientsSkeleton(): JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      <LayerSkeleton />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCardSkeleton />
        <ChartCardSkeleton />
      </div>
    </div>
  );
}
