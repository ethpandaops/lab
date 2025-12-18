import type { JSX } from 'react';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { Card } from '@/components/Layout/Card';

/**
 * Loading skeleton for the State Growth page.
 * Matches the layout: Stats row (Total + 3 cards) -> Main Chart -> Storage Slot Expiry section
 */
export function StateSizeSkeleton(): JSX.Element {
  return (
    <div className="space-y-6">
      {/* Stats Row: Total State Size + Metric Cards */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-12">
        {/* Total State Size */}
        <div className="flex shrink-0 flex-col justify-center">
          <LoadingContainer className="h-3 w-28 rounded-xs" />
          <LoadingContainer className="mt-2 h-14 w-80 rounded-xs" />
          <div className="mt-2 flex items-center gap-3">
            <LoadingContainer className="h-7 w-24 rounded-sm" />
            <LoadingContainer className="h-5 w-16 rounded-xs" />
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid min-w-0 flex-1 grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} rounded className="p-3">
              <LoadingContainer className="h-3 w-24 rounded-xs" />
              <LoadingContainer className="mt-1 h-7 w-28 rounded-xs" />
              <div className="mt-1.5 flex items-center gap-2">
                <LoadingContainer className="h-5 w-20 rounded-sm" />
                <LoadingContainer className="h-4 w-14 rounded-xs" />
              </div>
              <LoadingContainer className="mt-1.5 h-4 w-full rounded-xs" />
            </Card>
          ))}
        </div>
      </div>

      {/* Main Chart */}
      <Card rounded className="p-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <LoadingContainer className="h-5 w-48 rounded-xs" />
            <LoadingContainer className="mt-2 h-4 w-72 rounded-xs" />
          </div>
          <div className="flex items-center gap-2">
            <LoadingContainer className="h-4 w-12 rounded-xs" />
            <div className="flex gap-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <LoadingContainer key={i} className="h-8 w-28 rounded-sm" />
              ))}
            </div>
          </div>
        </div>
        <LoadingContainer className="h-[480px] w-full rounded-sm" />
      </Card>

      {/* Storage Slot Expiry Section */}
      <div className="mt-8 space-y-6">
        {/* Section Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <LoadingContainer className="h-7 w-48 rounded-xs" />
            <LoadingContainer className="mt-2 h-4 w-80 rounded-xs" />
          </div>
          <div className="flex items-center gap-2">
            <LoadingContainer className="h-4 w-24 rounded-xs" />
            <div className="flex gap-0.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <LoadingContainer key={i} className="h-8 w-10 rounded-xs" />
              ))}
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} rounded className="p-3">
              <LoadingContainer className="h-3 w-28 rounded-xs" />
              <LoadingContainer className="mt-1.5 h-7 w-24 rounded-xs" />
              <div className="mt-1.5 flex items-center gap-2">
                <LoadingContainer className="h-5 w-20 rounded-sm" />
              </div>
            </Card>
          ))}
        </div>

        {/* Storage Size Comparison Chart */}
        <Card rounded className="p-6">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <LoadingContainer className="h-5 w-52 rounded-xs" />
              <LoadingContainer className="mt-2 h-4 w-96 rounded-xs" />
            </div>
            <div className="flex items-center gap-2">
              <LoadingContainer className="h-4 w-12 rounded-xs" />
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <LoadingContainer key={i} className="h-8 w-20 rounded-sm" />
                ))}
              </div>
            </div>
          </div>
          <LoadingContainer className="h-[360px] w-full rounded-sm" />
        </Card>

        {/* Active Storage Slots Chart */}
        <Card rounded className="p-6">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <LoadingContainer className="h-5 w-60 rounded-xs" />
              <LoadingContainer className="mt-2 h-4 w-72 rounded-xs" />
            </div>
            <div className="flex items-center gap-2">
              <LoadingContainer className="h-4 w-12 rounded-xs" />
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <LoadingContainer key={i} className="h-8 w-20 rounded-sm" />
                ))}
              </div>
            </div>
          </div>
          <LoadingContainer className="h-[360px] w-full rounded-sm" />
        </Card>
      </div>
    </div>
  );
}
