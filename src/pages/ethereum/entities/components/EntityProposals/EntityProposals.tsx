import { type JSX, type ReactNode, useCallback } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import clsx from 'clsx';
import { createColumnHelper } from '@tanstack/react-table';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import { Timestamp } from '@/components/DataDisplay/Timestamp';
import { Slot } from '@/components/Ethereum/Slot';
import { Validator } from '@/components/Ethereum/Validator';
import { Alert } from '@/components/Feedback/Alert';
import { SegmentedControl } from '@/components/Forms/SegmentedControl';
import { Card } from '@/components/Layout/Card';
import { BlockFilterPanel, GraffitiBlocksTable } from '@/pages/ethereum/clients/components/GraffitiBlocksTable';
import {
  BLOCK_FILTER_KEYS,
  DEFAULT_BLOCK_PAGE_SIZE,
  GRAFFITI_FILTER_KEYS,
  clearFilters,
  hasRangeStart,
  paginationUpdate,
  parseSort,
  sortUpdate,
  type BlockFilterKey,
  type BlockSearch,
} from '@/pages/ethereum/clients/utils/block-filters';
import {
  STATUS_SORT_FIELDS,
  useEntityBlocksByStatus,
  type ProposalStatus,
  type StatusBlock,
} from '@/pages/ethereum/entities/hooks/useEntityBlocksByStatus';

export interface EntityProposalsProps {
  entity: string;
}

type Status = 'canonical' | ProposalStatus;

const STATUS_OPTIONS: Array<{ value: Status; label: string }> = [
  { value: 'canonical', label: 'Canonical' },
  { value: 'orphaned', label: 'Orphaned' },
  { value: 'missed', label: 'Missed' },
];

/** The entity is fixed by the page */
const CANONICAL_FIELDS = BLOCK_FILTER_KEYS.filter(key => key !== 'entity');
/** Missed and orphaned slots have no graffiti on chain */
const STATUS_FIELDS = CANONICAL_FIELDS.filter(key => !GRAFFITI_FILTER_KEYS.includes(key));

const columnHelper = createColumnHelper<StatusBlock>();
const statusColumns = [
  columnHelper.accessor('slot', {
    header: 'Slot',
    cell: info => <Slot slot={info.getValue()} />,
    meta: { cellClassName: 'font-medium text-foreground' },
  }),
  columnHelper.accessor('slot_start_date_time', {
    header: 'Time',
    cell: info => <Timestamp timestamp={info.getValue()} format="relative" className="text-muted" />,
  }),
  columnHelper.accessor('proposer_validator_index', {
    header: 'Proposer',
    cell: info => <Validator index={info.getValue()} />,
    meta: { cellClassName: 'text-muted' },
  }),
] as DataTableColumn<StatusBlock>[];

const unsortedStatusColumns = statusColumns.map(column => ({ ...column, enableSorting: false }));

/** The entity's missed or orphaned slots, with the time, slot and proposer filters that apply to them */
function StatusBlocksTable({
  entity,
  status,
  search,
  fields,
  onSearchChange,
  toolbar,
}: {
  entity: string;
  status: ProposalStatus;
  search: BlockSearch;
  fields: readonly BlockFilterKey[];
  onSearchChange: (update: Partial<BlockSearch>) => void;
  toolbar: ReactNode;
}): JSX.Element {
  // Without a range start only newest first, which reads all history in widening windows, can be shown
  const sortable = hasRangeStart(search);
  const { blocks, isLoading, isPlaceholderData, error, hasNextPage } = useEntityBlocksByStatus(
    entity,
    status,
    sortable ? search : { ...search, sort: undefined }
  );
  const { field, desc } = parseSort(sortable ? search.sort : undefined, STATUS_SORT_FIELDS);
  const hasFilters = fields.some(key => search[key] !== undefined);

  return (
    <Card
      rounded
      title="Blocks"
      subtitle={
        status === 'missed'
          ? 'Slots its scheduled proposers left empty, finalized chain'
          : 'Blocks its proposers produced that did not make the finalized chain'
      }
    >
      <div className={clsx('flex flex-col gap-4 *:last:transition-opacity', isPlaceholderData && '*:last:opacity-60')}>
        <div className="flex flex-wrap items-center gap-3">
          {toolbar}
          <BlockFilterPanel filters={search} fields={fields} onChange={onSearchChange} />
        </div>
        {error && <Alert variant="error" title="Failed to load blocks" description={error.message} />}
        <DataTable
          data={blocks}
          columns={sortable ? statusColumns : unsortedStatusColumns}
          isLoading={isLoading}
          getRowId={row => String(row.slot)}
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
          emptyMessage={hasFilters ? `No ${status} blocks match these filters` : `No ${status} blocks`}
        />
      </div>
    </Card>
  );
}

/** Every block the entity proposed, newest first, filterable down to clients, graffiti, slots and outcome. */
export function EntityProposals({ entity }: EntityProposalsProps): JSX.Element {
  const search = useSearch({ from: '/ethereum/entities/$entity' });
  const navigate = useNavigate({ from: '/ethereum/entities/$entity' });
  const status: Status = search.status ?? 'canonical';

  const onSearchChange = useCallback(
    (update: Partial<BlockSearch>) => navigate({ search: prev => ({ ...prev, ...update }), resetScroll: false }),
    [navigate]
  );

  const statusControl = (
    <SegmentedControl
      options={STATUS_OPTIONS}
      value={status}
      onChange={value =>
        navigate({
          search: prev => ({
            ...prev,
            // Graffiti filters do not apply to slots without a block on chain
            ...(value !== 'canonical' && clearFilters(GRAFFITI_FILTER_KEYS)),
            status: value === 'canonical' ? undefined : value,
            sort: undefined,
            page: undefined,
          }),
          resetScroll: false,
        })
      }
      ariaLabel="Block status"
    />
  );

  if (status === 'canonical') {
    return (
      <GraffitiBlocksTable
        search={{ ...search, entity }}
        fields={CANONICAL_FIELDS}
        onSearchChange={onSearchChange}
        hideEntity
        toolbar={statusControl}
      />
    );
  }

  return (
    <StatusBlocksTable
      entity={entity}
      status={status}
      search={search}
      fields={STATUS_FIELDS}
      onSearchChange={onSearchChange}
      toolbar={statusControl}
    />
  );
}
