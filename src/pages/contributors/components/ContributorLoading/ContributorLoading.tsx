import { type JSX } from 'react';
import { Card } from '@/components/Layout/Card';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';

/**
 * Loading skeleton for contributor cards
 * Simplified version that suggests the layout without excessive detail
 */
export function ContributorLoading(): JSX.Element {
  return (
    <Card>
      <div className="flex w-full items-center justify-between gap-x-6">
        <div className="min-w-0 flex-1 space-y-2">
          {/* Username and badge */}
          <div className="flex items-center gap-x-3">
            <LoadingContainer className="h-6 w-32 rounded-sm" />
            <LoadingContainer className="h-5 w-20 rounded-xs" />
          </div>

          {/* Metadata (node count, location) */}
          <LoadingContainer className="h-4 w-48 rounded-xs" />

          {/* Client info */}
          <LoadingContainer className="h-5 w-24 rounded-xs" />
        </div>

        {/* Last seen */}
        <LoadingContainer className="h-4 w-16 rounded-xs" />
      </div>
    </Card>
  );
}
