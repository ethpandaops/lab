import type { JSX } from 'react';
import { useMemo } from 'react';
import clsx from 'clsx';
import { Badge } from '@/components/Elements/Badge';
import { Slot } from '@/components/Ethereum/Slot';
import { Table } from '@/components/Lists/Table';
import type { Column } from '@/components/Lists/Table/Table.types';
import { Timestamp } from '@/components/DataDisplay/Timestamp';
import { useBeaconClock } from '@/hooks/useBeaconClock';
import { useTablesBounds } from '@/hooks/useBounds';
import { useNetwork } from '@/hooks/useNetwork';
import { timestampToSlot } from '@/utils/beacon';
import type { SlotData } from '../../hooks/useEpochDetailData.types';
import type { EpochSlotsTableProps } from './EpochSlotsTable.types';

/**
 * Display all slots in an epoch with comprehensive metrics
 *
 * Shows:
 * - Slot number with slot-in-epoch subtext (clickable link to slot detail)
 * - Relative timestamp
 * - Proposer details (index and entity)
 * - Block status (canonical, proposed, missed, pending, scheduled)
 * - Blob count
 * - Attestation metrics (head correct count, participation %)
 *
 * Status determination:
 * - Canonical: Slot appears in canonical chain (int_block_canonical)
 * - Proposed: Slot appears in head chain but not canonical (fct_block_head)
 * - Missed: Slot is missing from both chains AND datasources have processed beyond this slot
 * - Pending: Slot appears to be missing but datasources haven't processed it yet
 * - Scheduled: Future slot (beyond current beacon clock slot)
 *
 * Users can click on slot numbers to navigate to slot detail pages.
 * Timestamp component has interactive popup for more details.
 */
export function EpochSlotsTable({
  slots,
  showSlotInEpoch = true,
  enableRealtimeHighlighting = true,
  sortOrder = 'asc',
}: EpochSlotsTableProps): JSX.Element {
  const { slot: currentSlot } = useBeaconClock();
  const { currentNetwork } = useNetwork();

  // Fetch bounds for block tables to determine if we can confidently mark slots as missed
  // Use both int_block_canonical and fct_block_head since status is determined by presence in either
  const { data: boundsData } = useTablesBounds(['int_block_canonical', 'fct_block_head']);

  // Disable real-time features for historical views (prevents re-renders every 12s)
  const effectiveCurrentSlot = enableRealtimeHighlighting ? currentSlot : Number.MAX_SAFE_INTEGER;

  // Determine the maximum slot we've processed in our datasources
  // Use minOfMaxes to get the earliest ending point across both tables
  // This ensures we only mark slots as missed if BOTH tables have processed beyond that slot
  // Bounds are returned as Unix timestamps, so convert to slot number
  const maxProcessedSlot = useMemo(() => {
    if (!boundsData?.aggregate.minOfMaxes || !currentNetwork) {
      return undefined;
    }
    return timestampToSlot(boundsData.aggregate.minOfMaxes, currentNetwork.genesis_time);
  }, [boundsData?.aggregate.minOfMaxes, currentNetwork]);

  /**
   * Sort slots by slot number
   */
  const sortedSlots = useMemo((): SlotData[] => {
    return [...slots].sort((a, b) => (sortOrder === 'asc' ? a.slot - b.slot : b.slot - a.slot));
  }, [slots, sortOrder]);

  /**
   * Table column definitions
   */
  const columns: Column<SlotData>[] = useMemo(
    () => [
      {
        header: 'Slot',
        accessor: row => {
          const isCurrent = row.slot === effectiveCurrentSlot;
          const isFuture = row.slot > effectiveCurrentSlot;
          const slotInEpoch = (row.slot % 32) + 1;

          return (
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">
                  <Slot slot={row.slot} />
                </span>
                {isCurrent && (
                  <Badge color="blue" variant="flat" className="text-xs">
                    Now
                  </Badge>
                )}
                {isFuture && (
                  <Badge color="gray" variant="border" className="text-xs">
                    Scheduled
                  </Badge>
                )}
              </div>
              {showSlotInEpoch && <div className="text-xs text-muted">{slotInEpoch}/32</div>}
            </div>
          );
        },
        cellClassName: 'text-foreground',
      },
      {
        header: 'Timestamp',
        accessor: row => (
          <div className="text-sm text-muted">
            <Timestamp timestamp={row.slotStartDateTime} format="relative" />
          </div>
        ),
      },
      {
        header: 'Proposer Index',
        accessor: row => <span className="text-muted">{row.proposerIndex !== null ? row.proposerIndex : '-'}</span>,
      },
      {
        header: 'Proposer Entity',
        accessor: row => <span className="text-muted">{row.proposerEntity || '-'}</span>,
      },
      {
        header: 'Status',
        accessor: row => {
          const isFuture = row.slot > effectiveCurrentSlot;

          // Future slots should show as "Scheduled" regardless of API status
          if (isFuture) {
            return (
              <Badge color="gray" variant="border">
                Scheduled
              </Badge>
            );
          }

          // Past/current slots show their actual status
          if (row.status === 'canonical') {
            return (
              <Badge color="green" variant="border">
                Canonical
              </Badge>
            );
          }
          if (row.status === 'proposed') {
            return (
              <Badge color="blue" variant="border">
                Proposed
              </Badge>
            );
          }

          // Only show "Missed" if we're confident the datasource has processed this slot
          // If maxProcessedSlot is undefined or the slot hasn't been processed yet, show "Pending"
          if (row.status === 'missed') {
            const hasBeenProcessed = maxProcessedSlot !== undefined && row.slot <= maxProcessedSlot;

            if (!hasBeenProcessed) {
              return (
                <Badge color="gray" variant="border">
                  Pending
                </Badge>
              );
            }

            return (
              <Badge color="yellow" variant="border">
                Missed
              </Badge>
            );
          }

          return (
            <Badge color="gray" variant="border">
              {row.status}
            </Badge>
          );
        },
      },
      {
        header: 'Blobs',
        accessor: row => <span className="text-muted">{row.blobCount}</span>,
      },
      {
        header: 'Attestations',
        accessor: row => (
          <span className="text-muted">
            {row.attestationHead} / {row.attestationMax}
          </span>
        ),
      },
      {
        header: 'Vote %',
        accessor: row => {
          const participation = row.attestationMax > 0 ? (row.attestationHead / row.attestationMax) * 100 : 0;
          const colorClass = participation >= 99 ? 'text-success' : participation < 95 ? 'text-warning' : 'text-muted';

          return <span className={colorClass}>{participation.toFixed(2)}%</span>;
        },
      },
    ],
    [effectiveCurrentSlot, showSlotInEpoch, maxProcessedSlot]
  );

  /**
   * Generate unique key for each row
   */
  const getRowKey = (row: SlotData): number => row.slot;

  /**
   * Apply visual styling based on slot timing relative to current slot
   */
  const getRowClassName = (row: SlotData): string => {
    const isCurrent = row.slot === effectiveCurrentSlot;
    const isFuture = row.slot > effectiveCurrentSlot;

    return clsx({
      // Current slot - highlighted with accent color
      'bg-accent/20 border-l-4 border-l-accent': isCurrent,
      // Future slots - muted appearance
      'opacity-50': isFuture,
      // Past slots - normal appearance (default)
    });
  };

  return (
    <Table
      data={sortedSlots}
      columns={columns}
      variant="nested"
      getRowKey={getRowKey}
      getRowClassName={getRowClassName}
    />
  );
}
