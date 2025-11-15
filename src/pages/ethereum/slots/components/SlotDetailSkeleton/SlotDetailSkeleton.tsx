import type { JSX } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { Button } from '@/components/Elements/Button';
import { Card } from '@/components/Layout/Card';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { TabGroup, TabPanel, TabPanels } from '@headlessui/react';
import { Tab } from '@/components/Navigation/Tab';
import { ScrollableTabs } from '@/components/Navigation/ScrollableTabs';
import { formatSlot } from '@/utils';

export interface SlotDetailSkeletonProps {
  /** The slot number being loaded */
  slot: number;
  /** The epoch number for this slot */
  epoch: number;
}

/**
 * Loading skeleton for the Slot Detail page
 * Matches the layout of the slot detail view with navigation, slot info card, tabs, and overview cards
 */
export function SlotDetailSkeleton({ slot, epoch }: SlotDetailSkeletonProps): JSX.Element {
  const navigate = useNavigate();

  return (
    <>
      {/* Navigation Controls */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <Button
          variant="secondary"
          size="sm"
          rounded="sm"
          leadingIcon={<ChevronLeftIcon />}
          disabled={slot === 0}
          onClick={() => navigate({ to: '/ethereum/slots/$slot', params: { slot: String(slot - 1) } })}
          aria-label="Previous slot"
        >
          Previous
        </Button>
        <div className="flex-1" />
        <Button
          variant="secondary"
          size="sm"
          rounded="sm"
          trailingIcon={<ChevronRightIcon />}
          onClick={() => navigate({ to: '/ethereum/slots/$slot', params: { slot: String(slot + 1) } })}
          aria-label="Next slot"
        >
          Next
        </Button>
      </div>

      {/* Slot Basic Info Card Skeleton */}
      <div className="overflow-hidden rounded-sm border border-border bg-surface">
        {/* Header section */}
        <div className="border-b border-border bg-background px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg/7 font-semibold text-foreground">Slot Information</h2>
            <div className="flex items-center gap-2">
              <LoadingContainer className="size-5 rounded-sm" />
              <LoadingContainer className="size-5 rounded-sm" />
              <LoadingContainer className="size-5 rounded-sm" />
              <LoadingContainer className="size-5 rounded-sm" />
            </div>
          </div>
        </div>

        {/* Card content */}
        <div className="p-6">
          <div className="flex flex-col gap-6 lg:flex-row">
            <div className="flex-1 space-y-6">
              {/* Status Section */}
              <div className="flex flex-wrap items-center gap-2">
                <LoadingContainer className="h-6 w-24 rounded-sm" />
                <LoadingContainer className="h-6 w-20 rounded-sm" />
              </div>

              {/* Basic Information Section */}
              <div>
                <h3 className="mb-3 text-sm font-semibold text-foreground">Basic Information</h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
                  {/* Slot Number */}
                  <div>
                    <dt className="text-xs font-medium text-muted">Slot</dt>
                    <dd className="mt-1 text-base/7 font-semibold text-foreground">{formatSlot(slot)}</dd>
                  </div>

                  {/* Epoch */}
                  <div>
                    <dt className="text-xs font-medium text-muted">Epoch</dt>
                    <dd className="mt-1 text-base/7 font-semibold text-foreground">{epoch}</dd>
                  </div>

                  {/* Fork */}
                  <div>
                    <dt className="text-xs font-medium text-muted">Fork</dt>
                    <dd className="mt-1">
                      <LoadingContainer className="h-6 w-20 rounded-sm" />
                    </dd>
                  </div>

                  {/* Execution Block Number */}
                  <div>
                    <dt className="text-xs font-medium text-muted">Execution Block</dt>
                    <dd className="mt-1">
                      <LoadingContainer className="h-6 w-20 rounded-sm" />
                    </dd>
                  </div>

                  {/* Blob Count */}
                  <div>
                    <dt className="text-xs font-medium text-muted">Blobs</dt>
                    <dd className="mt-1">
                      <LoadingContainer className="h-6 w-8 rounded-sm" />
                    </dd>
                  </div>

                  {/* Slot Timestamp */}
                  <div className="col-span-2">
                    <dt className="text-xs font-medium text-muted">Slot Time</dt>
                    <dd className="mt-1">
                      <LoadingContainer className="h-5 w-48 rounded-sm" />
                    </dd>
                  </div>

                  {/* Relative Time */}
                  <div className="col-span-2 sm:col-span-1">
                    <dt className="text-xs font-medium text-muted">Age</dt>
                    <dd className="mt-1">
                      <LoadingContainer className="h-5 w-20 rounded-sm" />
                    </dd>
                  </div>

                  {/* Epoch Timestamp */}
                  <div className="col-span-2">
                    <dt className="text-xs font-medium text-muted">Epoch Start</dt>
                    <dd className="mt-1">
                      <LoadingContainer className="h-5 w-48 rounded-sm" />
                    </dd>
                  </div>
                </div>
              </div>

              {/* Block Details Section */}
              <div>
                <h3 className="mb-3 text-sm font-semibold text-foreground">Block Details</h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
                  {/* Proposer Entity */}
                  <div className="col-span-2">
                    <dt className="text-xs font-medium text-muted">Proposer</dt>
                    <dd className="mt-1">
                      <LoadingContainer className="h-5 w-32 rounded-sm" />
                    </dd>
                  </div>

                  {/* MEV Value */}
                  <div className="col-span-2">
                    <dt className="text-xs font-medium text-muted">MEV Value</dt>
                    <dd className="mt-1">
                      <LoadingContainer className="h-6 w-24 rounded-sm" />
                    </dd>
                  </div>

                  {/* Block Root */}
                  <div className="col-span-2 sm:col-span-3 lg:col-span-4">
                    <dt className="text-xs font-medium text-muted">Block Root</dt>
                    <dd className="mt-1">
                      <LoadingContainer className="h-4 w-48 rounded-sm" />
                    </dd>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center lg:items-start">
              <LoadingContainer className="size-[180px] rounded-sm" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabbed Content Skeleton */}
      <div className="mt-8">
        <TabGroup selectedIndex={0}>
          <ScrollableTabs>
            <Tab>Overview</Tab>
            <Tab>Block</Tab>
            <Tab>Attestations</Tab>
            <Tab>Propagation</Tab>
            <Tab>Execution</Tab>
            <Tab>MEV</Tab>
          </ScrollableTabs>

          <TabPanels className="mt-6">
            {/* Overview Tab Skeleton */}
            <TabPanel>
              <div className="space-y-6">
                {/* Performance Metrics Card */}
                <Card>
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-foreground">Performance Metrics</h3>
                    <p className="text-sm text-muted">Block timing and attestation statistics</p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {['Block First Seen At', 'Gas Used', 'Participation', 'Block Votes'].map(label => (
                      <div key={label}>
                        <dt className="text-xs font-medium text-muted">{label}</dt>
                        <dd className="mt-2 flex items-center gap-3">
                          <LoadingContainer className="size-12 rounded-full" />
                          <div>
                            <LoadingContainer className="h-5 w-16 rounded-sm" />
                          </div>
                        </dd>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Network Propagation Card */}
                <Card>
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-foreground">Network Propagation</h3>
                    <p className="text-sm text-muted">Nodes that received block data</p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <dt className="text-xs font-medium text-muted">Block Nodes</dt>
                      <dd className="mt-1">
                        <LoadingContainer className="h-6 w-12 rounded-sm" />
                      </dd>
                    </div>
                  </div>
                </Card>

                {/* MEV Activity Card */}
                <Card>
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-foreground">MEV Activity</h3>
                    <p className="text-sm text-muted">Block builder and relay participation</p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {['Relays', 'Builders'].map(label => (
                      <div key={label}>
                        <dt className="text-xs font-medium text-muted">{label}</dt>
                        <dd className="mt-2">
                          <LoadingContainer className="h-6 w-12 rounded-sm" />
                          <div className="mt-1">
                            <LoadingContainer className="h-4 w-24 rounded-sm" />
                          </div>
                        </dd>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </TabPanel>
          </TabPanels>
        </TabGroup>
      </div>
    </>
  );
}
