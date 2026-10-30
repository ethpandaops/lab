import type { JSX } from 'react';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';

/**
 * Placeholder for a node page: header card, stats strip, activity strip and chart grid.
 */
export function NodeDetailSkeleton(): JSX.Element {
  return (
    <div className="flex flex-col gap-6">
      <LoadingContainer className="h-40 rounded-sm" />
      <LoadingContainer className="h-20 rounded-sm" />
      <LoadingContainer className="h-28 rounded-sm" />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <LoadingContainer className="h-96 rounded-sm" />
        <LoadingContainer className="h-96 rounded-sm" />
      </div>
    </div>
  );
}
