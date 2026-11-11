import type { JSX } from 'react';
import { Link } from '@tanstack/react-router';
import type { FctBlockDataColumnCompletion } from '@/api/types.gen';
import { Card } from '@/components/Layout/Card';
import { Table } from '@/components/Lists/Table';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { formatSlot } from '@/utils';
import { formatSeconds } from '@/pages/ethereum/data-availability/partial-columns/utils/partial-columns';

export interface SlowestBlocksProps {
  blocks: FctBlockDataColumnCompletion[];
  /** Window the blocks are ranked in, shown under the title */
  scope: string;
  isLoading: boolean;
  error: Error | null;
}

/**
 * The blocks whose columns took longest to complete, each linked to its slot's propagation.
 */
export function SlowestBlocks({ blocks, scope, isLoading, error }: SlowestBlocksProps): JSX.Element {
  return (
    <Card rounded title="Slowest blocks" subtitle={scope}>
      {error ? (
        <p className="text-sm text-danger">Failed to load blocks: {error.message}</p>
      ) : isLoading ? (
        <LoadingContainer className="h-64 rounded-sm" />
      ) : blocks.length === 0 ? (
        <p className="text-sm text-muted">No blocks in this window.</p>
      ) : (
        <Table
          variant="nested"
          data={blocks}
          getRowKey={row => `${row.slot}-${row.block_root}`}
          columns={[
            {
              header: 'Slot',
              accessor: row =>
                row.slot === undefined ? (
                  '-'
                ) : (
                  <Link
                    to="/ethereum/slots/$slot"
                    params={{ slot: String(row.slot) }}
                    search={{ tab: 'propagation' }}
                    className="font-mono text-primary hover:underline"
                  >
                    {formatSlot(row.slot)}
                  </Link>
                ),
            },
            {
              header: 'Blobs',
              accessor: row => row.blob_count ?? '-',
              cellClassName: 'text-right tabular-nums',
              headerClassName: 'text-right',
            },
            {
              header: 'p50',
              accessor: row => formatSeconds(row.p50_completion_slot_start_diff),
              cellClassName: 'text-right tabular-nums',
              headerClassName: 'text-right',
            },
            {
              header: 'p90',
              accessor: row => formatSeconds(row.p90_completion_slot_start_diff),
              cellClassName: 'text-right tabular-nums font-medium text-foreground',
              headerClassName: 'text-right',
            },
          ]}
        />
      )}
    </Card>
  );
}
