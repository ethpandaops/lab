import type { JSX } from 'react';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';

/**
 * Loading skeleton for the entities overview: stats strip, stake share chart, two cards and the table
 */
export function EntitiesSkeleton(): JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 overflow-hidden rounded-sm bg-surface outline -outline-offset-1 outline-border md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-2 px-4 py-3.5 shadow-[1px_0_0_0_var(--color-border),0_1px_0_0_var(--color-border)] sm:px-5"
          >
            <LoadingContainer className="h-4 w-24 rounded-xs" shimmer={false} />
            <LoadingContainer className="h-8 w-20 rounded-xs" shimmer={false} />
            <LoadingContainer className="h-3 w-28 rounded-xs" shimmer={false} />
          </div>
        ))}
      </div>
      <LoadingContainer className="h-[460px] w-full rounded-sm" shimmer={false} />
      <div className="grid gap-4 xl:grid-cols-2">
        <LoadingContainer className="h-96 w-full rounded-sm" shimmer={false} />
        <LoadingContainer className="h-96 w-full rounded-sm" shimmer={false} />
      </div>
      <LoadingContainer className="h-[600px] w-full rounded-sm" shimmer={false} />
    </div>
  );
}
