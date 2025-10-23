import type { JSX } from 'react';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { Card } from '@/components/Layout/Card';

export function GeographicalChecklistSkeleton(): JSX.Element {
  return (
    <div className="space-y-6">
      {/* Stats skeleton */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[...Array(5)].map((_, i) => (
          <LoadingContainer key={i} className="h-24 rounded-sm" />
        ))}
      </div>

      {/* Filters skeleton */}
      <Card>
        <div className="space-y-4 p-4">
          <LoadingContainer className="h-10 w-full rounded-sm" />
          <div className="flex gap-4">
            <LoadingContainer className="h-10 w-32 rounded-sm" />
            <LoadingContainer className="h-10 w-32 rounded-sm" />
            <LoadingContainer className="h-10 w-32 rounded-sm" />
          </div>
        </div>
      </Card>

      {/* Globe/List skeleton */}
      <Card>
        <LoadingContainer className="h-[600px] rounded-sm" />
      </Card>
    </div>
  );
}
