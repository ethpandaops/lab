import type { JSX } from 'react';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';

/**
 * A slot column header of the timeline
 */
function SlotHeaderSkeleton(): JSX.Element {
  return (
    <div className="flex min-w-20 flex-1 flex-col items-center gap-1">
      <LoadingContainer className="h-5 w-8 rounded-sm" />
      <LoadingContainer className="h-4 w-full rounded-sm" />
      <LoadingContainer className="h-3 w-12 rounded-sm" />
    </div>
  );
}

/**
 * A client row of the timeline: the client, then a cell for each of the five slots
 */
function TimelineRowSkeleton(): JSX.Element {
  return (
    <div className="flex gap-2">
      <LoadingContainer className="h-10 w-28 rounded-sm" />
      <LoadingContainer className="h-10 min-w-20 flex-1 rounded-sm" />
      <LoadingContainer className="h-10 min-w-20 flex-1 rounded-sm" />
      <LoadingContainer className="h-10 min-w-20 flex-1 rounded-sm" />
      <LoadingContainer className="h-10 min-w-20 flex-1 rounded-sm" />
      <LoadingContainer className="h-10 min-w-20 flex-1 rounded-sm" />
    </div>
  );
}

/**
 * A consensus client column header of the pairings matrix
 */
function ConsensusClientHeaderSkeleton(): JSX.Element {
  return (
    <div className="flex min-w-20 flex-1 flex-col items-center gap-1">
      <LoadingContainer className="h-4 w-4 rounded-full" />
      <LoadingContainer className="h-4 w-16 rounded-sm" />
    </div>
  );
}

/**
 * An execution client row of the pairings matrix: the client, then a cell for each of the three consensus clients
 */
function PairingRowSkeleton(): JSX.Element {
  return (
    <div className="flex gap-2">
      <LoadingContainer className="h-10 w-28 rounded-sm" />
      <LoadingContainer className="h-10 min-w-20 flex-1 rounded-sm" />
      <LoadingContainer className="h-10 min-w-20 flex-1 rounded-sm" />
      <LoadingContainer className="h-10 min-w-20 flex-1 rounded-sm" />
    </div>
  );
}

/**
 * Loading skeleton for the Locally Built Blocks page
 * Matches the layout of Timeline and Client Pairings sections
 */
export function LocallyBuiltBlocksSkeleton(): JSX.Element {
  return (
    <div className="space-y-6">
      {/* Timeline Section Skeleton */}
      <div className="space-y-4">
        {/* Section header */}
        <div className="mb-2 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <LoadingContainer className="h-6 w-24 rounded-sm" />
          </div>
          <LoadingContainer className="h-4 w-80 rounded-sm" />
        </div>

        {/* Timeline matrix */}
        <div className="rounded-sm border border-border bg-surface p-4">
          {/* Slot headers */}
          <div className="mb-4 flex gap-2">
            <div className="w-28 shrink-0" />
            <SlotHeaderSkeleton />
            <SlotHeaderSkeleton />
            <SlotHeaderSkeleton />
            <SlotHeaderSkeleton />
            <SlotHeaderSkeleton />
          </div>

          {/* Execution Clients */}
          <div className="space-y-2">
            <LoadingContainer className="mb-2 h-4 w-32 rounded-sm" />
            <TimelineRowSkeleton />
            <TimelineRowSkeleton />
            <TimelineRowSkeleton />
            <TimelineRowSkeleton />
            <TimelineRowSkeleton />
          </div>

          {/* Consensus Clients */}
          <div className="mt-6 space-y-2">
            <LoadingContainer className="mb-2 h-4 w-32 rounded-sm" />
            <TimelineRowSkeleton />
            <TimelineRowSkeleton />
            <TimelineRowSkeleton />
          </div>
        </div>
      </div>

      {/* Client Pairings Section Skeleton */}
      <div className="space-y-4">
        {/* Section header */}
        <div className="mb-2 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <LoadingContainer className="h-6 w-32 rounded-sm" />
          </div>
          <LoadingContainer className="h-4 w-96 rounded-sm" />
        </div>

        {/* Client pairings matrix */}
        <div className="rounded-sm border border-border bg-surface p-4">
          {/* Consensus client headers */}
          <div className="mb-4 flex gap-2">
            <div className="w-28 shrink-0" />
            <ConsensusClientHeaderSkeleton />
            <ConsensusClientHeaderSkeleton />
            <ConsensusClientHeaderSkeleton />
          </div>

          {/* Execution client rows */}
          <div className="space-y-2">
            <PairingRowSkeleton />
            <PairingRowSkeleton />
            <PairingRowSkeleton />
            <PairingRowSkeleton />
            <PairingRowSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}
