import type { JSX } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { Card } from '@/components/Layout/Card';
import { Stats } from '@/components/DataDisplay/Stats';
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
      <Card
        title={`Epoch ${formatEpoch(epoch)}`}
        subtitle={<LoadingContainer className="mt-0.5 h-4 w-56 rounded-xs" />}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <LoadingContainer className="size-8 rounded-sm" />
            <LoadingContainer className="size-8 rounded-sm" />
            <LoadingContainer className="size-8 rounded-sm" />
          </div>
        }
      >
        <Stats
          gridClassName="grid grid-cols-2 sm:grid-cols-4"
          stats={['Blocks', 'P95 Block Arrival', 'Attestation Participation', 'Missed Attestations'].map(label => ({
            id: label,
            name: label,
            value: '-',
          }))}
        />
      </Card>

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
