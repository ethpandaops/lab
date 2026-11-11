import type { JSX, ReactNode } from 'react';
import { Card } from '@/components/Layout/Card';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';

/**
 * `count` copies of a placeholder, as siblings. Placeholders have no identity to key a list by, so each copy renders
 * the rest after it instead of being mapped.
 */
function Repeat({ count, children }: { count: number; children: ReactNode }): JSX.Element | null {
  if (count <= 0) return null;
  return (
    <>
      {children}
      <Repeat count={count - 1}>{children}</Repeat>
    </>
  );
}

/** A strip of stat cells */
function StatsSkeleton({ count = 6 }: { count?: number }): JSX.Element {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-border bg-border lg:grid-cols-3 2xl:grid-cols-6">
      <Repeat count={count}>
        <div className="flex flex-col gap-2 bg-surface px-4 py-3.5 sm:px-5">
          <LoadingContainer className="h-3 w-24 rounded-xs" />
          <LoadingContainer className="h-7 w-20 rounded-xs" />
          <LoadingContainer className="h-3 w-32 rounded-xs" />
        </div>
      </Repeat>
    </div>
  );
}

/** A card holding a table of `rows` rows */
export function TableCardSkeleton({ rows = 8 }: { rows?: number }): JSX.Element {
  return (
    <Card rounded>
      <div className="flex flex-col gap-3">
        <LoadingContainer className="h-5 w-40 rounded-xs" />
        <Repeat count={rows}>
          <div className="flex items-center gap-4">
            <LoadingContainer className="size-5 rounded-xs" />
            <LoadingContainer className="h-4 w-28 rounded-xs" />
            <LoadingContainer className="h-2 flex-1 rounded-xs" />
            <LoadingContainer className="h-4 w-16 rounded-xs" />
          </div>
        </Repeat>
      </div>
    </Card>
  );
}

/** A card holding a chart */
function ChartCardSkeleton(): JSX.Element {
  return (
    <Card rounded>
      <div className="flex flex-col gap-4">
        <LoadingContainer className="h-5 w-48 rounded-xs" />
        <LoadingContainer className="h-72 w-full rounded-sm" />
      </div>
    </Card>
  );
}

/**
 * Loading skeleton for the network overview: the nodes chart, then the sync and history charts.
 */
export function NetworkSkeleton(): JSX.Element {
  return (
    <div className="flex flex-col gap-6">
      <ChartCardSkeleton />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCardSkeleton />
        <ChartCardSkeleton />
        <ChartCardSkeleton />
        <ChartCardSkeleton />
      </div>
    </div>
  );
}

/**
 * Loading skeleton for a country or network page: its stats, its peers over time and its clients.
 */
export function PlaceSkeleton(): JSX.Element {
  return (
    <div className="flex flex-col gap-6">
      <StatsSkeleton count={4} />
      <ChartCardSkeleton />
      <TableCardSkeleton rows={7} />
    </div>
  );
}
