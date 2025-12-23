import { type JSX } from 'react';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';

/**
 * Skeleton loading state for the ContractTop100List.
 * Displays 8 placeholder rows matching the ContractRow layout.
 */
export function ContractTop100ListSkeleton(): JSX.Element {
  return (
    <div className="divide-y divide-border/50">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 px-2 py-1">
          {/* Rank badge skeleton */}
          <LoadingContainer className="size-5 shrink-0 rounded-xs" />

          {/* Contract info skeleton */}
          <div className="min-w-0 flex-1">
            <LoadingContainer className="h-3 w-3/4 rounded-xs" />
          </div>

          {/* Bytes skeleton */}
          <LoadingContainer className="h-3 w-12 shrink-0 rounded-xs" />
        </div>
      ))}
    </div>
  );
}
