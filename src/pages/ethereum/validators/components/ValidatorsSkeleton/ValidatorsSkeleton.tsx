import type { JSX } from 'react';
import clsx from 'clsx';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { Card } from '@/components/Layout/Card';

interface ValidatorsSkeletonProps {
  /** Additional class names */
  className?: string;
}

/**
 * Skeleton loading state for the validators page
 */
export function ValidatorsSkeleton({ className }: ValidatorsSkeletonProps): JSX.Element {
  return (
    <div className={clsx('space-y-6', className)}>
      {/* Input section skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Validator input skeleton */}
        <div className="space-y-2">
          <LoadingContainer className="h-5 w-32 rounded-sm" shimmer={false} />
          <LoadingContainer className="h-24 w-full rounded-sm" shimmer={false} />
          <LoadingContainer className="h-4 w-24 rounded-sm" shimmer={false} />
        </div>

        {/* Date range selector skeleton */}
        <div className="space-y-2">
          <LoadingContainer className="h-5 w-24 rounded-sm" shimmer={false} />
          <div className="flex gap-2">
            <LoadingContainer className="h-9 w-16 rounded-sm" shimmer={false} />
            <LoadingContainer className="h-9 w-16 rounded-sm" shimmer={false} />
            <LoadingContainer className="h-9 w-16 rounded-sm" shimmer={false} />
          </div>
          <div className="flex gap-3">
            <LoadingContainer className="h-14 flex-1 rounded-sm" shimmer={false} />
            <LoadingContainer className="h-14 flex-1 rounded-sm" shimmer={false} />
          </div>
        </div>
      </div>

      {/* Analyze button skeleton */}
      <LoadingContainer className="h-10 w-28 rounded-sm" shimmer={false} />

      {/* Threshold config skeleton */}
      <LoadingContainer className="h-12 w-full rounded-sm" shimmer={false} />

      {/* Performance summary skeleton */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="flex flex-col gap-2 p-4">
            <LoadingContainer className="h-4 w-24 rounded-sm" shimmer={false} />
            <LoadingContainer className="h-8 w-20 rounded-sm" shimmer={false} />
            <LoadingContainer className="h-3 w-32 rounded-sm" shimmer={false} />
          </Card>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="rounded-sm border border-border bg-surface">
        {/* Table header */}
        <div className="flex items-center gap-4 border-b border-border px-4 py-3">
          <LoadingContainer className="h-4 w-20 rounded-sm" shimmer={false} />
          <LoadingContainer className="h-4 w-16 rounded-sm" shimmer={false} />
          <LoadingContainer className="h-4 w-12 rounded-sm" shimmer={false} />
          <LoadingContainer className="h-4 w-14 rounded-sm" shimmer={false} />
          <LoadingContainer className="h-4 w-14 rounded-sm" shimmer={false} />
          <LoadingContainer className="h-4 w-16 rounded-sm" shimmer={false} />
          <LoadingContainer className="h-4 w-12 rounded-sm" shimmer={false} />
          <LoadingContainer className="h-4 w-20 rounded-sm" shimmer={false} />
          <LoadingContainer className="h-4 w-16 rounded-sm" shimmer={false} />
        </div>

        {/* Table rows */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-0">
            <LoadingContainer className="h-5 w-16 rounded-sm" shimmer={false} />
            <LoadingContainer className="h-5 w-14 rounded-sm" shimmer={false} />
            <LoadingContainer className="h-5 w-12 rounded-sm" shimmer={false} />
            <LoadingContainer className="h-5 w-12 rounded-sm" shimmer={false} />
            <LoadingContainer className="h-5 w-12 rounded-sm" shimmer={false} />
            <LoadingContainer className="h-5 w-10 rounded-sm" shimmer={false} />
            <LoadingContainer className="h-5 w-12 rounded-sm" shimmer={false} />
            <LoadingContainer className="h-5 w-16 rounded-sm" shimmer={false} />
            <LoadingContainer className="h-5 w-20 rounded-sm" shimmer={false} />
          </div>
        ))}
      </div>
    </div>
  );
}
