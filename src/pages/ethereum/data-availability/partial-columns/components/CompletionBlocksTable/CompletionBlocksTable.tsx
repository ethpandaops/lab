import type { JSX } from 'react';
import { Card } from '@/components/Layout/Card';
import { Table } from '@/components/Lists/Table';
import type { Column } from '@/components/Lists/Table/Table.types';
import { Slot } from '@/components/Ethereum/Slot';
import { Timestamp } from '@/components/DataDisplay/Timestamp';
import { Button } from '@/components/Elements/Button';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { PATH_COLORS, PATH_LABELS } from '../../constants';
import type { CompletionPath } from '../../IndexPage.types';
import type { CompletionBlock } from '../../hooks';
import { formatSeconds, formatShare } from '../../utils/partial-columns';

export interface CompletionBlocksTableProps {
  blocks: CompletionBlock[];
  isLoading: boolean;
  error: Error | null;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
}

/** Completions of one block per path, in stacking order */
function blockPaths(block: CompletionBlock): Array<{ path: CompletionPath; count: number }> {
  return [
    { path: 'FULL_GOSSIP' as const, count: block.full_gossip_completion_count ?? 0 },
    { path: 'PARTIAL_GOSSIP' as const, count: block.partial_gossip_completion_count ?? 0 },
    { path: 'EL' as const, count: block.el_completion_count ?? 0 },
    { path: 'RECONSTRUCTION' as const, count: block.reconstruction_completion_count ?? 0 },
    { path: 'UNKNOWN' as const, count: block.unknown_completion_count ?? 0 },
  ].filter(entry => entry.count > 0);
}

/** Horizontal bar of a block's completions split by path */
function PathBar({ block }: { block: CompletionBlock }): JSX.Element {
  const total = block.completion_count ?? 0;
  const paths = blockPaths(block);
  const title = paths.map(entry => `${PATH_LABELS[entry.path]}: ${entry.count}`).join(', ');
  return (
    <span className="flex h-2 w-40 overflow-hidden rounded-full bg-border/50" title={title}>
      {total > 0 &&
        paths.map(entry => (
          <span
            key={entry.path}
            className="block h-full"
            style={{ width: `${(entry.count / total) * 100}%`, backgroundColor: PATH_COLORS[entry.path] }}
          />
        ))}
    </span>
  );
}

const columns: Column<CompletionBlock>[] = [
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
  { header: 'Blobs', accessor: row => row.blob_count ?? '-', cellClassName: 'tabular-nums text-muted' },
  {
    header: 'Completions',
    accessor: row => (
      <span className="flex items-center gap-2">
        <PathBar block={row} />
        <span className="text-xs text-muted tabular-nums">{row.completion_count ?? 0}</span>
      </span>
    ),
  },
  {
    header: 'Partial',
    accessor: row => formatShare(row.partial_gossip_completion_count ?? 0, row.completion_count ?? 0),
    cellClassName: 'tabular-nums text-foreground',
  },
  {
    header: 'EL cells',
    accessor: row => formatShare(row.cells_from_el ?? 0, row.cells_total ?? 0),
    cellClassName: 'tabular-nums text-foreground',
  },
  {
    header: 'p50',
    accessor: row => formatSeconds(row.p50_completion_slot_start_diff),
    cellClassName: 'tabular-nums text-foreground',
  },
  {
    header: 'p90',
    accessor: row => formatSeconds(row.p90_completion_slot_start_diff),
    cellClassName: 'tabular-nums text-muted',
  },
  {
    header: 'Node done',
    accessor: row => formatSeconds(row.p50_node_last_completion_slot_start_diff),
    cellClassName: 'tabular-nums text-foreground',
  },
  {
    header: 'Header',
    accessor: row => formatSeconds(row.header?.seen_slot_start_diff),
    cellClassName: 'tabular-nums text-muted',
  },
];

/**
 * Recent blocks with how sentry nodes completed their columns, newest first.
 */
export function CompletionBlocksTable({
  blocks,
  isLoading,
  error,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: CompletionBlocksTableProps): JSX.Element {
  return (
    <Card
      rounded
      title="Blocks"
      subtitle={
        <>
          Column completions across all sentry nodes by path, with completion times from slot start. Node done is when
          the median node completed its last column, and header is when a node first received the partial column header.
        </>
      }
    >
      {error && <p className="text-sm text-danger">Failed to load blocks: {error.message}</p>}
      {!error && isLoading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <LoadingContainer key={`block-row-${i}`} className="h-8 w-full rounded-xs" />
          ))}
        </div>
      )}
      {!error && !isLoading && blocks.length === 0 && (
        <p className="text-sm text-muted">No blocks with column completions in this window.</p>
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
