import type { JSX } from 'react';
import { useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';

import { Table } from '@/components/Lists/Table';
import type { Column } from '@/components/Lists/Table/Table.types';
import { Slot } from '@/components/Ethereum/Slot';
import { Epoch } from '@/components/Ethereum/Epoch';
import { Timestamp } from '@/components/DataDisplay/Timestamp';
import type { FctBlockProposerEntity } from '@/api/types.gen';

import type { BlockProposalsTableProps } from './BlockProposalsTable.types';

/**
 * Display block proposals with slot, epoch, and timestamp
 *
 * Shows:
 * - Slot number (clickable link to slot detail)
 * - Epoch number (clickable link to epoch detail)
 * - Timestamp (absolute and relative)
 *
 * Rows are clickable and navigate to the slot detail page.
 * Shows most recent 100 blocks.
 */
export function BlockProposalsTable({ blocks }: BlockProposalsTableProps): JSX.Element {
  const navigate = useNavigate();

  /**
   * Sort blocks by slot number descending (most recent first)
   */
  const sortedBlocks = useMemo((): FctBlockProposerEntity[] => {
    return [...blocks].sort((a, b) => (b.slot ?? 0) - (a.slot ?? 0));
  }, [blocks]);

  /**
   * Table column definitions
   */
  const columns: Column<FctBlockProposerEntity>[] = useMemo(
    () => [
      {
        header: 'Slot',
        accessor: row => (
          <span className="font-medium text-foreground">
            <Slot slot={row.slot ?? 0} />
          </span>
        ),
        cellClassName: 'text-foreground',
      },
      {
        header: 'Epoch',
        accessor: row => (
          <span className="text-muted">
            <Epoch epoch={row.epoch ?? 0} />
          </span>
        ),
      },
      {
        header: 'Timestamp',
        accessor: row => (
          <div>
            <div className="text-muted">
              <Timestamp timestamp={row.slot_start_date_time ?? 0} format="short" />
            </div>
            <div className="text-sm text-muted">
              <Timestamp timestamp={row.slot_start_date_time ?? 0} format="relative" />
            </div>
          </div>
        ),
      },
    ],
    []
  );

  /**
   * Handle row click - navigate to slot detail page
   */
  const handleRowClick = (row: FctBlockProposerEntity): void => {
    if (row.slot) {
      navigate({ to: '/ethereum/slots/$slot', params: { slot: row.slot.toString() } });
    }
  };

  /**
   * Generate unique key for each row
   */
  const getRowKey = (row: FctBlockProposerEntity): number => row.slot ?? 0;

  return (
    <div className="space-y-4">
      {/* Table */}
      <Table data={sortedBlocks} columns={columns} variant="nested" onRowClick={handleRowClick} getRowKey={getRowKey} />
    </div>
  );
}
