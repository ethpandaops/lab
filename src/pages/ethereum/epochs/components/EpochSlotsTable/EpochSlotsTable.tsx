import type { JSX } from 'react';
import { useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Badge } from '@/components/Elements/Badge';
import { Table } from '@/components/Lists/Table';
import type { Column } from '@/components/Lists/Table/Table.types';
import { formatTimestamp, getRelativeTime } from '@/utils/time';
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
export function EpochSlotsTable({ slots }: EpochSlotsTableProps): JSX.Element {
  const navigate = useNavigate();

  /**
   * Sort slots by slot number ascending
   */
  const sortedSlots = useMemo((): SlotData[] => {
    return [...slots].sort((a, b) => a.slot - b.slot);
  }, [slots]);

  /**
   * Table column definitions
   */
  const columns: Column<SlotData>[] = useMemo(
    () => [
      {
        header: 'Slot',
        accessor: row => <span className="font-medium text-foreground">{row.slot}</span>,
        cellClassName: 'text-foreground',
      },
      {
        header: 'Timestamp',
        accessor: row => (
          <div>
            <div className="text-muted">{formatTimestamp(row.slotStartDateTime)}</div>
            <div className="text-sm text-muted">{getRelativeTime(row.slotStartDateTime)}</div>
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
      {
        header: 'Block First Seen',
        accessor: row => {
          if (row.blockFirstSeenTime === null) {
            return <span className="text-muted">-</span>;
          }

          const timeInSeconds = row.blockFirstSeenTime / 1000;
          let colorClass = 'text-muted';

          // Color coding based on time
          if (timeInSeconds >= 4) {
            colorClass = 'text-danger'; // Red after 4s
          } else if (timeInSeconds >= 3) {
            colorClass = 'text-warning'; // Slightly red after 3s (using warning which is orangish-red)
          } else if (timeInSeconds >= 2) {
            colorClass = 'text-orange-500'; // Orange between 2-3s
          }

          return <span className={colorClass}>{timeInSeconds.toFixed(3)}s</span>;
        },
      },
    ],
    []
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

  return (
    <Table data={sortedSlots} columns={columns} variant="nested" onRowClick={handleRowClick} getRowKey={getRowKey} />
  );
}
