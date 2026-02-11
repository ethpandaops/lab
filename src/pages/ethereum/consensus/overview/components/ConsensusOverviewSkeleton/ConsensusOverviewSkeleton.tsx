import type { JSX } from 'react';
import { Card } from '@/components/Layout/Card';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';

/** Single chart card skeleton matching PopoutCard structure */
function ChartCardSkeleton(): JSX.Element {
  return (
    <Card rounded>
      <div className="space-y-4 p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <LoadingContainer className="h-5 w-48 rounded-xs" />
            <LoadingContainer className="h-3 w-64 rounded-xs" />
          </div>
          <LoadingContainer className="size-6 rounded-xs" />
        </div>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <LoadingContainer key={`legend-a-${i}`} className="h-6 w-24 rounded-xs" />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <LoadingContainer key={`legend-b-${i}`} className="h-6 w-28 rounded-xs" />
          ))}
        </div>
        <LoadingContainer className="h-[280px] w-full rounded-sm" />
        <LoadingContainer className="h-10 w-full rounded-xs" />
      </div>
    </Card>
  );
}

/**
 * Loading skeleton for Consensus Overview page.
 * Shows 8 chart card placeholders in a 2-column grid
 * matching the actual page layout.
 */
export function ConsensusOverviewSkeleton(): JSX.Element {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 3xl:grid-cols-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <ChartCardSkeleton key={`skeleton-${i}`} />
      ))}
    </div>
  );
}
