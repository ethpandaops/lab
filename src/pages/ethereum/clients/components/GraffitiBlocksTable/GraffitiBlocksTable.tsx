import type { ComponentProps, JSX, ReactNode } from 'react';
import clsx from 'clsx';
import { createColumnHelper } from '@tanstack/react-table';
import type { FctBlockGraffiti } from '@/api/types.gen';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import { Timestamp } from '@/components/DataDisplay/Timestamp';
import { Badge } from '@/components/Elements/Badge';
import { ClientLabel } from '@/components/Ethereum/ClientLabel';
import { Entity } from '@/components/Ethereum/Entity';
import { Slot } from '@/components/Ethereum/Slot';
import { Validator } from '@/components/Ethereum/Validator';
import { Alert } from '@/components/Feedback/Alert';
import { Card } from '@/components/Layout/Card';
import { GRAFFITI_FORMAT_LABELS } from '../../constants';
import { useGraffitiBlocks } from '../../hooks/useGraffitiBlocks';
import {
  DEFAULT_BLOCK_PAGE_SIZE,
  hasRangeStart,
  paginationUpdate,
  parseSort,
  sortUpdate,
  type BlockFilterKey,
  type BlockSearch,
} from '../../utils/block-filters';
import { normaliseClient } from '../../utils/client-share';
import { shortVersion } from '../../utils/client-versions';
import { BlockFilterPanel } from './BlockFilterPanel';

export interface GraffitiBlocksTableProps {
  /** Search params, with whatever the page fixes (its client or entity) already applied */
  search: BlockSearch;
  /** Filters users can change here */
  fields: readonly BlockFilterKey[];
  onSearchChange: (update: Partial<BlockSearch>) => void;
  /** Hide the entity column, e.g. on an entity's own page */
  hideEntity?: boolean;
  /** Controls shown before the filters */
  toolbar?: ReactNode;
}

/** Badge color per graffiti format: client codes and version strings parsed, the rest did not */
function formatColor(format: string | undefined): 'indigo' | 'blue' | 'gray' {
  if (format?.startsWith('codes')) return 'indigo';
  if (format === 'version_string') return 'blue';
  return 'gray';
}

/**
 * Client logo, name and version. Lifts the global img max-width, which otherwise drops the logo from the label's
 * intrinsic width so the version overlaps the name inside table cells.
 */
function ClientCell(props: ComponentProps<typeof ClientLabel>): JSX.Element {
  return (
    <span className="[&_img]:max-w-none">
      <ClientLabel {...props} />
    </span>
  );
}

const columnHelper = createColumnHelper<FctBlockGraffiti>();

/**
 * Blocks with the raw graffiti and the clients parsed from it. Newest first by default; filters, sort and page
 * live in the URL and run server-side.
 */
export function GraffitiBlocksTable({
  search,
  fields,
  onSearchChange,
  hideEntity = false,
  toolbar,
}: GraffitiBlocksTableProps): JSX.Element {
  // Without a range start only newest first, which reads all history in widening windows, can be shown
  const sortable = hasRangeStart(search);
  const { blocks, isLoading, isPlaceholderData, error, hasNextPage } = useGraffitiBlocks(
    sortable ? search : { ...search, sort: undefined }
  );
  const { field, desc } = parseSort(sortable ? search.sort : undefined);
  const hasFilters = fields.some(key => search[key] !== undefined);
  const canFilterFormat = fields.includes('format');

  const columns = [
    columnHelper.accessor('slot', {
      header: 'Slot',
      cell: info => <Slot slot={info.getValue() ?? 0} />,
      meta: { cellClassName: 'font-medium text-foreground' },
    }),
    columnHelper.accessor('slot_start_date_time', {
      header: 'Time',
      cell: info => <Timestamp timestamp={info.getValue() ?? 0} format="relative" className="text-muted" />,
    }),
    columnHelper.accessor('proposer_index', {
      header: 'Proposer',
      cell: info => <Validator index={info.getValue() ?? 0} />,
      meta: { cellClassName: 'text-muted' },
    }),
    ...(hideEntity
      ? []
      : [
          columnHelper.accessor('entity', {
            header: 'Entity',
            cell: info => <Entity entity={info.getValue()} />,
            meta: { cellClassName: 'text-foreground' },
          }),
        ]),
    columnHelper.accessor('consensus_client', {
      header: 'Consensus',
      cell: info => {
        const row = info.row.original;
        const version = shortVersion(row.consensus_client_version);
        return (
          <ClientCell
            client={normaliseClient(row.consensus_client)}
            version={version || undefined}
            detail={version ? undefined : row.consensus_client_commit || undefined}
          />
        );
      },
    }),
    columnHelper.accessor('execution_client', {
      header: 'Execution',
      cell: info => (
        <ClientCell
          client={normaliseClient(info.getValue())}
          detail={info.row.original.execution_client_commit || undefined}
        />
      ),
    }),
    columnHelper.accessor('graffiti_format', {
      header: 'Format',
      cell: info => {
        const format = info.getValue();
        const badge = (
          <Badge color={formatColor(format)} size="small" variant="flat">
            {GRAFFITI_FORMAT_LABELS[format ?? ''] ?? format ?? '-'}
          </Badge>
        );
        if (!canFilterFormat || !format || search.format === format) return badge;
        return (
          <button
            type="button"
            onClick={() => onSearchChange({ format, page: undefined })}
            title={`Only ${GRAFFITI_FORMAT_LABELS[format] ?? format}`}
            className="cursor-pointer transition-opacity hover:opacity-80"
          >
            {badge}
          </button>
        );
      },
    }),
    columnHelper.accessor('graffiti_text', {
      header: 'Graffiti',
      cell: info => {
        const text = info.getValue();
        return text ? (
          <span className="block max-w-xs truncate font-mono text-xs/6 text-foreground" title={text}>
            {text}
          </span>
        ) : (
          <span className="text-muted">Empty</span>
        );
      },
    }),
  ] as DataTableColumn<FctBlockGraffiti>[];

  return (
    <Card rounded title="Blocks">
      {/* The table stays the body's last child so it sits flush with the card's bottom edge */}
      <div
        className={clsx(
          'flex flex-col gap-4 [&>:last-child]:transition-opacity',
          isPlaceholderData && '[&>:last-child]:opacity-60'
        )}
      >
        <div className="flex flex-wrap items-center gap-3">
          {toolbar}
          <BlockFilterPanel filters={search} fields={fields} onChange={onSearchChange} />
        </div>
        {error && <Alert variant="error" title="Failed to load blocks" description={error.message} />}
        <DataTable
          data={blocks}
          columns={sortable ? columns : columns.map(column => ({ ...column, enableSorting: false }))}
          isLoading={isLoading}
          getRowId={row => `${row.slot}-${row.block_root}`}
          pageIndex={(search.page ?? 1) - 1}
          pageSize={search.size ?? DEFAULT_BLOCK_PAGE_SIZE}
          onPaginationChange={(pageIndex, pageSize) => onSearchChange(paginationUpdate(search, pageIndex, pageSize))}
          hasNextPage={hasNextPage}
          sorting={[{ id: field, desc }]}
          onSortingChange={sorting => onSearchChange(sortUpdate(sorting))}
          manualPagination
          manualSorting
          hideGlobalFilter
          hideColumnVisibility
          paginationPosition="bottom"
          density="comfortable"
          emptyMessage={hasFilters ? 'No blocks match these filters' : 'No blocks yet'}
        />
      </div>
    </Card>
  );
}
