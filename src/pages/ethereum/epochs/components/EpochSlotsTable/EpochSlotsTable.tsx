import type { JSX } from 'react';
import { useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import clsx from 'clsx';
import { Badge } from '@/components/Elements/Badge';
import { Slot } from '@/components/Ethereum/Slot';
import { Table } from '@/components/Lists/Table';
import type { Column } from '@/components/Lists/Table/Table.types';
import { Timestamp } from '@/components/DataDisplay/Timestamp';
import { useBeaconClock } from '@/hooks/useBeaconClock';
import type { SlotData } from '../../hooks/useEpochDetailData.types';
import type { EpochSlotsTableProps } from './EpochSlotsTable.types';

/**
 * Display all slots in an epoch with comprehensive metrics
 *
 * Shows:
 * - Slot number (clickable link to slot detail)
 * - Timestamp and relative time
 * - Proposer details (index and entity)
 * - Block status (canonical, missed)
 * - Blob count
 * - Attestation metrics (head correct count, participation %)
 * - Block first seen time (ms from slot start)
 *
 * Rows are clickable and navigate to the slot detail page.
 */
export function EpochSlotsTable({
  slots,
  showSlotInEpoch = true,
  enableRealtimeHighlighting = true,
  sortOrder = 'asc',
}: EpochSlotsTableProps): JSX.Element {
  const navigate = useNavigate();
  const { slot: currentSlot } = useBeaconClock();

  // Disable real-time features for historical views (prevents re-renders every 12s)
  const effectiveCurrentSlot = enableRealtimeHighlighting ? currentSlot : Number.MAX_SAFE_INTEGER;

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
      ...(showSlotInEpoch
        ? [
            {
              header: 'Slot in Epoch',
              accessor: (row: SlotData) => {
                const slotInEpoch = (row.slot % 32) + 1;
                return <span className="text-muted">{slotInEpoch}/32</span>;
              },
            },
          ]
        : []),
      {
        header: 'Slot',
        accessor: row => {
          const isCurrent = row.slot === effectiveCurrentSlot;
          const isFuture = row.slot > effectiveCurrentSlot;

          return (
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
          );
        },
        cellClassName: 'text-foreground',
      },
      {
        header: 'Timestamp',
        accessor: row => (
          <div>
            <div className="text-muted">
              <Timestamp timestamp={row.slotStartDateTime} format="short" />
            </div>
            <div className="text-sm text-muted">
              <Timestamp timestamp={row.slotStartDateTime} format="relative" />
            </div>
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
          if (row.status === 'missed') {
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
        header: 'Attestation Head',
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
    [effectiveCurrentSlot, showSlotInEpoch]
  );

  /**
   * Handle row click - navigate to slot detail page
   */
  const handleRowClick = (row: SlotData): void => {
    navigate({ to: '/ethereum/slots/$slot', params: { slot: row.slot.toString() } });
  };

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
      onRowClick={handleRowClick}
      getRowKey={getRowKey}
      getRowClassName={getRowClassName}
    />
  );
}
