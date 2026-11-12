import type { JSX } from 'react';
import { Card } from '@/components/Layout/Card';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';

/** Chart heights, in page order: a taller lead chart, then the rest of the stack */
const CHART_HEIGHTS = [320, 200, 200, 200, 200, 200, 200, 200, 200];

/**
 * Loading skeleton for the Consensus Overview page: the same single-column stack of chart cards, so the
 * layout does not shift when data arrives.
 */
export function ConsensusOverviewSkeleton(): JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      {CHART_HEIGHTS.map((height, index) => (
        <Card key={index} header={<LoadingContainer className="h-6 w-48" />}>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 4 }).map((_, legendIndex) => (
                <LoadingContainer key={legendIndex} className="h-5 w-20" />
              ))}
            </div>
            <div style={{ height }}>
              <LoadingContainer className="size-full" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
