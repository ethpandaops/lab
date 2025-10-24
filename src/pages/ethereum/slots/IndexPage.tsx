import { type JSX, useMemo, useCallback, useRef, useEffect, type ReactNode } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { Table } from '@/components/Lists/Table';
import type { Column } from '@/components/Lists/Table/Table.types';
import { useInfiniteSlotsData, type SlotData } from './hooks';
import { getRelativeTime, formatTimestamp } from '@/utils/time';
import { SLOTS_PER_EPOCH } from '@/utils/beacon';
import clsx from 'clsx';
import { ArrowPathIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

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
  const { slots, isLoading, error, hasNextPage, fetchNextPage, isFetchingNextPage, currentSlot } =
    useInfiniteSlotsData();
  const navigate = useNavigate();

  /**
   * Capture the initial current slot once on mount
   */
  const initialCurrentSlot = useRef<number | null>(null);
  useEffect(() => {
    if (currentSlot > 0 && initialCurrentSlot.current === null) {
      initialCurrentSlot.current = currentSlot;
    }
  }, [currentSlot]);

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
  const slotsWithCurrent = useMemo(() => {
    // Only insert if we have captured the initial slot
    if (initialCurrentSlot.current === null) return slots;

    // Check if initial current slot is already in the list
    const hasCurrentSlot = slots.some(s => s.slot === initialCurrentSlot.current);
    if (hasCurrentSlot) return slots;

    // If not, create a placeholder entry for initial current slot
    const currentSlotData: SlotData = {
      slot: initialCurrentSlot.current,
      epoch: Math.floor(initialCurrentSlot.current / SLOTS_PER_EPOCH),
      proposerIndex: null,
      blobCount: null,
      status: null,
      hasData: false,
      blockRoot: null,
      timestamp: Date.now() / 1000,
      proposerEntity: null,
    };

    return [currentSlotData, ...slots];
  }, [slots]);

  const columns = useMemo<Column<SlotData>[]>(
    () => [
      {
        header: 'Slot',
        accessor: 'slot',
        cellClassName: 'text-foreground font-semibold',
      },
      {
        header: 'Epoch',
        accessor: (row): ReactNode => {
          const rowIndex = slotsWithCurrent.findIndex(s => s.slot === row.slot);
          const isEpochTransition = rowIndex > 0 && row.epoch !== slotsWithCurrent[rowIndex - 1]?.epoch;

          return (
            <span
              className={clsx(
                'rounded-sm px-2 py-0.5 text-sm/6 font-medium',
                isEpochTransition ? 'bg-accent/10 text-accent' : 'text-muted'
              )}
            >
              {row.epoch}
            </span>
          );
        },
        cellClassName: 'text-muted',
      },
      {
        header: 'Timestamp',
        accessor: row =>
          row.timestamp > 0
            ? formatTimestamp(row.timestamp, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })
            : '-',
        cellClassName: 'text-muted text-xs',
      },
      {
        header: 'Relative Time',
        accessor: row => (row.timestamp > 0 ? getRelativeTime(row.timestamp) : '-'),
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
    [slotsWithCurrent]
  );

  // Loading state (initial load only)
  if (isLoading) {
    return (
      <Container>
        <Header
          title="Slots"
          description="Browse Ethereum consensus layer slots with detailed block, proposer, and blob information"
        />
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
        <Header
          title="Slots"
          description="Browse Ethereum consensus layer slots with detailed block, proposer, and blob information"
        />
        <div className="mt-8 rounded-sm border border-danger/20 bg-danger/10 p-4 text-danger">
          Error loading slots: {error.message}
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <Header
        title="Slots"
        description="Browse Ethereum consensus layer slots with detailed block, proposer, and blob information"
      />

      {/* Slots Table */}
      <div className="mt-6">
        <Table
          data={slotsWithCurrent}
          columns={columns}
          variant="nested"
          onRowClick={handleRowClick}
          getRowKey={row => row.slot}
          getRowClassName={(row, rowIndex) => {
            // Highlight initial current slot (captured on mount)
            const isCurrentSlot = row.slot === initialCurrentSlot.current;

            // Alternate background color based on epoch for better readability
            const isEvenEpoch = row.epoch % 2 === 0;

            // Check if this is the first slot of a new epoch (epoch transition)
            const isEpochTransition = rowIndex > 0 && row.epoch !== slotsWithCurrent[rowIndex - 1]?.epoch;

            return clsx(
              'transition-all duration-200',
              row.hasData ? 'cursor-pointer hover:bg-surface/80 hover:shadow-sm' : 'cursor-not-allowed opacity-50',
              isCurrentSlot && 'bg-primary/5 ring-1 ring-primary/20 ring-inset',
              // Subtle epoch alternation (only when not current slot)
              !isCurrentSlot && isEvenEpoch && 'bg-surface/30',
              // Add subtle top border at epoch transitions
              isEpochTransition && 'border-t-2 border-t-accent/20',
              // Staggered fade-in animation
              'animate-in fade-in slide-in-from-bottom-2 duration-300',
              {
                'animation-delay-75': rowIndex % 5 === 1,
                'animation-delay-150': rowIndex % 5 === 2,
                'animation-delay-200': rowIndex % 5 === 3,
                'animation-delay-300': rowIndex % 5 === 4,
              }
            );
          }}
          getRowStyle={(_, rowIndex) => ({
            animationDelay: `${(rowIndex % 5) * 50}ms`,
          })}
        />
      </div>

      {/* Load Older Slots Button */}
      {hasNextPage && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className={clsx(
              'group flex items-center gap-2 rounded-sm border border-border bg-surface px-6 py-3 text-sm/6 font-medium text-foreground shadow-xs transition-all duration-200',
              'hover:border-primary/50 hover:bg-primary/5 hover:shadow-sm',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border disabled:hover:bg-surface disabled:hover:shadow-xs'
            )}
          >
            {isFetchingNextPage ? (
              <>
                <ArrowPathIcon className="size-5 animate-spin text-primary" />
                <span>Loading older slots...</span>
              </>
            ) : (
              <>
                <span>Load Older Slots</span>
                <ChevronDownIcon className="size-5 transition-transform group-hover:translate-y-0.5" />
              </>
            )}
          </button>
        </div>
      )}

      {/* No Data Reached */}
      {!hasNextPage && slotsWithCurrent.length === 0 && (
        <div className="mt-8 rounded-sm border border-border bg-surface p-8 text-center text-muted">
          No slots found.
        </div>
      )}

      {/* Pagination Info */}
      {slotsWithCurrent.length > 0 && (
        <div className="mt-6 flex justify-center">
          <div className="rounded-sm bg-surface px-4 py-2 text-xs/5 text-muted">
            {slotsWithCurrent.length > 0 && (
              <>
                Slots {slotsWithCurrent[slotsWithCurrent.length - 1]?.slot.toLocaleString()} -{' '}
                {slotsWithCurrent[0]?.slot.toLocaleString()}
              </>
            )}
          </div>
        </div>
      )}
    </Container>
  );
}
