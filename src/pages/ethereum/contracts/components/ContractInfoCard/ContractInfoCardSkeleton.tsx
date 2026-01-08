import { type JSX } from 'react';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';

/**
 * Skeleton loading state for the ContractInfoCard.
 * Matches the layout of the actual ContractInfoCard component.
 */
export function ContractInfoCardSkeleton(): JSX.Element {
  return (
    <div className="overflow-hidden rounded-sm border border-border bg-surface">
      {/* Header section */}
      <div className="border-b border-border bg-background px-6 py-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {/* Contract name */}
            <LoadingContainer className="h-9 w-48 rounded-xs" />
            {/* Address */}
            <div className="mt-1 flex items-center gap-1">
              <LoadingContainer className="h-5 w-80 rounded-xs" />
              <LoadingContainer className="size-5 rounded-xs" />
            </div>
          </div>

          {/* External link placeholder */}
          <LoadingContainer className="size-5 rounded-xs" />
        </div>
      </div>

      {/* Content section */}
      <div className="p-6">
        <div className="flex flex-col gap-6">
          {/* Labels section */}
          <div className="flex flex-wrap items-center gap-2">
            <LoadingContainer className="h-5 w-24 rounded-full" />
            <LoadingContainer className="h-5 w-16 rounded-full" />
          </div>

          {/* Metadata section */}
          <div>
            <LoadingContainer className="mb-3 h-4 w-28 rounded-xs" />
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Owner */}
              <div>
                <LoadingContainer className="h-3 w-12 rounded-xs" />
                <LoadingContainer className="mt-1 h-4 w-24 rounded-xs" />
              </div>

              {/* Factory */}
              <div className="sm:col-span-2 lg:col-span-2">
                <LoadingContainer className="h-3 w-14 rounded-xs" />
                <div className="mt-1 flex items-center gap-1">
                  <LoadingContainer className="h-4 w-80 rounded-xs" />
                  <LoadingContainer className="size-4 rounded-xs" />
                </div>
              </div>

              {/* Sources */}
              <div className="sm:col-span-2 lg:col-span-3">
                <LoadingContainer className="h-3 w-20 rounded-xs" />
                <div className="mt-1 flex items-center gap-2">
                  <LoadingContainer className="h-4 w-20 rounded-xs" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
