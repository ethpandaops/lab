import type { JSX } from 'react';
import { Card } from '@/components/Layout/Card';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';

/** A chart card placeholder: its header, four legend entries and a chart `height` pixels tall */
function ChartCardSkeleton({ height }: { height: number }): JSX.Element {
  return (
    <Card header={<LoadingContainer className="h-6 w-48" />}>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <LoadingContainer className="h-5 w-20" />
          <LoadingContainer className="h-5 w-20" />
          <LoadingContainer className="h-5 w-20" />
          <LoadingContainer className="h-5 w-20" />
        </div>
        <div style={{ height }}>
          <LoadingContainer className="size-full" />
        </div>
      </div>
    </Card>
  );
}

/**
 * Loading skeleton for the Consensus Overview page: the same single-column stack of chart cards, so the
 * layout does not shift when data arrives.
 */
export function ConsensusOverviewSkeleton(): JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      {/* A taller lead chart, then the rest of the stack */}
      <ChartCardSkeleton height={320} />
      <ChartCardSkeleton height={200} />
      <ChartCardSkeleton height={200} />
      <ChartCardSkeleton height={200} />
      <ChartCardSkeleton height={200} />
      <ChartCardSkeleton height={200} />
      <ChartCardSkeleton height={200} />
      <ChartCardSkeleton height={200} />
      <ChartCardSkeleton height={200} />
    </div>
  );
}
