import { type JSX, useCallback, useMemo } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { Card } from '@/components/Layout/Card';
import { Button } from '@/components/Elements/Button';
import { SegmentedControl } from '@/components/Forms/SegmentedControl';
import { useTableBounds } from '@/hooks/useBounds';
import { getClientColor } from '@/utils/ethereum';
import { buildTooltipHtml, fillTimeKeys, formatTooltipDate } from '@/pages/ethereum/execution/overview/overview.utils';
import {
  ClientFilter,
  ClientPairs,
  ClientsSkeleton,
  EntityFilter,
  GraffitiBlocksTable,
  LayerClients,
} from './components';
import { useCensus, useClientCounts, useEntityOptions, useLatestAdoption, useLatestReleases } from './hooks';
import { CENSUS_TABLES } from './api/client-models';
import { windowStart } from './utils/client-versions';
import { useActiveNodes } from '@/pages/xatu/nodes/hooks/useActiveNodes';
import { normalizeClientName } from '@/utils/ethereum';
import {
  BLOCK_GRAFFITI_TABLE,
  DEFAULT_TIME_PERIOD,
  TIME_PERIOD_OPTIONS,
  TIME_RANGE_CONFIG,
  type TimePeriod,
} from './constants';
import {
  bucketShares,
  buildShareChartConfig,
  computeCoverage,
  entityLabel,
  filterRecords,
  formatClientName,
  summariseClients,
  summarisePairs,
  toDailyRecords,
  unfilteredNote,
  type ClientFilters,
  type ClientLayer,
} from './utils/client-share';
import { BLOCK_FILTER_KEYS, type BlockSearch } from './utils/block-filters';

/** Blocks table filters; the filter bar above owns the clients and entity */
const INDEX_BLOCK_FIELDS = BLOCK_FILTER_KEYS.filter(key => key !== 'cl' && key !== 'el' && key !== 'entity');

/** Window text for subtitles, e.g. "in the last 7 days" */
const WINDOW_TEXT: Record<TimePeriod, string> = {
  '24h': 'in the last 24 hours',
  '7d': 'in the last 7 days',
  '30d': 'in the last 30 days',
  '90d': 'in the last 90 days',
  '1y': 'in the last year',
  all: 'since the first block with graffiti',
};

/** Days of P2P census the charts load at least, since short windows hold one or two daily points */
const MIN_PEER_DAYS = 7;

/** Describes a layer's blocks, e.g. "from coinbase with Geth execution in the last 7 days" */
function describeBlocks(
  entity: string | undefined,
  filters: ClientFilters,
  layer: ClientLayer,
  timePeriod: TimePeriod
): string {
  const other = layer === 'consensus' ? filters.executionClient : filters.consensusClient;
  const parts: string[] = [];
  if (entity) parts.push(`from ${entityLabel(entity)}`);
  if (other) parts.push(`with ${formatClientName(other)} ${layer === 'consensus' ? 'execution' : 'consensus'}`);
  parts.push(WINDOW_TEXT[timePeriod]);
  return parts.join(' ');
}

/**
 * Clients overview: per layer, every client by share of proposed blocks and of P2P peers, Xatu nodes and adoption of
 * its latest release, with both shares over time, the most common pairs and a per-block drill-down.
 */
