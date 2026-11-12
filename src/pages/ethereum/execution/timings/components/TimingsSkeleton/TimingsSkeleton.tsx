import type { JSX } from 'react';
import { Card } from '@/components/Layout/Card';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';

/**
 * Loading skeleton for engine timings page
 * Mirrors the structure of the Overview tab with stats and charts
 */
export function TimingsSkeleton(): JSX.Element {
  return (
    <div className="space-y-6">
      {/* Time range selector skeleton */}
      <div className="flex items-center gap-4">
        <LoadingContainer className="h-4 w-20 rounded-xs" />
        <div className="flex gap-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <LoadingContainer key={index} className="h-8 w-20 rounded-xs" />
          ))}
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="flex gap-4 border-b border-border pb-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <LoadingContainer key={index} className="h-6 w-24 rounded-xs" />
        ))}
      </div>

      {/* Stats grid skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <div className="space-y-2 p-4">
              <LoadingContainer className="h-3 w-20 rounded-xs" />
              <LoadingContainer className="h-8 w-24 rounded-sm" />
              <LoadingContainer className="h-3 w-16 rounded-xs" />
            </div>
          </Card>
        ))}
      </div>

      {/* Chart skeletons */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Duration trend chart skeleton */}
        <Card>
          <div className="space-y-4 p-4">
            <div className="flex items-center justify-between">
              <LoadingContainer className="h-5 w-32 rounded-xs" />
              <LoadingContainer className="h-4 w-24 rounded-xs" />
            </div>
            <LoadingContainer className="h-64 w-full rounded-sm" />
          </div>
        </Card>

        {/* Status distribution chart skeleton */}
        <Card>
          <div className="space-y-4 p-4">
            <div className="flex items-center justify-between">
              <LoadingContainer className="h-5 w-36 rounded-xs" />
              <LoadingContainer className="h-4 w-24 rounded-xs" />
            </div>
            <LoadingContainer className="h-64 w-full rounded-sm" />
          </div>
        </Card>
      </div>

      {/* Additional chart skeleton */}
      <Card>
        <div className="space-y-4 p-4">
          <div className="flex items-center justify-between">
            <LoadingContainer className="h-5 w-40 rounded-xs" />
            <LoadingContainer className="h-4 w-20 rounded-xs" />
          </div>
          <LoadingContainer className="h-72 w-full rounded-sm" />
        </div>
      </Card>
    </div>
  );
}
