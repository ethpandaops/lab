import { type JSX } from 'react';
import { Card } from '@/components/Layout/Card';

/**
 * Shimmer animation class
 */
const shimmer = 'animate-pulse bg-muted/20';

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
        <div className={`h-[80px] w-full rounded-xs ${shimmer}`} />
        <div className="mt-3 grid grid-cols-4 gap-4 border-t border-border pt-3">
          {[...Array(4)].map((_, i) => (
            <div key={i}>
              <div className={`mb-1 h-3 w-12 rounded-xs ${shimmer}`} />
              <div className={`h-4 w-16 rounded-xs ${shimmer}`} />
            </div>
          ))}
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
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-1">
              <div className={`size-3 rounded-xs ${shimmer}`} />
              <div className={`h-3 w-16 rounded-xs ${shimmer}`} />
            </div>
          ))}
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
          {[...Array(10)].map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`h-5 w-16 rounded-xs ${shimmer}`} />
              <div className={`h-5 rounded-xs ${shimmer}`} style={{ width: `${100 - i * 8}%` }} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
