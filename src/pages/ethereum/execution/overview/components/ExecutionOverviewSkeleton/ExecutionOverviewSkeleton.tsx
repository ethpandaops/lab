import type { JSX } from 'react';
import { Card } from '@/components/Layout/Card';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';

/**
 * Loading skeleton for Execution Overview page
 * Shows 2x2 chart grid with legend placeholders
 */
export function ExecutionOverviewSkeleton(): JSX.Element {
  return (
    <div className="space-y-6">
      {/* 2x2 Chart Grid skeleton */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, chartIndex) => (
          <Card key={chartIndex} rounded>
            <div className="space-y-4 p-4">
              {/* Header with title, subtitle, and expand button */}
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <LoadingContainer className="h-5 w-48 rounded-xs" />
                  <LoadingContainer className="h-3 w-64 rounded-xs" />
                </div>
                <LoadingContainer className="size-6 rounded-xs" />
              </div>

              {/* Legend skeleton - two rows to match actual chart legends */}
              <div className="flex flex-wrap gap-2">
                {/* First row */}
                {Array.from({ length: 4 }).map((_, legendIndex) => (
                  <LoadingContainer key={`row1-${legendIndex}`} className="h-6 w-24 rounded-xs" />
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {/* Second row */}
                {Array.from({ length: 3 }).map((_, legendIndex) => (
                  <LoadingContainer key={`row2-${legendIndex}`} className="h-6 w-28 rounded-xs" />
                ))}
              </div>

              {/* Chart area */}
              <LoadingContainer className="h-[400px] w-full rounded-sm" />

              {/* Zoom slider bar */}
              <LoadingContainer className="h-10 w-full rounded-xs" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
