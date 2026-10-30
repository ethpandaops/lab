import type { JSX } from 'react';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';

/**
 * Placeholder for the nodes overview: stats strip, map with client list, charts and table.
 */
export function NodesSkeleton(): JSX.Element {
  return (
    <div className="flex flex-col gap-6">
      <LoadingContainer className="h-20 rounded-sm" />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <LoadingContainer className="h-[500px] rounded-sm xl:col-span-2" />
        <LoadingContainer className="h-[500px] rounded-sm" />
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <LoadingContainer className="h-96 rounded-sm" />
        <LoadingContainer className="h-96 rounded-sm" />
      </div>
      <LoadingContainer className="h-[600px] rounded-sm" />
    </div>
  );
}
