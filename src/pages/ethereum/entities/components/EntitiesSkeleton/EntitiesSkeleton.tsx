import type { JSX } from 'react';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { Table } from '@/components/Lists/Table';

/**
 * Loading skeleton for the Entities page
 * Matches the layout of the entities table with search input
 */
export function EntitiesSkeleton(): JSX.Element {
  // Create skeleton data for 20 rows
  const skeletonData = Array.from({ length: 20 }, (_, i) => ({ id: i }));

  return (
    <>
      {/* Search Input Skeleton */}
      <div className="mt-6">
        <LoadingContainer className="h-10 w-full rounded-md" />
        <div className="mt-2 flex items-center justify-between">
          <LoadingContainer className="h-4 w-48 rounded-sm" />
          <LoadingContainer className="h-4 w-40 rounded-sm" />
        </div>
      </div>

      {/* Table Section Skeleton */}
      <div className="mt-6">
        <Table
          variant="nested"
          data={skeletonData}
          columns={[
            {
              header: 'Entity Name',
              accessor: () => <LoadingContainer className="h-5 w-32 rounded-sm" />,
            },
            {
              header: 'Status',
              accessor: () => <LoadingContainer className="h-5 w-20 rounded-sm" />,
            },
            {
              header: 'Validators',
              accessor: () => <LoadingContainer className="h-5 w-16 rounded-sm" />,
            },
            {
              header: 'Online Rate',
              accessor: () => <LoadingContainer className="h-5 w-20 rounded-sm" />,
            },
          ]}
        />
      </div>
    </>
  );
}
