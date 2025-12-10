import type { JSX } from 'react';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { Card } from '@/components/Layout/Card';

/**
 * Loading skeleton for the State Size page.
 * Matches the layout: Hero total -> 3 metric cards -> Chart
 */
export function StateSizeSkeleton(): JSX.Element {
  return (
    <div className="space-y-6">
      {/* Hero: Total State Size skeleton */}
      <div className="flex flex-col gap-1">
        <LoadingContainer className="h-3 w-28 rounded-xs" />
        <div className="mt-1 flex flex-wrap items-baseline gap-4">
          <LoadingContainer className="h-12 w-40 rounded-xs" />
          <div className="flex items-center gap-3">
            <LoadingContainer className="h-7 w-24 rounded-xs" />
            <LoadingContainer className="h-5 w-16 rounded-xs" />
          </div>
        </div>
        <LoadingContainer className="mt-2 h-3 w-48 rounded-xs" />
      </div>

      {/* Metric cards skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-4">
            <LoadingContainer className="mb-2 h-3 w-24 rounded-xs" />
            <LoadingContainer className="mb-1 h-7 w-28 rounded-xs" />
            <LoadingContainer className="mb-3 h-4 w-36 rounded-xs" />
            <div className="flex items-center gap-2">
              <LoadingContainer className="h-5 w-20 rounded-xs" />
              <LoadingContainer className="h-4 w-14 rounded-xs" />
            </div>
          </Card>
        ))}
      </div>

      {/* Chart card skeleton */}
      <Card className="p-6">
        {/* Title and subtitle */}
        <div className="mb-4">
          <LoadingContainer className="mb-2 h-6 w-48 rounded-xs" />
          <LoadingContainer className="h-4 w-80 rounded-xs" />
        </div>

        {/* Legend skeleton */}
        <div className="mb-4 border-b border-border pb-4">
          <LoadingContainer className="mb-2 h-4 w-16 rounded-xs" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <LoadingContainer key={i} className="h-7 w-28 rounded-xs" />
            ))}
          </div>
        </div>

        {/* Chart area skeleton */}
        <div className="relative h-[480px]">
          {/* Y-axis labels */}
          <div className="absolute top-0 left-0 flex h-full w-12 flex-col justify-between py-8">
            {Array.from({ length: 5 }).map((_, i) => (
              <LoadingContainer key={i} className="h-3 w-10 rounded-xs" />
            ))}
          </div>

          {/* Chart plot area */}
          <div className="mr-4 ml-14 h-full">
            <div className="relative h-[calc(100%-60px)]">
              <LoadingContainer className="absolute top-[20%] left-0 h-0.5 w-full rounded-xs" />
              <LoadingContainer className="absolute top-[40%] left-0 h-0.5 w-full rounded-xs" />
              <LoadingContainer className="absolute top-[60%] left-0 h-0.5 w-full rounded-xs" />
              <LoadingContainer className="absolute top-[80%] left-0 h-0.5 w-full rounded-xs" />
            </div>

            {/* X-axis labels */}
            <div className="mt-4 flex justify-between">
              {Array.from({ length: 6 }).map((_, i) => (
                <LoadingContainer key={i} className="h-3 w-16 rounded-xs" />
              ))}
            </div>

            {/* Zoom slider skeleton */}
            <div className="mt-4">
              <LoadingContainer className="h-5 w-full rounded-xs" />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
