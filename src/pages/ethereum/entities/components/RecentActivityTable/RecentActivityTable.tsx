import type { JSX } from 'react';
import { useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';

import { Table } from '@/components/Lists/Table';
import type { Column } from '@/components/Lists/Table/Table.types';
import { Epoch } from '@/components/Ethereum/Epoch';

import type { EntityEpochData } from '../../hooks';
import type { RecentActivityTableProps } from './RecentActivityTable.types';

/**
 * Display recent epoch activity for an entity
 *
 * Shows:
 * - Epoch number (clickable link to epoch detail)
 * - Attested count
 * - Missed count
 * - Attestation rate percentage
 * - Blocks proposed
 *
 * Rows are clickable and navigate to the epoch detail page.
 */
export function RecentActivityTable({ epochs }: RecentActivityTableProps): JSX.Element {
  const navigate = useNavigate();

  /**
   * Sort epochs by epoch number descending (most recent first) and limit to 5
   */
  const sortedEpochs = useMemo((): EntityEpochData[] => {
    return [...epochs].sort((a, b) => b.epoch - a.epoch).slice(0, 5);
  }, [epochs]);

  /**
   * Table column definitions
   */
  const columns: Column<EntityEpochData>[] = useMemo(
    () => [
      {
        header: 'Epoch',
        accessor: row => (
          <span className="font-medium text-foreground">
            <Epoch epoch={row.epoch} />
          </span>
        ),
        cellClassName: 'text-foreground',
      },
      {
        header: 'Attested',
        accessor: row => (
          <span className="text-success">{(row.totalAttestations - row.missedAttestations).toLocaleString()}</span>
        ),
      },
      {
        header: 'Missed',
        accessor: row => {
          const colorClass = row.missedAttestations > 0 ? 'text-danger' : 'text-muted';
          return <span className={colorClass}>{row.missedAttestations.toLocaleString()}</span>;
        },
      },
      {
        header: 'Rate',
        accessor: row => {
          const rate = row.rate * 100;
          const colorClass = rate >= 99 ? 'text-success' : rate < 95 ? 'text-warning' : 'text-muted';

          return <span className={colorClass}>{rate.toFixed(2)}%</span>;
        },
      },
      {
        header: 'Proposals',
        accessor: row => <span className="text-muted">{row.blocksProposed}</span>,
      },
    ],
    []
  );

  /**
   * Handle row click - navigate to epoch detail page
   */
  const handleRowClick = (row: EntityEpochData): void => {
    navigate({ to: '/ethereum/epochs/$epoch', params: { epoch: row.epoch.toString() } });
  };

  /**
   * Generate unique key for each row
   */
  const getRowKey = (row: EntityEpochData): number => row.epoch;

  return (
    <Table data={sortedEpochs} columns={columns} variant="nested" onRowClick={handleRowClick} getRowKey={getRowKey} />
  );
}