export function IndexPage(): JSX.Element {
  const navigate = useNavigate({ from: '/ethereum/clients/' });
  const search = useSearch({ from: '/ethereum/clients/' });
  const timePeriod: TimePeriod = search.t ?? DEFAULT_TIME_PERIOD;

  const { data: tableBounds, isLoading: boundsLoading } = useTableBounds(BLOCK_GRAFFITI_TABLE);
  const hasData = !!tableBounds;

  const entity = search.entity;
  const filters: ClientFilters = useMemo(
    () => ({ consensusClient: search.cl, executionClient: search.el }),
    [search.cl, search.el]
  );
  const hasFilters = !!entity || !!filters.consensusClient || !!filters.executionClient;

  const { records, keys, isDaily, since, isLoading, error } = useClientCounts(timePeriod, entity);
  const entityOptions = useEntityOptions();
  const { latest: latestReleases } = useLatestReleases();
  const { adoption } = useLatestAdoption(latestReleases, entity);
  const peerFrom = useMemo(() => {
    const days = TIME_RANGE_CONFIG[timePeriod].days;
    // 0 loads the census from its first day; undefined would load only the latest days
    return days === null ? 0 : windowStart(Math.max(days, MIN_PEER_DAYS));
  }, [timePeriod]);
  const clPeers = useCensus<{ day_start_date?: string; client?: string; peer_count?: number }>(
    CENSUS_TABLES.clPeers,
    {},
    peerFrom
  );
  const elPeers = useCensus<{ day_start_date?: string; client?: string; peer_count?: number }>(
    CENSUS_TABLES.elPeers,
    {},
    peerFrom
  );
  const { nodes } = useActiveNodes();
  const nodeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const node of nodes) {
      const client = normalizeClientName(node.meta_consensus_implementation ?? '');
      if (client) counts.set(client, (counts.get(client) ?? 0) + 1);
    }
    return counts;
  }, [nodes]);

  // Each layer's own filter is skipped for its rows and chart, so the selected client shows among the others.
  const filtered = useMemo(() => filterRecords(records, filters), [records, filters]);
  const consensusRecords = useMemo(() => filterRecords(records, filters, 'consensus'), [records, filters]);
  const executionRecords = useMemo(() => filterRecords(records, filters, 'execution'), [records, filters]);

  const coverage = useMemo(() => computeCoverage(filtered), [filtered]);
  const consensusSummary = useMemo(() => summariseClients(consensusRecords, 'consensus'), [consensusRecords]);
  const executionSummary = useMemo(() => summariseClients(executionRecords, 'execution'), [executionRecords]);
  const consensusClients = useMemo(() => summariseClients(records, 'consensus').map(s => s.client), [records]);
  const executionClients = useMemo(() => summariseClients(records, 'execution').map(s => s.client), [records]);
  const pairs = useMemo(() => summarisePairs(filtered), [filtered]);
  // One entity proposes too rarely for hourly buckets, so its charts count blocks per day over the same window
  const rebucket = !isDaily && !!entity;
  const chartDaily = isDaily || rebucket;
  const consensusChartRecords = useMemo(
    () => (rebucket ? toDailyRecords(consensusRecords) : consensusRecords),
    [consensusRecords, rebucket]
  );
  const executionChartRecords = useMemo(
    () => (rebucket ? toDailyRecords(executionRecords) : executionRecords),
    [executionRecords, rebucket]
  );
  const chartKeys = useMemo(
    () =>
      rebucket ? fillTimeKeys([...new Set(toDailyRecords(records).map(record => record.key))].sort(), true) : keys,
    [records, keys, rebucket]
  );
  const consensusChart = useMemo(
    () => buildShareChartConfig(consensusChartRecords, chartKeys, 'consensus', chartDaily, true),
    [consensusChartRecords, chartKeys, chartDaily]
  );
  const executionChart = useMemo(
    () => buildShareChartConfig(executionChartRecords, chartKeys, 'execution', chartDaily, true),
    [executionChartRecords, chartKeys, chartDaily]
  );

  // Every change here can change the blocks table's rows, so it returns to the table's first page
  const setSearch = useCallback(
    (update: { t?: TimePeriod; cl?: string; el?: string; entity?: string }) =>
      navigate({ search: prev => ({ ...prev, ...update, page: undefined }), replace: true }),
    [navigate]
  );
  const setBlockSearch = useCallback(
    (update: Partial<BlockSearch>) => navigate({ search: prev => ({ ...prev, ...update }) }),
    [navigate]
  );
  const clearFilters = useCallback(() => setSearch({ cl: undefined, el: undefined, entity: undefined }), [setSearch]);

  const makeTooltip = useCallback(
    (layer: ClientLayer) =>
      (params: unknown): string => {
        const points = (Array.isArray(params) ? params : [params]) as Array<{ dataIndex?: number }>;
        const index = points[0]?.dataIndex;
        const key = index === undefined ? undefined : chartKeys[index];
        if (!key) return '';
        const layerRecords = layer === 'consensus' ? consensusChartRecords : executionChartRecords;
        const { total, items } = bucketShares(layerRecords, key, layer, true);
        return buildTooltipHtml(formatTooltipDate(chartDaily ? key : Number(key), chartDaily), [
          {
            title: `${layer === 'consensus' ? 'CONSENSUS' : 'EXECUTION'} CLIENTS (${total} blocks)`,
            items: items.map((item, i) => ({
              color: getClientColor(item.client, i),
              client: item.client,
              label: formatClientName(item.client),
              value: `${item.share.toFixed(1)}% (${item.blocks})`,
            })),
          },
        ]);
      },
    [chartKeys, consensusChartRecords, executionChartRecords, chartDaily]
  );

  const isEmpty = !isLoading && !boundsLoading && !error && coverage.total === 0;

  return (
    <Container>
      <Header
        title="Clients"
        description="Every consensus and execution client by share of proposed blocks and of P2P peers"
      />

      {!boundsLoading && !hasData ? (
        <Card rounded>
          <h3 className="text-base/7 font-semibold text-foreground">No graffiti data for this network</h3>
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <SegmentedControl
              options={TIME_PERIOD_OPTIONS}
              value={timePeriod}
              onChange={value => setSearch({ t: value })}
              ariaLabel="Time window"
            />
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
              {entityOptions.options.length > 0 && (
                <EntityFilter
                  value={entity}
                  onChange={value => setSearch({ entity: value })}
                  options={entityOptions.options}
                />
              )}
              <ClientFilter
                layer="consensus"
                value={filters.consensusClient}
                onChange={client => setSearch({ cl: client })}
                clients={consensusClients}
              />
              <ClientFilter
                layer="execution"
                value={filters.executionClient}
                onChange={client => setSearch({ el: client })}
                clients={executionClients}
              />
              {hasFilters && (
                <Button variant="blank" size="sm" rounded="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
            </div>
          </div>

          {error && (
            <Card rounded>
              <p className="text-sm text-danger">Failed to load client counts: {error.message}</p>
            </Card>
          )}

          {isLoading || boundsLoading ? (
            <ClientsSkeleton />
          ) : isEmpty ? (
            <Card rounded>
              <div className="flex flex-col items-start gap-3">
                <div className="flex flex-col gap-1">
                  <h3 className="text-base/7 font-semibold text-foreground">No blocks match these filters</h3>
                  <p className="text-sm/6 text-muted">
                    {hasFilters
                      ? 'Try a longer window or fewer filters.'
                      : 'Nothing has been proposed in this window yet.'}
                  </p>
                </div>
                {hasFilters && (
                  <Button variant="secondary" size="sm" rounded="sm" onClick={clearFilters}>
                    Clear filters
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            <>
              <LayerClients
                layer="consensus"
                blockSummaries={consensusSummary}
                blockTotal={coverage.total}
                blockScope={describeBlocks(entity, filters, 'consensus', timePeriod)}
                blockChart={consensusChart}
                blockChartDaily={chartDaily}
                blockTooltip={makeTooltip('consensus')}
                peerRows={clPeers.rows}
                peerDay={clPeers.day}
                peersLoading={clPeers.isLoading}
                xatuNodes={nodeCounts}
                latestReleases={latestReleases}
                latestAdoption={adoption}
                unfilteredNote={unfilteredNote('consensus', entity, filters)}
                hideLatestAdoption={!!filters.executionClient}
                adoptionScope={entity ? `from ${entityLabel(entity)}` : undefined}
              />
              <LayerClients
                layer="execution"
                blockSummaries={executionSummary}
                blockTotal={coverage.total}
                blockScope={describeBlocks(entity, filters, 'execution', timePeriod)}
                blockChart={executionChart}
                blockChartDaily={chartDaily}
                blockTooltip={makeTooltip('execution')}
                peerRows={elPeers.rows}
                peerDay={elPeers.day}
                peersLoading={elPeers.isLoading}
                latestReleases={latestReleases}
                latestAdoption={adoption}
                unfilteredNote={unfilteredNote('execution', entity, filters)}
                hideLatestAdoption={!!filters.consensusClient}
                adoptionScope={entity ? `from ${entityLabel(entity)}` : undefined}
              />
              <ClientPairs
                pairs={pairs}
                onSelect={pair => setSearch({ cl: pair.consensusClient, el: pair.executionClient })}
              />
            </>
          )}

          {!isEmpty && (
            <GraffitiBlocksTable
              search={search}
              fields={INDEX_BLOCK_FIELDS}
              onSearchChange={setBlockSearch}
              since={since ?? undefined}
            />
          )}
        </div>
      )}
    </Container>
  );
}
