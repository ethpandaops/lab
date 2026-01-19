import type { JSX } from 'react';
import { Card } from '@/components/Layout/Card';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';

/**
 * Loading skeleton for fork readiness page
 * Mirrors the structure of ForkSection + Stats + ClientReadinessCard
 */
export function ForkReadinessLoading(): JSX.Element {
  return (
    <div className="space-y-6">
      {/* Fork header */}
      <div className="space-y-4">
        <LoadingContainer className="h-8 w-48 rounded-sm" />

        {/* Stats grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 3xl:grid-cols-5 4xl:grid-cols-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index}>
              <div className="space-y-2">
                <LoadingContainer className="h-4 w-24 rounded-xs" />
                <LoadingContainer className="h-8 w-16 rounded-sm" />
                <LoadingContainer className="h-3 w-32 rounded-xs" />
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Client cards grid */}
      <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="p-6">
            {/* Client header */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <LoadingContainer className="size-12 rounded-sm" />
                <div className="space-y-2">
                  <LoadingContainer className="h-5 w-24 rounded-xs" />
                  <LoadingContainer className="h-4 w-16 rounded-xs" />
                </div>
              </div>
              <LoadingContainer className="h-8 w-16 rounded-xs" />
            </div>

            {/* Progress bar */}
            <LoadingContainer className="mb-4 h-2 w-full rounded-full" />

            {/* Progress text */}
            <div className="mb-2 flex justify-between">
              <LoadingContainer className="h-4 w-12 rounded-xs" />
              <LoadingContainer className="h-4 w-12 rounded-xs" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
