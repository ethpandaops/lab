import { type JSX, useMemo, useCallback, type ReactNode } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { Table } from '@/components/Lists/Table';
import type { Column } from '@/components/Lists/Table/Table.types';
import { Slot } from '@/components/Ethereum/Slot';
import { useSlotsPage, type SlotData } from './hooks';
import { RangePager } from '@/components/Lists/RangePager';
import { Alert } from '@/components/Feedback/Alert';
import { useNetwork } from '@/hooks/useNetwork';
import { getForkEpoch } from '@/utils/forks';
import { Timestamp } from '@/components/DataDisplay/Timestamp';
import { Epoch } from '@/components/Ethereum/Epoch';
import clsx from 'clsx';

/**
 * Slots list page component.
 *
 * Displays a paginated table of recent Ethereum consensus layer slots with:
 * - Slot number
 * - Epoch number
 * - Proposer validator index
 * - Blob count
 * - Status (canonical, orphaned, missed)
 * - Bidirectional pagination (load newer/older slots)
 * - Smooth animations and visual polish
 *
 * Rows are clickable to navigate to slot detail page if data is available.
 */
export function IndexPage(): JSX.Element {
  const { from } = useSearch({ from: '/ethereum/slots/' });
  const { slots, page, isLoading, isPlaceholderData, error } = useSlotsPage(from);
  const { currentNetwork } = useNetwork();
  const hasGloas = currentNetwork ? getForkEpoch(currentNetwork, 'gloas') !== null : false;
  const navigate = useNavigate();

  /**
   * Capture the initial current slot once on mount
   */

  /**
   * Handle row click to navigate to slot detail page
   */
  const handleRowClick = useCallback(
    (slot: SlotData) => {
      if (slot.hasData && slot.slot > 0) {
        navigate({ to: '/ethereum/slots/$slot', params: { slot: slot.slot.toString() } });
      }
    },
    [navigate]
  );

  const goToPage = useCallback(
    (next: number | undefined) => navigate({ to: '/ethereum/slots', search: prev => ({ ...prev, from: next }) }),
    [navigate]
  );

  /**
   * Skeleton data for loading state
   */
  const skeletonColumns = useMemo<Column<{ id: number }>[]>(
    () => [
      {
        header: 'Slot',
        accessor: () => <LoadingContainer className="h-5 w-20 rounded-sm" shimmer={false} />,
      },
      {
        header: 'Epoch',
        accessor: () => <LoadingContainer className="h-5 w-16 rounded-sm" shimmer={false} />,
      },
      {
        header: 'Timestamp',
        accessor: () => <LoadingContainer className="h-4 w-40 rounded-sm" shimmer={false} />,
      },
      {
        header: 'Relative Time',
        accessor: () => <LoadingContainer className="h-4 w-28 rounded-sm" shimmer={false} />,
      },
      {
        header: 'Proposer Index',
        accessor: () => <LoadingContainer className="h-5 w-16 rounded-sm" shimmer={false} />,
      },
      {
        header: 'Proposer Entity',
        accessor: () => <LoadingContainer className="h-5 w-24 rounded-sm" shimmer={false} />,
      },
      {
        header: 'Blob Count',
        accessor: () => <LoadingContainer className="h-5 w-8 rounded-sm" shimmer={false} />,
      },
      {
        header: 'Status',
        accessor: () => <LoadingContainer className="h-5 w-20 rounded-sm" shimmer={false} />,
      },
    ],
    []
  );

  const skeletonData = useMemo(() => Array.from({ length: 10 }, (_, i) => ({ id: i })), []);

  /**
   * Table column definitions
   */

  /**
   * Prepend initial current slot to the slots array for display (only once on mount)
   */

  const columns = useMemo<Column<SlotData>[]>(
    () => [
      {
        header: 'Slot',
        accessor: (row): ReactNode => <Slot slot={row.slot} />,
        cellClassName: 'text-foreground font-semibold',
      },
      {
        header: 'Epoch',
        accessor: (row): ReactNode => {
          const rowIndex = slots.findIndex(s => s.slot === row.slot);
          const isEpochTransition = rowIndex > 0 && row.epoch !== slots[rowIndex - 1]?.epoch;

          return (
            <span
              className={clsx(
                'rounded-sm px-2 py-0.5 text-sm/6 font-medium',
                isEpochTransition ? 'bg-accent/10 text-accent' : 'text-muted'
              )}
            >
              <Epoch epoch={row.epoch} />
            </span>
          );
        },
        cellClassName: 'text-muted',
      },
      {
        header: 'Timestamp',
        accessor: row =>
          row.timestamp > 0 ? (
            <Timestamp timestamp={row.timestamp} format="short" className="text-xs text-muted" />
          ) : (
            '-'
          ),
        cellClassName: 'text-muted text-xs',
      },
      {
        header: 'Relative Time',
        accessor: row =>
          row.timestamp > 0 ? (
            <Timestamp timestamp={row.timestamp} format="relative" className="text-xs text-muted" />
          ) : (
            '-'
          ),
        cellClassName: 'text-muted text-xs',
      },
      {
        header: 'Proposer Index',
        accessor: row => (row.proposerIndex !== null ? row.proposerIndex : '-'),
        cellClassName: 'text-muted',
      },
      {
        header: 'Proposer Entity',
        accessor: row => (row.proposerEntity ? row.proposerEntity : '-'),
        cellClassName: 'text-muted',
      },
      {
        header: 'Blob Count',
        accessor: row => (row.blobCount !== null ? row.blobCount : '-'),
        cellClassName: 'text-muted',
      },
      ...(hasGloas
        ? [
            {
              header: 'Payload',
              accessor: (row: SlotData): ReactNode => {
                // The PTC's verdict on whether the builder revealed in time.
                if (row.ptcVotesSeen == null || row.ptcVotesSeen === 0) {
                  return <span className="text-muted">-</span>;
                }

                const delivered = (row.ptcPresentVotes ?? 0) * 2 >= row.ptcVotesSeen;

                return (
                  <span
                    className={clsx('font-medium', delivered ? 'text-success' : 'text-danger')}
                    title={`PTC: ${row.ptcPresentVotes ?? 0}/${row.ptcVotesSeen} present votes`}
                  >
                    {delivered ? 'Delivered' : 'Absent'}
                  </span>
                );
              },
              cellClassName: 'text-muted',
            },
          ]
        : []),
      {
        header: 'Status',
        accessor: row => {
          // Show data availability status instead of block status
          if (row.hasData) {
            return <span className={clsx('font-medium text-success')}>Ready</span>;
          }

          // Check if slot is in the future
          if (row.timestamp > Date.now() / 1000) {
            return <span className={clsx('font-medium text-muted')}>Scheduled</span>;
          }

          // Slot has occurred but no data
          return <span className={clsx('font-medium text-warning')}>Processing</span>;
        },
        cellClassName: 'text-muted',
      },
    ],
    [slots, hasGloas]
  );

  // Loading state (initial load only)
  if (isLoading) {
    return (
      <Container>
        <Header title="Slots" />
        <div className="mt-6">
          <Table
            data={skeletonData}
            columns={skeletonColumns}
            variant="nested"
            getRowClassName={() => 'bg-surface/30'}
          />
        </div>
      </Container>
    );
  }

  // Error state
  if (error) {
    return (
      <Container>
        <Header title="Slots" />
        <Alert variant="error" title="Error loading slots" description={error.message} />
      </Container>
    );
  }

  return (
    <Container>
      <Header title="Slots" />

      <RangePager page={page} noun="slot" onNavigate={goToPage} className="mb-4" />

      <div className={clsx('transition-opacity', isPlaceholderData && 'opacity-60')}>
        <Table
          data={slots}
          columns={columns}
          variant="nested"
          onRowClick={handleRowClick}
          getRowKey={row => row.slot}
          getRowClassName={(row, rowIndex) => {
            const isCurrentSlot = page.isLatest && row.slot === page.top;
            const isEvenEpoch = row.epoch % 2 === 0;
            const isEpochTransition = rowIndex > 0 && row.epoch !== slots[rowIndex - 1]?.epoch;

            return clsx(
              row.hasData ? 'cursor-pointer hover:bg-surface/80' : 'cursor-not-allowed opacity-50',
              isCurrentSlot && 'bg-primary/5',
              !isCurrentSlot && isEvenEpoch && 'bg-surface/30',
              isEpochTransition && 'border-t-2 border-t-accent/20'
            );
          }}
        />
      </div>

      <RangePager page={page} noun="slot" onNavigate={goToPage} className="mt-4" />
    </Container>
  );
}
