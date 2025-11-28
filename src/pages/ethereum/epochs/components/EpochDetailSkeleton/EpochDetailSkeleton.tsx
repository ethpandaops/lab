import type { JSX } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { Table } from '@/components/Lists/Table';
import { Button } from '@/components/Elements/Button';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { TabGroup, TabPanel, TabPanels } from '@headlessui/react';
import { Tab } from '@/components/Navigation/Tab';
import { ScrollableTabs } from '@/components/Navigation/ScrollableTabs';
import { formatEpoch } from '@/utils';

export interface EpochDetailSkeletonProps {
  /** The epoch number being loaded */
  epoch: number;
}

/**
 * Loading skeleton for the Epoch Detail page
 * Matches the layout of the epoch detail view with header, tabs, and slots table
 */
export function EpochDetailSkeleton({ epoch }: EpochDetailSkeletonProps): JSX.Element {
  const navigate = useNavigate();
  // Create skeleton data for 32 slot rows
  const skeletonSlots = Array.from({ length: 32 }, (_, i) => ({ id: i }));

  return (
    <>
      {/* Navigation Controls */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <Button
          variant="secondary"
          size="sm"
          rounded="sm"
          leadingIcon={<ChevronLeftIcon />}
          disabled={epoch === 0}
          onClick={() => navigate({ to: '/ethereum/epochs/$epoch', params: { epoch: String(epoch - 1) } })}
          aria-label="Previous epoch"
        >
          Previous
        </Button>
        <div className="flex-1" />
        <Button
          variant="secondary"
          size="sm"
          rounded="sm"
          trailingIcon={<ChevronRightIcon />}
          onClick={() => navigate({ to: '/ethereum/epochs/$epoch', params: { epoch: String(epoch + 1) } })}
          aria-label="Next epoch"
        >
          Next
        </Button>
      </div>

      {/* Epoch Header Skeleton */}
      <div className="overflow-hidden rounded-sm border border-border bg-surface">
        {/* Header section */}
        <div className="border-b border-border bg-background px-6 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-6">
              {/* EpochArt skeleton */}
              <div className="shrink-0">
                <LoadingContainer className="size-20 rounded-sm" />
              </div>

              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Epoch {formatEpoch(epoch)}</h1>
                <div className="mt-1">
                  <LoadingContainer className="h-5 w-56 rounded-sm" />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <LoadingContainer className="size-8 rounded-sm" />
              <LoadingContainer className="size-8 rounded-sm" />
              <LoadingContainer className="size-8 rounded-sm" />
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-4">
          {['Blocks', 'P95 Block Arrival', 'Attestation Participation', 'Missed Attestations'].map(label => (
            <div key={label} className="rounded-sm border border-border bg-background p-4">
              <dt className="text-xs font-medium text-muted">{label}</dt>
              <dd className="mt-1">
                <LoadingContainer className="h-6 w-16 rounded-sm" />
              </dd>
            </div>
          ))}
        </div>
      </div>

      {/* Tabbed Content Skeleton */}
      <div className="mt-8">
        <TabGroup selectedIndex={0}>
          <ScrollableTabs>
            <Tab>Slots</Tab>
            <Tab>Blocks</Tab>
            <Tab>Validators</Tab>
            <Tab>MEV</Tab>
          </ScrollableTabs>

          <TabPanels className="mt-6">
            {/* Slots Tab Skeleton */}
            <TabPanel>
              <Table
                variant="nested"
                data={skeletonSlots}
                columns={[
                  {
                    header: 'Slot',
                    accessor: () => <LoadingContainer className="h-5 w-20 rounded-sm" />,
                  },
                  {
                    header: 'Timestamp',
                    accessor: () => <LoadingContainer className="h-5 w-24 rounded-sm" />,
                  },
                  {
                    header: 'Proposer Index',
                    accessor: () => <LoadingContainer className="h-5 w-16 rounded-sm" />,
                  },
                  {
                    header: 'Proposer Entity',
                    accessor: () => <LoadingContainer className="h-5 w-24 rounded-sm" />,
                  },
                  {
                    header: 'Status',
                    accessor: () => <LoadingContainer className="h-5 w-20 rounded-sm" />,
                  },
                  {
                    header: 'Blobs',
                    accessor: () => <LoadingContainer className="h-5 w-8 rounded-sm" />,
                  },
                  {
                    header: 'Attestations',
                    accessor: () => <LoadingContainer className="h-5 w-24 rounded-sm" />,
                  },
                  {
                    header: 'Vote %',
                    accessor: () => <LoadingContainer className="h-5 w-16 rounded-sm" />,
                  },
                ]}
              />
            </TabPanel>
          </TabPanels>
        </TabGroup>
      </div>
    </>
  );
}
