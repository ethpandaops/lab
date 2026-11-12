import { type JSX, useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { Alert } from '@/components/Feedback/Alert';
import { InfoBox } from '@/components/Feedback/InfoBox';
import { SegmentedControl } from '@/components/Forms/SegmentedControl';
import { useNetwork } from '@/hooks/useNetwork';
import { useTableBounds } from '@/hooks/useBounds';
import {
  BlocksFilterPanel,
  ClientPairingMatrix,
  LocallyBuiltBlocksSkeleton,
  PreparedBlocksTable,
  SlotTimeline,
} from './components';
import { useNodeRoster, usePreparedBlocks, useSlotBlocks } from './hooks';
import {
  BLOCK_FILTER_KEYS,
  type BlockFilters,
  type BlockSortKey,
  DEFAULT_TIME_WINDOW,
  type LocallyBuiltBlocksSearch,
  TIME_WINDOW_SECONDS,
  TIME_WINDOWS,
  type TimeWindow,
} from './IndexPage.types';
import { preparedBlockFilters } from './utils/block-query';

const BLOCKS_PAGE_SIZE = 25;

/** Reach of all history when the table's start is unknown */
const FALLBACK_HISTORY_SECONDS = 365 * 24 * 3600;

const WINDOW_OPTIONS = TIME_WINDOWS.map(value => ({ value, label: value === 'all' ? 'All' : value }));

/** Now in unix seconds, rounded down to the minute */
function currentMinute(): number {
  return Math.floor(Date.now() / 1000 / 60) * 60;
}

/** The block filters out of a search, every key present so a navigation also clears removed filters */
function pickBlockFilters(search: BlockFilters): BlockFilters {
  return Object.fromEntries(BLOCK_FILTER_KEYS.map(key => [key, search[key]]));
}

/** Blocks built locally by sentry nodes: the newest matching slots per client, client pairings and every block. */
export function IndexPage(): JSX.Element {
  const search = useSearch({ from: '/ethereum/execution/locally-built-blocks' });
  const navigate = useNavigate({ from: '/ethereum/execution/locally-built-blocks' });
  const { currentNetwork } = useNetwork();
  const genesisTime = currentNetwork?.genesis_time ?? 0;

  const timeWindow: TimeWindow = search.window ?? DEFAULT_TIME_WINDOW;
  // The minute the window was picked; it reaches back from there
  const [windowPickedAt, setWindowPickedAt] = useState(currentMinute);
  // All history starts at the table's start, never genesis
  const { data: tableBounds, isLoading: boundsLoading } = useTableBounds('fct_prepared_block');
  const windowStart = useMemo(() => {
    if (timeWindow !== 'all') return windowPickedAt - TIME_WINDOW_SECONDS[timeWindow];
    if (boundsLoading) return undefined;
    return tableBounds?.min ?? windowPickedAt - FALLBACK_HISTORY_SECONDS;
  }, [timeWindow, windowPickedAt, boundsLoading, tableBounds?.min]);
  const filters = pickBlockFilters(search);
  const isFiltered = Object.values(filters).some(value => value !== undefined);
  const hasSlotRange = filters.slotFrom !== undefined || filters.slotTo !== undefined;
  const query = preparedBlockFilters(filters, windowStart, genesisTime);

  // Only newest first reads all history in widening windows; other sorts need a window or slot range
  const sortable = timeWindow !== 'all' || hasSlotRange;
  const sort: BlockSortKey = sortable ? (search.sort ?? 'slot') : 'slot';
  const order = sortable ? (search.order ?? 'desc') : 'desc';
  const page = search.page ?? 0;
  const pageSize = search.pageSize ?? BLOCKS_PAGE_SIZE;

  const roster = useNodeRoster(
    query.slot_start_date_time_gte ?? windowStart ?? genesisTime,
    query.slot_start_date_time_lte
  );
  const timeline = useSlotBlocks(query, filters.slotTo === undefined);
  // All history is too slow to reread every slot; the timeline keeps following the newest slots
  const table = usePreparedBlocks(query, sort, order, page, pageSize, search.cursor, timeWindow !== 'all');

  // Cursors of the newest-first pages already visited, so Previous can return to them
  const visitedRef = useRef(new Map<string, string | undefined>());
  const viewKey = JSON.stringify([filters, timeWindow, sort, order, pageSize]);

  const setSearch = useCallback(
    (update: Partial<LocallyBuiltBlocksSearch>) =>
      navigate({ search: prev => ({ ...prev, ...update }), replace: true, resetScroll: false }),
    [navigate]
  );

  const changePage = (nextPage: number, nextPageSize: number): void => {
    const size = nextPageSize === BLOCKS_PAGE_SIZE ? undefined : nextPageSize;
    if (nextPageSize !== pageSize || nextPage <= 0) {
      setSearch({ page: undefined, cursor: undefined, pageSize: size });
      return;
    }
    if (sort !== 'slot' || order !== 'desc') {
      setSearch({ page: nextPage });
      return;
    }
    // Newest first pages by cursor: forwards from this page, backwards to a page already visited, else the first
    visitedRef.current.set(`${viewKey}|${page}`, search.cursor);
    const cursor = nextPage === page + 1 ? table.nextCursor : visitedRef.current.get(`${viewKey}|${nextPage}`);
    setSearch(cursor ? { page: nextPage, cursor } : { page: undefined, cursor: undefined });
  };

  return (
    <Container>
      <div className="flex items-center gap-2">
        <Header title="Locally Built Blocks" />
        {timeline.isFetching && !timeline.isLoading && (
          <div className="inline-block size-2 animate-pulse rounded-full bg-primary" />
        )}
      </div>

      <InfoBox summary="What these blocks are" className="mb-6">
        These blocks were built locally by ethPandaOps Xatu nodes. They represent what each Xatu node would have
        proposed if selected as a block proposer.
      </InfoBox>

      <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-3">
        <SegmentedControl
          options={WINDOW_OPTIONS}
          value={hasSlotRange ? ('' as TimeWindow) : timeWindow}
          onChange={value => {
            if (value !== timeWindow) setWindowPickedAt(currentMinute());
            setSearch({
              window: value === DEFAULT_TIME_WINDOW ? undefined : value,
              slotFrom: undefined,
              slotTo: undefined,
              page: undefined,
              cursor: undefined,
            });
          }}
          ariaLabel="Time window"
        />
        <BlocksFilterPanel
          filters={filters}
          roster={roster}
          onChange={next => setSearch({ ...pickBlockFilters(next), page: undefined, cursor: undefined })}
        />
      </div>

      {timeline.error ? (
        <Alert variant="error" title="Failed to load data" description={timeline.error.message} />
      ) : timeline.isLoading ? (
        <LocallyBuiltBlocksSkeleton />
      ) : (
        <div className="space-y-6">
          <SlotTimeline
            slotGroups={timeline.slotGroups}
            allExecutionClients={timeline.allExecutionClients}
            allConsensusClients={timeline.allConsensusClients}
            blockCountMap={timeline.blockCountMap}
            maxBlockCount={timeline.maxBlockCount}
          />
          <ClientPairingMatrix
            executionClients={timeline.allExecutionClients}
            consensusClients={timeline.allConsensusClients}
            pairingMap={timeline.clientPairingMap}
            maxPairingCount={timeline.maxPairingCount}
            allBlocks={timeline.allBlocks}
          />
        </div>
      )}

      <div className="mt-6">
        <PreparedBlocksTable
          blocks={table.blocks}
          isLoading={table.isLoading}
          error={table.error}
          hasNextPage={table.hasNextPage}
          isFiltered={isFiltered}
          sortable={sortable}
          sort={sort}
          order={order}
          onSortChange={(nextSort, nextOrder) => {
            const isDefault = nextSort === undefined || (nextSort === 'slot' && nextOrder === 'desc');
            setSearch({
              sort: isDefault ? undefined : nextSort,
              order: isDefault ? undefined : nextOrder,
              page: undefined,
              cursor: undefined,
            });
          }}
          page={page}
          pageSize={pageSize}
          onPageChange={changePage}
        />
      </div>
    </Container>
  );
}
