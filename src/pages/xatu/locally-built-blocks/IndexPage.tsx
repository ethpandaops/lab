import { type JSX, useCallback, useMemo } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { Alert } from '@/components/Feedback/Alert';
import { InfoBox } from '@/components/Feedback/InfoBox';
import { SegmentedControl } from '@/components/Forms/SegmentedControl';
import { useNetwork } from '@/hooks/useNetwork';
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

const WINDOW_OPTIONS = TIME_WINDOWS.map(value => ({ value, label: value === 'all' ? 'All' : value }));

/** The block filters out of a search, every key present so a navigation also clears removed filters */
function pickBlockFilters(search: BlockFilters): BlockFilters {
  return Object.fromEntries(BLOCK_FILTER_KEYS.map(key => [key, search[key]]));
}

/** Blocks built locally by sentry nodes: the newest matching slots per client, client pairings and every block. */
export function IndexPage(): JSX.Element {
  const search = useSearch({ from: '/xatu/locally-built-blocks' });
  const navigate = useNavigate({ from: '/xatu/locally-built-blocks' });
  const { currentNetwork } = useNetwork();
  const genesisTime = currentNetwork?.genesis_time ?? 0;

  const timeWindow: TimeWindow = search.window ?? DEFAULT_TIME_WINDOW;
  const windowStart = useMemo(
    () =>
      timeWindow === 'all' ? genesisTime : Math.floor(Date.now() / 1000 / 60) * 60 - TIME_WINDOW_SECONDS[timeWindow],
    [timeWindow, genesisTime]
  );
  const filters = pickBlockFilters(search);
  const isFiltered = Object.values(filters).some(value => value !== undefined);
  const hasSlotRange = filters.slotFrom !== undefined || filters.slotTo !== undefined;
  const query = preparedBlockFilters(filters, windowStart, genesisTime);

  const sort: BlockSortKey = search.sort ?? 'slot';
  const order = search.order ?? 'desc';
  const page = search.page ?? 0;
  const pageSize = search.pageSize ?? BLOCKS_PAGE_SIZE;

  const roster = useNodeRoster();
  const timeline = useSlotBlocks(query, filters.slotTo === undefined);
  // All history is too slow to reread every slot; the timeline keeps following the newest slots
  const table = usePreparedBlocks(query, sort, order, page, pageSize, timeWindow !== 'all');

  const setSearch = useCallback(
    (update: Partial<LocallyBuiltBlocksSearch>) =>
      navigate({ search: prev => ({ ...prev, ...update }), replace: true, resetScroll: false }),
    [navigate]
  );

  return (
    <Container>
      <div className="flex items-center gap-2">
        <Header title="Locally Built Blocks" />
        {timeline.isFetching && !timeline.isLoading && (
          <div className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary" />
        )}
      </div>

      <InfoBox summary="What these blocks are" className="mb-6">
        These blocks were built locally by ethPandaOps sentry nodes. They represent what each node would have proposed
        if selected as a block proposer.
      </InfoBox>

      <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-3">
        <SegmentedControl
          options={WINDOW_OPTIONS}
          value={hasSlotRange ? ('' as TimeWindow) : timeWindow}
          onChange={value =>
            setSearch({
              window: value === DEFAULT_TIME_WINDOW ? undefined : value,
              slotFrom: undefined,
              slotTo: undefined,
              page: undefined,
            })
          }
          ariaLabel="Time window"
        />
        <BlocksFilterPanel
          filters={filters}
          roster={roster}
          onChange={next => setSearch({ ...pickBlockFilters(next), page: undefined })}
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
          sort={sort}
          order={order}
          onSortChange={(nextSort, nextOrder) => {
            const isDefault = nextSort === undefined || (nextSort === 'slot' && nextOrder === 'desc');
            setSearch({
              sort: isDefault ? undefined : nextSort,
              order: isDefault ? undefined : nextOrder,
              page: undefined,
            });
          }}
          page={page}
          pageSize={pageSize}
          onPageChange={(nextPage, nextPageSize) =>
            setSearch({
              page: nextPageSize === pageSize && nextPage > 0 ? nextPage : undefined,
              pageSize: nextPageSize === BLOCKS_PAGE_SIZE ? undefined : nextPageSize,
            })
          }
        />
      </div>
    </Container>
  );
}
