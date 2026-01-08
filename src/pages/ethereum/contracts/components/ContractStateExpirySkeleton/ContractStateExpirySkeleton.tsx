import type { JSX } from 'react';
import { Card } from '@/components/Layout/Card';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';

/**
 * Loading skeleton for the State Expiry section within the Contract page.
 * Displays shimmer placeholders for stats panels and charts.
 * Matches the layout of the actual content with colored borders.
 */
export function ContractStateExpirySkeleton(): JSX.Element {
  return (
    <div className="space-y-4">
      {/* Stats Cards - 3 cards with matching border colors */}
      <div className="grid gap-2 md:grid-cols-3 md:gap-3">
        {/* Current State - muted border */}
        <Card className="border-l-2 border-l-muted/50 p-2 md:p-3">
          <LoadingContainer className="h-3 w-24 rounded-xs" />
          <LoadingContainer className="mt-1.5 h-6 w-28 rounded-xs" />
          <LoadingContainer className="mt-1 h-3.5 w-20 rounded-xs" />
        </Card>

        {/* After Expiry - blue border (matches slot expiry color) */}
        <div className="border-l-2 border-l-blue-500">
          <Card className="h-full border-l-0 p-2 md:p-3">
            <LoadingContainer className="h-3 w-20 rounded-xs" />
            <LoadingContainer className="mt-1.5 h-6 w-24 rounded-xs" />
            <LoadingContainer className="mt-1 h-3.5 w-20 rounded-xs" />
          </Card>
        </div>

        {/* Difference - emerald border */}
        <Card className="border-l-2 border-l-emerald-500 p-2 md:p-3">
          <LoadingContainer className="h-3 w-20 rounded-xs" />
          <LoadingContainer className="mt-1.5 h-6 w-36 rounded-xs" />
          <LoadingContainer className="mt-1 h-3.5 w-32 rounded-xs" />
        </Card>
      </div>

      {/* Charts - 2 side by side matching PopoutCard style */}
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            {/* Header matching PopoutCard */}
            <div className="flex items-center justify-between border-b border-border bg-background px-4 py-3">
              <div>
                <LoadingContainer className="h-5 w-28 rounded-xs" />
                <LoadingContainer className="mt-1.5 h-3 w-36 rounded-xs" />
              </div>
              <div className="flex gap-2">
                <LoadingContainer className="size-6 rounded-xs" />
                <LoadingContainer className="size-6 rounded-xs" />
              </div>
            </div>
            {/* Chart area */}
            <div className="p-4">
              <LoadingContainer className="h-[280px] w-full rounded-xs" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
