import { type JSX } from 'react';
import { Card } from '@/components/Layout/Card';

/**
 * Shimmer animation class
 */
const shimmer = 'animate-pulse bg-muted/20';

/**
 * Skeleton loading state for the Gas Repricing Simulator page
 * Matches the actual page layout with left controls and right results panel
 */
export function SimulatePageSkeleton(): JSX.Element {
  return (
    <div className="space-y-6">
      {/* Back link skeleton */}
      <div className={`h-4 w-32 rounded-xs ${shimmer}`} />

      {/* Main content grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column - Controls */}
        <div className="space-y-6 lg:col-span-1">
          {/* Simulation Target Card */}
          <Card className="p-4">
            <div className="mb-4 flex items-center gap-3">
              <div className={`size-9 rounded-xs ${shimmer}`} />
              <div>
                <div className={`mb-1 h-4 w-28 rounded-xs ${shimmer}`} />
                <div className={`h-3 w-40 rounded-xs ${shimmer}`} />
              </div>
            </div>
            <div className={`h-10 w-full rounded-xs ${shimmer}`} />
            <div className={`mt-2 h-3 w-48 rounded-xs ${shimmer}`} />
            <div className={`mt-4 h-10 w-full rounded-xs ${shimmer}`} />
          </Card>

          {/* Gas Schedule Editor Card */}
          <Card className="overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border bg-surface/30 px-4 py-3">
              <div>
                <div className={`mb-1 h-4 w-24 rounded-xs ${shimmer}`} />
                <div className={`h-3 w-48 rounded-xs ${shimmer}`} />
              </div>
            </div>
            {/* Parameter sections */}
            <div className="divide-y divide-border">
              {[...Array(3)].map((_, sectionIdx) => (
                <div key={sectionIdx} className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className={`size-4 rounded-xs ${shimmer}`} />
                    <div className={`h-4 w-20 rounded-xs ${shimmer}`} />
                    <div className={`h-3 w-48 rounded-xs ${shimmer}`} />
                  </div>
                  {sectionIdx === 0 && (
                    <div className="mt-3 space-y-4">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className={`h-4 w-24 rounded-xs ${shimmer}`} />
                            <div className={`h-4 w-16 rounded-xs ${shimmer}`} />
                          </div>
                          <div className="flex items-center gap-3">
                            <div className={`h-2 flex-1 rounded-xs ${shimmer}`} />
                            <div className={`h-3 w-12 rounded-xs ${shimmer}`} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right column - Results */}
        <div className="lg:col-span-2">
          <Card className="p-8">
            <div className="flex flex-col items-center justify-center gap-4 text-center">
              <div className={`size-12 rounded-xs ${shimmer}`} />
              <div>
                <div className={`mx-auto mb-2 h-5 w-32 rounded-xs ${shimmer}`} />
                <div className={`mx-auto h-4 w-80 rounded-xs ${shimmer}`} />
                <div className={`mx-auto mt-1 h-4 w-64 rounded-xs ${shimmer}`} />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
