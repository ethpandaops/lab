import type { JSX } from 'react';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { Card } from '@/components/Layout/Card';

/**
 * Loading skeleton for the State Growth page.
 * Matches the layout: Stats row (Total + 3 cards) -> Main Chart
 */
export function StateSizeSkeleton(): JSX.Element {
  return (
    <div className="space-y-6">
      {/* Stats Row: Total State Size + Metric Cards */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-12">
        {/* Total State Size - text-xs label, text-6xl value, text-sm delta */}
        <div className="flex shrink-0 flex-col justify-center">
          <LoadingContainer className="h-3 w-32 rounded-xs" />
          <LoadingContainer className="mt-1 h-16 w-56 rounded-xs" />
          <div className="mt-2 flex items-center gap-3">
            <LoadingContainer className="h-8 w-28 rounded-xs" />
            <LoadingContainer className="h-5 w-16 rounded-xs" />
          </div>
        </div>

        {/* Metric Cards - text-xs label, text-2xl value, text-xs delta, text-sm info */}
        <div className="grid min-w-0 flex-1 grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} rounded className="p-3">
              <LoadingContainer className="h-3 w-24 rounded-xs" />
              <LoadingContainer className="mt-1 h-8 w-28 rounded-xs" />
              <div className="mt-1.5 flex items-center gap-2">
                <LoadingContainer className="h-5 w-20 rounded-xs" />
                <LoadingContainer className="h-4 w-16 rounded-xs" />
              </div>
              <LoadingContainer className="mt-1.5 h-5 w-full rounded-xs" />
            </Card>
          ))}
        </div>
      </div>

      {/* Main Chart */}
      <Card rounded className="p-6">
        <div className="mb-4">
          <LoadingContainer className="h-5 w-48 rounded-xs" />
          <LoadingContainer className="mt-2 h-4 w-72 rounded-xs" />
        </div>
        <LoadingContainer className="h-[480px] w-full rounded-xs" />
      </Card>
    </div>
  );
}
