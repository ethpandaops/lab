import type { JSX } from 'react';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';

/** One cell of the stats strip: label, value and note */
function StatSkeleton(): JSX.Element {
  return (
    <div className="flex flex-col gap-2 px-4 py-3.5 shadow-divider sm:px-5">
      <LoadingContainer className="h-4 w-24 rounded-xs" shimmer={false} />
      <LoadingContainer className="h-8 w-20 rounded-xs" shimmer={false} />
      <LoadingContainer className="h-3 w-28 rounded-xs" shimmer={false} />
    </div>
  );
}

/**
 * Loading skeleton for the entities overview: stats strip, stake share chart, two cards and the table
 */
export function EntitiesSkeleton(): JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 overflow-hidden rounded-sm bg-surface outline -outline-offset-1 outline-border md:grid-cols-3 xl:grid-cols-6">
        <StatSkeleton />
        <StatSkeleton />
        <StatSkeleton />
        <StatSkeleton />
        <StatSkeleton />
        <StatSkeleton />
      </div>
      <LoadingContainer className="h-115 w-full rounded-sm" shimmer={false} />
      <div className="grid gap-4 xl:grid-cols-2">
        <LoadingContainer className="h-96 w-full rounded-sm" shimmer={false} />
        <LoadingContainer className="h-96 w-full rounded-sm" shimmer={false} />
      </div>
      <LoadingContainer className="h-150 w-full rounded-sm" shimmer={false} />
    </div>
  );
}
