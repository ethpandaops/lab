import type { JSX } from 'react';
import { Card } from '@/components/Layout/Card';
import { Table } from '@/components/Lists/Table';
import type { Column } from '@/components/Lists/Table/Table.types';
import { Slot } from '@/components/Ethereum/Slot';
import { Timestamp } from '@/components/DataDisplay/Timestamp';
import { Badge } from '@/components/Elements/Badge';
import { Button } from '@/components/Elements/Button';
import { Entity } from '@/components/Ethereum/Entity';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import type { FctBlockGraffiti } from '@/api/types.gen';
import { ClientLabel } from '@/components/Ethereum/ClientLabel';
import { GRAFFITI_FORMAT_LABELS } from '../../constants';
import { normaliseClient } from '../../utils/client-share';

export interface GraffitiBlocksTableProps {
  blocks: FctBlockGraffiti[];
  isLoading: boolean;
  error: Error | null;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
}

/** Badge color per graffiti format: client codes and version strings parsed, the rest did not */
function formatColor(format: string | undefined): 'indigo' | 'blue' | 'gray' {
  if (format?.startsWith('codes')) return 'indigo';
  if (format === 'version_string') return 'blue';
  return 'gray';
}

const columns: Column<FctBlockGraffiti>[] = [
  {
    header: 'Slot',
    accessor: row => (row.slot !== undefined ? <Slot slot={row.slot} /> : '-'),
    cellClassName: 'font-medium text-foreground',
  },
  {
    header: 'Time',
    accessor: row =>
      row.slot_start_date_time ? (
        <Timestamp timestamp={row.slot_start_date_time} format="relative" className="text-xs text-muted" />
      ) : (
        '-'
      ),
  },
  {
    header: 'Proposer',
    accessor: row => row.proposer_index ?? '-',
    cellClassName: 'tabular-nums text-muted',
  },
  {
    header: 'Entity',
    accessor: row => <Entity entity={row.entity} className="text-sm/6" />,
  },
  {
    header: 'Consensus',
    accessor: row => (
      <ClientLabel
        client={normaliseClient(row.consensus_client)}
        detail={row.consensus_client_version || row.consensus_client_commit || undefined}
      />
    ),
  },
  {
    header: 'Execution',
    accessor: row => (
      <ClientLabel client={normaliseClient(row.execution_client)} detail={row.execution_client_commit || undefined} />
    ),
  },
  {
    header: 'Format',
    accessor: row => (
      <Badge color={formatColor(row.graffiti_format)} size="small" variant="flat">
        {GRAFFITI_FORMAT_LABELS[row.graffiti_format ?? ''] ?? row.graffiti_format ?? '-'}
      </Badge>
    ),
  },
  {
    header: 'Graffiti',
    accessor: row =>
      row.graffiti_text ? (
        <span className="block max-w-xs truncate font-mono text-xs/6 text-foreground" title={row.graffiti_text}>
          {row.graffiti_text}
        </span>
      ) : (
        <span className="text-xs/6 text-muted">Empty</span>
      ),
  },
];

/**
 * Recent blocks with the raw graffiti and the clients parsed from it, newest first.
 */
export function GraffitiBlocksTable({
  blocks,
  isLoading,
  error,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: GraffitiBlocksTableProps): JSX.Element {
  return (
    <Card rounded title="Blocks">
      {error && <p className="text-sm text-danger">Failed to load blocks: {error.message}</p>}
      {!error && isLoading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <LoadingContainer key={`block-row-${i}`} className="h-8 w-full rounded-xs" />
          ))}
        </div>
      )}
      {!error && !isLoading && blocks.length === 0 && (
        <p className="text-sm text-muted">No blocks match in this window.</p>
      )}
      {!error && !isLoading && blocks.length > 0 && (
        <div className="flex flex-col gap-4">
          <Table variant="nested" data={blocks} columns={columns} getRowKey={row => `${row.slot}-${row.block_root}`} />
          {hasNextPage && (
            <div className="flex justify-center">
              <Button variant="secondary" size="sm" onClick={onLoadMore} disabled={isFetchingNextPage}>
                {isFetchingNextPage ? 'Loading' : 'Load older blocks'}
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
