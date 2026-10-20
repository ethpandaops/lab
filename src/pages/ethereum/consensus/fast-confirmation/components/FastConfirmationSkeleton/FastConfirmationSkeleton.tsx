import type { JSX } from 'react';
import { Card } from '@/components/Layout/Card';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';

function ChartCardSkeleton({ height }: { height: string }): JSX.Element {
  return (
    <Card rounded>
      <div className="flex flex-col gap-4 p-4">
        <div className="flex flex-col gap-1">
          <LoadingContainer className="h-5 w-48 rounded-xs" />
          <LoadingContainer className="h-3 w-64 rounded-xs" />
        </div>
        <LoadingContainer className={`${height} w-full rounded-sm`} />
      </div>
    </Card>
  );
}

/**
 * Loading skeleton for the Fast Confirmation page: hero, lattice and chart grid.
 */
export function FastConfirmationSkeleton(): JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      <Card rounded>
        <div className="grid gap-8 p-6 lg:grid-cols-5 lg:p-8">
          <div className="flex flex-col gap-4 lg:col-span-2">
            <LoadingContainer className="h-3 w-40 rounded-xs" />
            <LoadingContainer className="h-16 w-48 rounded-sm" />
            <LoadingContainer className="h-10 w-full rounded-xs" />
            <div className="grid grid-cols-2 gap-3">
              <LoadingContainer className="h-20 rounded-lg" />
              <LoadingContainer className="h-20 rounded-lg" />
            </div>
          </div>
          <LoadingContainer className="h-52 rounded-sm lg:col-span-3" />
        </div>
      </Card>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCardSkeleton height="h-96" />
        <ChartCardSkeleton height="h-96" />
        <ChartCardSkeleton height="h-72" />
        <ChartCardSkeleton height="h-72" />
      </div>
    </div>
  );
}
