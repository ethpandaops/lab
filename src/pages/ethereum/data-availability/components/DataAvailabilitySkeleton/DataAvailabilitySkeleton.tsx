import { type JSX } from 'react';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';

/**
 * Loading skeleton for Custody page
 * Matches the structure of the actual page content with shimmer effects
 */
export function DataAvailabilitySkeleton(): JSX.Element {
  return (
    <div className="space-y-6">
      {/* Breadcrumb skeleton */}
      <div className="flex items-center gap-2">
        <LoadingContainer className="h-5 w-32 rounded-sm" />
        <LoadingContainer className="h-5 w-4 rounded-sm" />
        <LoadingContainer className="h-5 w-24 rounded-sm" />
      </div>

      {/* Stats row skeleton - 4 stat cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-sm border border-border bg-surface p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 space-y-3">
                <LoadingContainer className="h-4 w-20 rounded-sm" />
                <LoadingContainer className="h-8 w-24 rounded-sm" />
              </div>
              <LoadingContainer className="size-12 rounded-sm" />
            </div>
          </div>
        ))}
      </div>

      {/* Heatmap card skeleton */}
      <div className="overflow-hidden rounded-sm border border-border bg-surface">
        {/* Card header */}
        <div className="border-b border-border p-6">
          <LoadingContainer className="h-6 w-64 rounded-sm" />
          <LoadingContainer className="mt-2 h-4 w-96 rounded-sm" />
        </div>

        {/* Card content */}
        <div className="p-6">
          <div className="space-y-6">
            {/* Filters and Legend row */}
            <div className="flex flex-col items-start gap-6 lg:flex-row lg:items-start">
              {/* Filter panel skeleton */}
              <div className="w-full lg:flex-[2]">
                <div className="space-y-3">
                  <LoadingContainer className="h-5 w-32 rounded-sm" />
                  <LoadingContainer className="h-10 w-full rounded-sm" />
                </div>
              </div>

              {/* Legend skeleton */}
              <div className="w-full lg:flex-1">
                <div className="space-y-3">
                  <LoadingContainer className="h-5 w-28 rounded-sm" />
                  <div className="flex items-center gap-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <LoadingContainer key={i} className="h-4 w-16 rounded-sm" />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Heatmap grid skeleton */}
            <div className="space-y-2">
              {/* Column headers */}
              <div className="flex gap-1">
                {Array.from({ length: 20 }).map((_, i) => (
                  <LoadingContainer key={i} className="size-3 rounded-sm" />
                ))}
              </div>

              {/* Grid rows */}
              {Array.from({ length: 12 }).map((_, rowIndex) => (
                <div key={rowIndex} className="flex items-center gap-2">
                  {/* Row label */}
                  <LoadingContainer className="h-3 w-16 rounded-sm" />
                  {/* Grid cells */}
                  <div className="flex gap-1">
                    {Array.from({ length: 20 }).map((_, colIndex) => (
                      <LoadingContainer key={colIndex} className="size-3 rounded-sm" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
