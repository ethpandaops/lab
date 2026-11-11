import type { JSX } from 'react';
import { Card } from '@/components/Layout/Card';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';

/**
 * A summary card
 */
function SummaryCardSkeleton(): JSX.Element {
  return (
    <Card className="border-l-2 border-l-muted-50 p-2 md:p-3">
      <LoadingContainer className="h-3 w-24" />
      <LoadingContainer className="mt-1.5 h-6 w-20" />
      <LoadingContainer className="mt-1 h-4 w-16" />
    </Card>
  );
}

/**
 * A chart card: title, subtitle and plot
 */
function ChartCardSkeleton(): JSX.Element {
  return (
    <Card className="p-4">
      <div className="mb-3">
        <LoadingContainer className="h-5 w-32" />
        <LoadingContainer className="mt-1.5 h-3 w-40" />
      </div>
      <LoadingContainer className="h-70 w-full" />
    </Card>
  );
}

/**
 * Loading skeleton for the State Expiry page.
 * Displays shimmer placeholders for data-dependent content (below the policy selector).
 */
export function StateExpirySkeleton(): JSX.Element {
  return (
    <div className="space-y-4">
      {/* Summary Cards - 3 cards */}
      <div className="grid gap-2 md:grid-cols-3 md:gap-3">
        <SummaryCardSkeleton />
        <SummaryCardSkeleton />
        <SummaryCardSkeleton />
      </div>

      {/* Charts - 2 side by side */}
      <div className="grid gap-4 md:grid-cols-2">
        <ChartCardSkeleton />
        <ChartCardSkeleton />
      </div>

      {/* Top 100 Contracts */}
      <Card className="p-4">
        <div className="mb-3">
          <LoadingContainer className="h-5 w-36" />
          <LoadingContainer className="mt-1.5 h-3 w-24" />
        </div>
        <div className="space-y-2">
          <LoadingContainer className="h-8 w-full" />
          <LoadingContainer className="h-8 w-full" />
          <LoadingContainer className="h-8 w-full" />
          <LoadingContainer className="h-8 w-full" />
          <LoadingContainer className="h-8 w-full" />
          <LoadingContainer className="h-8 w-full" />
          <LoadingContainer className="h-8 w-full" />
          <LoadingContainer className="h-8 w-full" />
          <LoadingContainer className="h-8 w-full" />
          <LoadingContainer className="h-8 w-full" />
        </div>
      </Card>
    </div>
  );
}
