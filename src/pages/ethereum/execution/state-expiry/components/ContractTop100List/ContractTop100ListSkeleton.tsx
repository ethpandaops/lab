import { type JSX } from 'react';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { TableColGroup } from './TableColGroup';

/**
 * Skeleton loading state for the ContractTop100List table (desktop).
 * Displays header and 8 placeholder rows matching the table layout.
 */
export function ContractTop100ListSkeleton(): JSX.Element {
  return (
    <table className="w-full min-w-[600px] table-fixed border-collapse">
      <TableColGroup />
      <thead className="sticky top-0 z-10 bg-surface">
        <tr className="border-b border-border/50 text-[10px] font-medium text-muted uppercase">
          <th className="px-2 py-1.5 text-center">#</th>
          <th className="px-2 py-1.5 text-left">Contract</th>
          <th className="px-2 py-1.5 text-left">Owner</th>
          <th className="px-2 py-1.5 text-right">Size</th>
          <th className="px-2 py-1.5 text-right">1y Expiry</th>
          <th className="px-2 py-1.5 text-right">2y Expiry</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border/50">
        {Array.from({ length: 8 }).map((_, i) => (
          <tr key={i}>
            <td className="px-2 py-1.5 text-center">
              <LoadingContainer className="mx-auto size-5 rounded-xs" />
            </td>
            <td className="px-2 py-1.5">
              <div className="flex items-center gap-1.5">
                <LoadingContainer className="h-3.5 w-24 rounded-xs" />
                <LoadingContainer className="h-4 w-16 rounded-full" />
              </div>
              <LoadingContainer className="mt-1 h-3 w-32 rounded-xs" />
            </td>
            <td className="px-2 py-1.5">
              <LoadingContainer className="h-3 w-20 rounded-xs" />
            </td>
            <td className="px-2 py-1.5 text-right">
              <LoadingContainer className="ml-auto h-3 w-14 rounded-xs" />
            </td>
            <td className="px-2 py-1.5 text-right">
              <LoadingContainer className="ml-auto h-3 w-10 rounded-xs" />
            </td>
            <td className="px-2 py-1.5 text-right">
              <LoadingContainer className="ml-auto h-3 w-10 rounded-xs" />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Skeleton loading state for the ContractTop100List card layout (mobile).
 * Displays 6 placeholder cards matching the mobile card layout.
 */
export function ContractTop100ListSkeletonMobile(): JSX.Element {
  return (
    <div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="border-b border-border/50 px-3 py-3">
          <div className="flex items-start gap-3">
            {/* Rank badge skeleton */}
            <LoadingContainer className="size-7 shrink-0 rounded-xs" />

            {/* Content skeleton */}
            <div className="min-w-0 flex-1">
              {/* Name and badges */}
              <div className="flex items-center gap-1.5">
                <LoadingContainer className="h-4 w-32 rounded-xs" />
                <LoadingContainer className="h-4 w-16 rounded-full" />
              </div>

              {/* Address */}
              <LoadingContainer className="mt-1 h-3 w-48 rounded-xs" />

              {/* Stats row */}
              <div className="mt-2 flex items-center gap-4">
                <LoadingContainer className="h-3 w-20 rounded-xs" />
                <LoadingContainer className="h-3 w-12 rounded-xs" />
                <LoadingContainer className="h-3 w-12 rounded-xs" />
              </div>

              {/* Owner */}
              <LoadingContainer className="mt-1 h-3 w-24 rounded-xs" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
