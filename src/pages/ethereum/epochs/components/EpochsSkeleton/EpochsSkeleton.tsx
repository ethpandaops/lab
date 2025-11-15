import type { JSX } from 'react';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { Table } from '@/components/Lists/Table';

/**
 * Loading skeleton for the Epochs page
 * Matches the layout of the epochs table and metrics chart
 */
export function EpochsSkeleton(): JSX.Element {
  // Create skeleton data for 10 rows
  const skeletonData = Array.from({ length: 10 }, (_, i) => ({ id: i }));

  return (
    <>
      {/* Table Section Skeleton */}
      <div className="mt-6">
        <Table
          variant="nested"
          data={skeletonData}
          columns={[
            {
              header: 'Epoch',
              accessor: () => <LoadingContainer className="h-5 w-20 rounded-sm" />,
            },
            {
              header: 'Start Time',
              accessor: () => <LoadingContainer className="h-5 w-36 rounded-sm" />,
            },
            {
              header: 'Relative Time',
              accessor: () => <LoadingContainer className="h-5 w-24 rounded-sm" />,
            },
            {
              header: 'Blocks',
              accessor: () => <LoadingContainer className="h-5 w-16 rounded-sm" />,
            },
            {
              header: 'Missed Blocks',
              accessor: () => <LoadingContainer className="h-5 w-8 rounded-sm" />,
            },
            {
              header: 'Participation %',
              accessor: () => <LoadingContainer className="h-5 w-20 rounded-sm" />,
            },
          ]}
        />

        {/* Helper text skeleton */}
        <div className="mt-4">
          <LoadingContainer className="h-4 w-96 rounded-sm" />
        </div>
      </div>

      {/* Metrics Section Skeleton */}
      <div id="metrics" className="mt-8">
        {/* Section header */}
        <div className="mb-4">
          <LoadingContainer className="h-7 w-24 rounded-sm" />
        </div>

        {/* Chart card */}
        <div className="rounded-lg border border-border bg-surface p-6">
          {/* Chart header */}
          <div className="mb-4 flex items-start justify-between">
            <div className="space-y-2">
              <LoadingContainer className="h-6 w-40 rounded-sm" />
              <LoadingContainer className="h-4 w-56 rounded-sm" />
            </div>
            <div className="flex gap-2">
              <LoadingContainer className="size-8 rounded-sm" />
              <LoadingContainer className="size-8 rounded-sm" />
            </div>
          </div>

          {/* Legend */}
          <div className="mb-4 flex flex-wrap gap-2">
            {[...Array(12)].map((_, i) => (
              <LoadingContainer key={i} className="h-6 w-24 rounded-full" />
            ))}
          </div>

          {/* Chart area */}
          <LoadingContainer className="h-[400px] rounded-sm" />
        </div>
      </div>
    </>
  );
}
