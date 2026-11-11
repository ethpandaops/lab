import { type JSX } from 'react';
import { Card } from '@/components/Layout/Card';

/**
 * Shimmer animation class
 */
const shimmer = 'animate-pulse bg-muted-20';

/** Widths of the opcode distribution bars (% of the row), longest first */
const OPCODE_BAR_WIDTHS = [100, 92, 84, 76, 68, 60, 52, 44, 36, 28];

/**
 * A label and value under the gas breakdown
 */
function StatSkeleton(): JSX.Element {
  return (
    <div>
      <div className={`mb-1 h-3 w-12 rounded-xs ${shimmer}`} />
      <div className={`h-4 w-16 rounded-xs ${shimmer}`} />
    </div>
  );
}

/**
 * A swatch and name in the call tree legend
 */
function LegendItemSkeleton(): JSX.Element {
  return (
    <div className="flex items-center gap-1">
      <div className={`size-3 rounded-xs ${shimmer}`} />
      <div className={`h-3 w-16 rounded-xs ${shimmer}`} />
    </div>
  );
}

/**
 * Skeleton loading state for the Gas Profiler page
 */
export function GasProfilerSkeleton(): JSX.Element {
  return (
    <div className="space-y-6">
      {/* Gas Breakdown Skeleton */}
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className={`h-4 w-32 rounded-xs ${shimmer}`} />
          <div className="flex gap-4">
            <div className={`h-4 w-20 rounded-xs ${shimmer}`} />
            <div className={`h-4 w-20 rounded-xs ${shimmer}`} />
          </div>
        </div>
        <div className={`h-20 w-full rounded-xs ${shimmer}`} />
        <div className="mt-3 grid grid-cols-4 gap-4 border-t border-border pt-3">
          <StatSkeleton />
          <StatSkeleton />
          <StatSkeleton />
          <StatSkeleton />
        </div>
      </Card>

      {/* Call Tree Skeleton */}
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className={`h-4 w-24 rounded-xs ${shimmer}`} />
          <div className={`h-4 w-32 rounded-xs ${shimmer}`} />
        </div>
        <div className="space-y-1">
          <div className={`h-7 w-full rounded-xs ${shimmer}`} />
          <div className={`ml-4 h-7 w-11/12 rounded-xs ${shimmer}`} />
          <div className={`ml-8 h-7 w-10/12 rounded-xs ${shimmer}`} />
          <div className={`ml-8 h-7 w-9/12 rounded-xs ${shimmer}`} />
          <div className={`ml-4 h-7 w-10/12 rounded-xs ${shimmer}`} />
          <div className={`ml-8 h-7 w-8/12 rounded-xs ${shimmer}`} />
        </div>
        <div className="mt-3 flex gap-3">
          <LegendItemSkeleton />
          <LegendItemSkeleton />
          <LegendItemSkeleton />
          <LegendItemSkeleton />
          <LegendItemSkeleton />
        </div>
      </Card>

      {/* Opcode Distribution Skeleton */}
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className={`h-4 w-36 rounded-xs ${shimmer}`} />
          <div className="flex gap-4">
            <div className={`h-4 w-24 rounded-xs ${shimmer}`} />
            <div className={`h-6 w-32 rounded-xs ${shimmer}`} />
          </div>
        </div>
        <div className="space-y-2">
          {OPCODE_BAR_WIDTHS.map(width => (
            <div key={width} className="flex items-center gap-2">
              <div className={`h-5 w-16 rounded-xs ${shimmer}`} />
              <div className={`h-5 rounded-xs ${shimmer}`} style={{ width: `${width}%` }} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
