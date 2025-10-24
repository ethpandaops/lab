import { type JSX } from 'react';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { Card } from '@/components/Layout/Card';

/**
 * Loading skeleton for Live Metrics section on contributor detail page.
 * Shows placeholder for slot controls and three chart sections.
 */
export function MetricsSkeleton(): JSX.Element {
  return (
    <div className="space-y-6">
      {/* Slot Player Controls Skeleton */}
      <Card>
        <LoadingContainer className="h-[60px]" />
      </Card>

      {/* Block Latency Chart Skeleton */}
      <Card header={<div className="h-6 w-48 animate-pulse rounded-sm bg-muted/20" />}>
        <LoadingContainer className="h-[300px]" />
      </Card>

      {/* Blob Latency Chart Skeleton */}
      <Card header={<div className="h-6 w-48 animate-pulse rounded-sm bg-muted/20" />}>
        <LoadingContainer className="h-[300px]" />
      </Card>

      {/* Attestation Latency Chart Skeleton */}
      <Card header={<div className="h-6 w-48 animate-pulse rounded-sm bg-muted/20" />}>
        <LoadingContainer className="h-[300px]" />
      </Card>
    </div>
  );
}
