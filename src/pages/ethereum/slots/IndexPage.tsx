import { type JSX, type MouseEvent, type ReactNode, useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import type { SortingState, VisibilityState } from '@tanstack/react-table';
import clsx from 'clsx';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import { Alert } from '@/components/Feedback/Alert';
import { Button } from '@/components/Elements/Button';
import { Timestamp } from '@/components/DataDisplay/Timestamp';
import { Slot } from '@/components/Ethereum/Slot';
import { Epoch } from '@/components/Ethereum/Epoch';
import { Entity } from '@/components/Ethereum/Entity';
import { Validator } from '@/components/Ethereum/Validator';
import { ClientLabel } from '@/components/Ethereum/ClientLabel';
import { useNetwork } from '@/hooks/useNetwork';
import { useBounds } from '@/hooks/useBounds';
import { getForkEpoch } from '@/utils/forks';
import { slotToTimestamp } from '@/utils/beacon';
import { formatSlot, truncateAddress, weiToEth } from '@/utils';
import { useSlotsPage } from './hooks';
import { noDataBefore } from './hooks/useSlotTableCoverage';
import { SlotsFilters } from './components/SlotsFilters';
import { slotBounds, type SlotRow } from './utils/slot-query';
import {
  DEFAULT_PAGE_SIZE,
  SLOT_FILTER_KEYS,
  SLOT_SORTS,
  type SlotFilters,
  type SlotSort,
  type SlotsSearch,
} from './IndexPage.types';

const STATUS_STYLES = {
  proposed: { label: 'Proposed', className: 'text-muted' },
  missed: { label: 'Missed', className: 'text-danger' },
  orphaned: { label: 'Orphaned', className: 'text-warning' },
} as const;

/** Columns off by default; the Columns menu brings them back */
const HIDDEN_BY_DEFAULT: VisibilityState = { epoch: false, relays: false, builder: false, value: false, block: false };

function Muted(): JSX.Element {
  return <span className="text-muted">-</span>;
}

/** A cell value that narrows the list to rows sharing it */
function FilterButton({
  onClick,
  title,
  className,
  children,
}: {
  onClick: () => void;
  title: string;
  className?: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <button
      type="button"
      title={title}
      onClick={(event: MouseEvent) => {
        event.stopPropagation();
        onClick();
      }}
      className={clsx('cursor-pointer transition-colors hover:text-primary hover:underline', className)}
    >
      {children}
    </button>
  );
}

/**
 * Slots list: the latest slots by default, narrowed and reordered by filters and sorts that live in the URL.
 */
export function IndexPage(): JSX.Element {
  const navigate = useNavigate({ from: '/ethereum/slots/' });
  const search = useSearch({ from: '/ethereum/slots/' }) as SlotsSearch;
  const { currentNetwork } = useNetwork();
  const hasGloas = currentNetwork ? getForkEpoch(currentNetwork, 'gloas') !== null : false;
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(HIDDEN_BY_DEFAULT);

  const filters = useMemo(
    () => Object.fromEntries(SLOT_FILTER_KEYS.map(key => [key, search[key]])) as SlotFilters,
    [search]
  );
  const sort: SlotSort = search.sort ?? 'slot';
  const dir = sort === 'slot' ? 'desc' : (search.dir ?? 'desc');
  const pageSize = search.pageSize ?? DEFAULT_PAGE_SIZE;
  const pageIndex = search.page ?? 0;

  const { data, isLoading, isPlaceholderData, error } = useSlotsPage(
    { filters, sort, dir, pageSize, cursor: search.cursor },
    hasGloas
  );
  const rows = data?.rows ?? [];

  // Orphaned blocks and entities are only known from tables that start after genesis; say so where the list ends
  const { data: bounds } = useBounds();
  const genesisTime = currentNetwork?.genesis_time;
  const listRange = genesisTime !== undefined ? slotBounds(filters, genesisTime) : undefined;
  const listFrom = listRange?.min;
  // Value sorts without a slot or time range cover the last week (see `fetchSlotsPage`)
  const recentOnly = sort !== 'slot' && listRange?.min === undefined && listRange?.max === undefined;
  const endsAt = (start: number | undefined): start is number =>
    start !== undefined &&
    genesisTime !== undefined &&
    (listFrom === undefined || slotToTimestamp(listFrom, genesisTime) < start);
  const entityDataStart = bounds?.fct_block_proposer_entity?.min;
  // Orphaned blocks are only known from the head table's first slot; a missed slot before it may have been orphaned
  const orphansKnownFrom = bounds?.fct_block_proposer_head?.min;
  const orphanedStart = filters.status === 'orphaned' ? bounds?.fct_block_proposer_head?.min : undefined;
  const entityStart = filters.entity ? entityDataStart : undefined;
  const listEnd =
    !data || data.nextCursor
      ? undefined
      : endsAt(orphanedStart)
        ? noDataBefore(orphanedStart, 'orphaned slot')
        : endsAt(entityStart)
          ? noDataBefore(entityStart, 'entity')
          : undefined;

  // Cursors of pages already visited, so Previous works for value sorts where only Next can be derived
  const visited = useRef(new Map<string, string | undefined>());
  const viewKey = JSON.stringify([filters, sort, dir, pageSize]);

  const setFilters = useCallback(
    (next: SlotFilters) =>
      navigate({
        search: prev => ({
          ...prev,
          ...Object.fromEntries(SLOT_FILTER_KEYS.map(key => [key, next[key]])),
          page: undefined,
          cursor: undefined,
        }),
      }),
    [navigate]
  );

  const addFilter = useCallback((patch: SlotFilters) => setFilters({ ...filters, ...patch }), [filters, setFilters]);

  const goToPage = useCallback(
    (page: number, cursor: string | undefined) => {
      visited.current.set(`${viewKey}|${pageIndex}`, search.cursor);
      navigate({ search: prev => ({ ...prev, page: page || undefined, cursor: page ? cursor : undefined }) });
    },
    [navigate, viewKey, pageIndex, search.cursor]
  );

  const handlePagination = useCallback(
    (nextIndex: number, nextSize: number) => {
      if (nextSize !== pageSize) {
        navigate({
          search: prev => ({
            ...prev,
            pageSize: nextSize === DEFAULT_PAGE_SIZE ? undefined : nextSize,
            page: undefined,
            cursor: undefined,
          }),
        });
        return;
      }
      if (nextIndex > pageIndex && data?.nextCursor) {
        goToPage(pageIndex + 1, data.nextCursor);
      } else if (nextIndex < pageIndex) {
        const target = pageIndex - 1;
        const key = `${viewKey}|${target}`;
        if (sort === 'slot') goToPage(target, data?.prevCursor);
        // Value orders can only page forwards; without the earlier cursor (e.g. after a reload) start over
        else if (visited.current.has(key)) goToPage(target, visited.current.get(key));
        else goToPage(0, undefined);
      }
    },
    [navigate, pageSize, pageIndex, data, goToPage, viewKey, sort]
  );

  const sorting: SortingState = useMemo(() => [{ id: sort, desc: dir === 'desc' }], [sort, dir]);
  const handleSorting = useCallback(
    (next: SortingState) => {
      const [first] = next;
      const id = first && (SLOT_SORTS as readonly string[]).includes(first.id) ? (first.id as SlotSort) : 'slot';
      navigate({
        search: prev => ({
          ...prev,
          sort: id === 'slot' ? undefined : id,
          dir: id === 'slot' || first?.desc !== false ? undefined : 'asc',
          page: undefined,
          cursor: undefined,
        }),
      });
    },
    [navigate]
  );

  const columns = useMemo(
    (): DataTableColumn<SlotRow>[] => [
      {
        accessorKey: 'slot',
        id: 'slot',
        header: 'Slot',
        cell: ({ row }) => <Slot slot={row.original.slot} />,
        sortDescFirst: true,
        meta: { cellClassName: 'font-medium text-foreground' },
        enableHiding: false,
      },
      {
        accessorKey: 'epoch',
        id: 'epoch',
        header: 'Epoch',
        cell: ({ row }) => <Epoch epoch={row.original.epoch} />,
        enableSorting: false,
      },
      {
        accessorKey: 'timestamp',
        id: 'time',
        header: 'Time',
        cell: ({ row }) => <Timestamp timestamp={row.original.timestamp} format="relative" className="text-muted" />,
        enableSorting: false,
      },
      {
        accessorKey: 'proposerIndex',
        id: 'proposer',
        header: 'Proposer',
        cell: ({ row }) => {
          const index = row.original.proposerIndex;
          return index === null ? <Muted /> : <Validator index={index} />;
        },
        enableSorting: false,
      },
      {
        accessorKey: 'entity',
        id: 'entity',
        header: 'Entity',
        // Before the entity table starts, a slot without a graffiti entity has no entity data
        cell: ({ row }) =>
          row.original.entity === null && entityDataStart !== undefined && row.original.timestamp < entityDataStart ? (
            <Muted />
          ) : (
            <Entity entity={row.original.entity} />
          ),
        enableSorting: false,
      },
      {
        accessorKey: 'status',
        id: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const status = row.original.status;
          if (!status) return <Muted />;
          const style = STATUS_STYLES[status];
          const orphanUnknown =
            status === 'missed' && (orphansKnownFrom === undefined || row.original.timestamp < orphansKnownFrom);
          return (
            <FilterButton
              title={`Only ${style.label.toLowerCase()} slots`}
              onClick={() => addFilter({ status })}
              className={clsx('font-medium', style.className)}
            >
              {orphanUnknown ? 'Missed or orphaned' : style.label}
            </FilterButton>
          );
        },
        enableSorting: false,
      },
      {
        accessorKey: 'source',
        id: 'source',
        header: 'Source',
        cell: ({ row }) => {
          const source = row.original.source;
          if (!source) return <Muted />;
          return (
            <FilterButton
              title={source === 'mev' ? 'Only MEV blocks' : 'Only locally built blocks'}
              onClick={() => addFilter({ source })}
              className={source === 'mev' ? 'text-foreground' : 'text-muted'}
            >
              {source === 'mev' ? 'MEV' : 'Local'}
            </FilterButton>
          );
        },
        enableSorting: false,
      },
      {
        accessorKey: 'relays',
        id: 'relays',
        header: 'Relays',
        cell: ({ row }) => {
          const relays = row.original.relays;
          if (relays.length === 0) return <Muted />;
          return (
            <span className="inline-flex gap-1">
              {relays.map(relay => (
                <FilterButton
                  key={relay}
                  title={`Only blocks delivered by ${relay}`}
                  onClick={() => addFilter({ relay, source: undefined })}
                  className="rounded-xs bg-muted-10 px-1.5 py-0.5 text-foreground hover:no-underline"
                >
                  {relay}
                </FilterButton>
              ))}
            </span>
          );
        },
        enableSorting: false,
      },
      {
        accessorKey: 'builder',
        id: 'builder',
        header: 'Builder',
        cell: ({ row }) => {
          const builder = row.original.builder;
          if (!builder) return <Muted />;
          return (
            <FilterButton
              title="Only blocks from this builder"
              onClick={() => addFilter({ builder })}
              className="font-mono"
            >
              {truncateAddress(builder)}
            </FilterButton>
          );
        },
        enableSorting: false,
      },
      {
        accessorKey: 'value',
        id: 'value',
        header: 'MEV value',
        cell: ({ row }) => {
          const value = row.original.value;
          return value ? <span className="text-foreground">{weiToEth(value).toFixed(4)} ETH</span> : <Muted />;
        },
        enableSorting: false,
      },
      {
        accessorKey: 'blockNumber',
        id: 'block',
        header: 'Block',
        cell: ({ row }) => row.original.blockNumber ?? <Muted />,
        enableSorting: false,
      },
      {
        accessorKey: 'blobCount',
        id: 'blobs',
        header: 'Blobs',
        cell: ({ row }) => row.original.blobCount ?? <Muted />,
        sortDescFirst: true,
      },
      {
        accessorKey: 'gasUsed',
        id: 'gas',
        header: 'Gas used',
        cell: ({ row }) => {
          const gas = row.original.gasUsed;
          return gas === null ? <Muted /> : `${(gas / 1e6).toFixed(1)}M`;
        },
        sortDescFirst: true,
      },
      {
        accessorKey: 'txCount',
        id: 'txs',
        header: 'Txs',
        cell: ({ row }) => row.original.txCount ?? <Muted />,
        sortDescFirst: true,
      },
      {
        accessorKey: 'cl',
        id: 'cl',
        header: 'CL client',
        cell: ({ row }) => {
          const client = row.original.cl;
          return client ? <ClientLabel client={client} /> : <Muted />;
        },
        enableSorting: false,
      },
      {
        accessorKey: 'el',
        id: 'el',
        header: 'EL client',
        cell: ({ row }) => {
          const client = row.original.el;
          return client ? <ClientLabel client={client} /> : <Muted />;
        },
        enableSorting: false,
      },
      ...(hasGloas
        ? [
            {
              id: 'payload',
              header: 'Payload',
              cell: ({ row }) => {
                // The PTC's verdict on whether the builder revealed in time
                const { ptcPresentVotes, ptcVotesSeen } = row.original;
                if (!ptcVotesSeen) return <Muted />;
                const delivered = (ptcPresentVotes ?? 0) * 2 >= ptcVotesSeen;
                return (
                  <span
                    className={clsx('font-medium', delivered ? 'text-success' : 'text-danger')}
                    title={`PTC: ${ptcPresentVotes ?? 0}/${ptcVotesSeen} present votes`}
                  >
                    {delivered ? 'Delivered' : 'Absent'}
                  </span>
                );
              },
            } satisfies DataTableColumn<SlotRow>,
          ]
        : []),
    ],
    [addFilter, hasGloas, entityDataStart, orphansKnownFrom]
  );

  const emptyMessage =
    listEnd ??
    (data?.searchedTo !== undefined
      ? `No matches down to slot ${formatSlot(data.searchedTo)}`
      : data?.partial
        ? 'No matches yet'
        : 'No slots match these filters');

  return (
    <Container>
      <Header title="Slots" />

      <div className="mb-4">
        <SlotsFilters
          filters={filters}
          onChange={setFilters}
          onGoToSlot={slot => setFilters({ ...filters, slotMax: slot })}
        />
      </div>

      {error && <Alert variant="error" title="Error loading slots" description={error.message} className="mb-4" />}

      <div className={clsx('transition-opacity', isPlaceholderData && 'opacity-60')}>
        <DataTable
          data={rows}
          columns={columns}
          isLoading={isLoading}
          title={recentOnly ? 'Last 7 days' : undefined}
          pageIndex={pageIndex}
          pageSize={pageSize}
          onPaginationChange={handlePagination}
          hasNextPage={Boolean(data?.nextCursor)}
          manualPagination
          manualSorting
          sorting={sorting}
          onSortingChange={handleSorting}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={setColumnVisibility}
          onRowClick={row => navigate({ to: '/ethereum/slots/$slot', params: { slot: String(row.slot) } })}
          getRowId={row => String(row.slot)}
          emptyMessage={emptyMessage}
          hideGlobalFilter
          paginationPosition="both"
        />
      </div>

      {listEnd && rows.length > 0 && <p className="mt-3 text-right text-sm text-muted">{listEnd}</p>}

      {data?.partial && data.nextCursor && (
        <div className="mt-3 flex flex-wrap items-center justify-end gap-3 text-sm text-muted">
          {data.searchedTo !== undefined && rows.length > 0 && (
            <span className="tabular-nums">Searched down to slot {formatSlot(data.searchedTo)}</span>
          )}
          <Button variant="secondary" size="sm" onClick={() => goToPage(pageIndex + 1, data.nextCursor)}>
            Keep searching
          </Button>
        </div>
      )}
    </Container>
  );
}
