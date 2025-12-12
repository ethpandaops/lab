import type { JSX } from 'react';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { Card } from '@/components/Layout/Card';

export function StateExpirySkeleton(): JSX.Element {
  return (
    <div className="space-y-6">
      {/* Hero skeleton */}
      <div className="flex flex-col gap-1">
        <LoadingContainer className="h-3 w-28 rounded-xs" />
        <div className="mt-1 flex flex-wrap items-baseline gap-4">
          <LoadingContainer className="h-12 w-40 rounded-xs" />
          <div className="flex items-center gap-3">
            <LoadingContainer className="h-7 w-24 rounded-xs" />
            <LoadingContainer className="h-5 w-16 rounded-xs" />
          </div>
        </div>
      </div>

      {/* Metric cards skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-4">
            <LoadingContainer className="mb-2 h-3 w-24 rounded-xs" />
            <LoadingContainer className="mb-1 h-7 w-28 rounded-xs" />
            <LoadingContainer className="h-4 w-36 rounded-xs" />
          </Card>
        ))}
      </div>

      {/* Chart card skeleton */}
      <Card className="p-6">
        <div className="mb-4">
          <LoadingContainer className="mb-2 h-6 w-48 rounded-xs" />
          <LoadingContainer className="h-4 w-80 rounded-xs" />
        </div>
        <div className="h-[400px]">
          <LoadingContainer className="h-full w-full rounded-xs" />
        </div>
      </Card>
    </div>
  );
}
