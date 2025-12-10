import type { JSX } from 'react';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { Card } from '@/components/Layout/Card';

/**
 * Loading skeleton for the State Size page.
 * Matches the layout: chart (left) + stats sidebar (right) + delta cards (bottom).
 */
export function StateSizeSkeleton(): JSX.Element {
  return (
    <div className="space-y-6">
      {/* Main content: Chart (left) + Stats sidebar (right) */}
      <div className="flex flex-col gap-6 xl:flex-row">
        {/* Chart card skeleton */}
        <Card className="min-w-0 flex-1 p-6">
          {/* Title and subtitle */}
          <div className="mb-4">
            <LoadingContainer className="mb-2 h-6 w-48 rounded-xs" />
            <LoadingContainer className="h-4 w-72 rounded-xs" />
          </div>

          {/* Legend skeleton - series toggles */}
          <div className="mb-4 border-b border-border pb-4">
            <LoadingContainer className="mb-2 h-4 w-16 rounded-xs" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <LoadingContainer key={i} className="h-7 w-28 rounded-xs" />
              ))}
            </div>
          </div>

          {/* Chart area skeleton */}
          <div className="relative h-[500px]">
            {/* Y-axis labels */}
            <div className="absolute top-0 left-0 flex h-full w-12 flex-col justify-between py-8">
              {Array.from({ length: 5 }).map((_, i) => (
                <LoadingContainer key={i} className="h-3 w-10 rounded-xs" />
              ))}
            </div>

            {/* Chart plot area */}
            <div className="mr-4 ml-14 h-full">
              {/* Fake chart lines */}
              <div className="relative h-[calc(100%-60px)]">
                <LoadingContainer className="absolute top-[20%] left-0 h-0.5 w-full rounded-xs" />
                <LoadingContainer className="absolute top-[35%] left-0 h-0.5 w-full rounded-xs" />
                <LoadingContainer className="absolute top-[50%] left-0 h-0.5 w-full rounded-xs" />
                <LoadingContainer className="absolute top-[65%] left-0 h-0.5 w-full rounded-xs" />
                <LoadingContainer className="absolute top-[80%] left-0 h-0.5 w-full rounded-xs" />
              </div>

              {/* X-axis labels */}
              <div className="mt-4 flex justify-between">
                {Array.from({ length: 6 }).map((_, i) => (
                  <LoadingContainer key={i} className="h-3 w-16 rounded-xs" />
                ))}
              </div>

              {/* Zoom slider skeleton */}
              <div className="mt-4">
                <LoadingContainer className="h-5 w-full rounded-xs" />
              </div>
            </div>
          </div>
        </Card>

        {/* Right sidebar - stacked stat cards skeleton */}
        <div className="flex w-full shrink-0 flex-col gap-4 xl:w-64">
          {/* Total State Size - larger */}
          <Card className="p-4">
            <LoadingContainer className="mb-2 h-3 w-24 rounded-xs" />
            <LoadingContainer className="h-9 w-32 rounded-xs" />
          </Card>

          {/* Accounts, Storage Slots, Contract Codes */}
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-4">
              <LoadingContainer className="mb-2 h-3 w-24 rounded-xs" />
              <LoadingContainer className="mb-1 h-6 w-28 rounded-xs" />
              <LoadingContainer className="h-4 w-32 rounded-xs" />
            </Card>
          ))}
        </div>
      </div>

      {/* Delta cards skeleton - bottom section */}
      <Card className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          {/* Vertical timeframe toggle skeleton */}
          <div className="flex shrink-0 flex-col gap-1 rounded-md border border-border bg-surface/50 p-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <LoadingContainer key={i} className="h-7 w-10 rounded-xs" />
            ))}
          </div>

          {/* Main content skeleton */}
          <div className="min-w-0 flex-1 space-y-4">
            {/* Total State Changes header skeleton */}
            <div>
              <div className="flex flex-wrap items-baseline gap-2">
                <LoadingContainer className="h-4 w-32 rounded-xs" />
                <LoadingContainer className="h-6 w-20 rounded-xs" />
                <LoadingContainer className="h-4 w-16 rounded-xs" />
              </div>
              <LoadingContainer className="mt-1 h-3 w-48 rounded-xs" />
            </div>

            {/* Delta cards row skeleton */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="p-4">
                  <LoadingContainer className="mb-2 h-3 w-20 rounded-xs" />
                  <LoadingContainer className="mb-1 h-6 w-24 rounded-xs" />
                  <LoadingContainer className="mb-2 h-3 w-12 rounded-xs" />
                  <div className="mt-2 border-t border-border/50 pt-2">
                    <LoadingContainer className="mb-1 h-4 w-20 rounded-xs" />
                    <LoadingContainer className="h-3 w-16 rounded-xs" />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
