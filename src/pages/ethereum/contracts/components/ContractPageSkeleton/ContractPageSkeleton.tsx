import type { JSX } from 'react';
import { Card } from '@/components/Layout/Card';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';

/**
 * Loading skeleton for the Contract Storage page.
 */
export function ContractPageSkeleton(): JSX.Element {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: 2 }).map((_, i) => (
        <Card key={i} className="p-6">
          <LoadingContainer className="h-5 w-48" />
          <LoadingContainer className="mt-2 h-3 w-32" />
          <LoadingContainer className="mt-4 h-[280px] w-full rounded-xs" />
        </Card>
      ))}
    </div>
  );
}
