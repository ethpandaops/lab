import { type JSX, useCallback, useMemo } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { Card } from '@/components/Layout/Card';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { InfoBox } from '@/components/Feedback/InfoBox';
import { Stats } from '@/components/DataDisplay/Stats';
import { Toggle } from '@/components/Forms/Toggle';
import { Button } from '@/components/Elements/Button';
import { MultiLineChart } from '@/components/Charts/MultiLine';
import { SegmentedControl } from '@/components/Forms/SegmentedControl';
import { useTableBounds } from '@/hooks/useBounds';
import { getClientColor } from '@/utils/ethereum';
import { buildTooltipHtml, formatTooltipDate } from '@/pages/ethereum/execution/overview/overview.utils';
import {
  ClientBreakdown,
  ClientFilter,
  ClientPairs,
  ClientsSkeleton,
  ClientSummaryGrid,
  DiversityCard,
  EntityFilter,
  GraffitiBlocksTable,
} from './components';
import { useClientCounts, useEntityOptions, useLatestReleases, useNodeWeightedShares } from './hooks';
import { useActiveNodes } from '@/pages/xatu/nodes/hooks/useActiveNodes';
import { normalizeClientName } from '@/utils/ethereum';
import { BLOCK_GRAFFITI_TABLE, DEFAULT_TIME_PERIOD, TIME_PERIOD_OPTIONS, type TimePeriod } from './constants';
import {
  bucketShares,
  buildShareChartConfig,
  computeCoverage,
  entityLabel,
  filterRecords,
  formatClientName,
  summariseClients,
  summarisePairs,
  type ClientFilters,
  type ClientLayer,
} from './utils/client-share';
import { BLOCK_FILTER_KEYS, type BlockSearch } from './utils/block-filters';

/** Blocks table filters; the filter bar above owns the clients and entity */
const INDEX_BLOCK_FIELDS = BLOCK_FILTER_KEYS.filter(key => key !== 'cl' && key !== 'el' && key !== 'entity');

/** What the diversity cards can count */
const DIVERSITY_OPTIONS: ReadonlyArray<{ value: 'blocks' | 'p2p' | 'enr'; label: string }> = [
  { value: 'blocks', label: 'Proposed blocks (stake)' },
  { value: 'p2p', label: 'P2P peers (nodes)' },
  { value: 'enr', label: 'ENR crawl (nodes)' },
];

const DIVERSITY_SUBTITLES = {
  blocks: 'Share of blocks whose graffiti names a client',
  p2p: 'Share of peers seen on the P2P network, latest full day',
  enr: 'Share of nodes found in discovery records, latest full day',
} as const;

/** Formats a share of blocks as a percentage, or a dash when there are no blocks */
function formatShare(part: number, total: number): string {
  return total > 0 ? `${((part / total) * 100).toFixed(1)}%` : '-';
}

/** Describes the blocks a layer's chart covers, e.g. "blocks from coinbase with Geth execution" */
function describeBlocks(entity: string | undefined, filters: ClientFilters, layer: ClientLayer): string {
  const other = layer === 'consensus' ? filters.executionClient : filters.consensusClient;
  const parts = [entity ? `blocks from ${entityLabel(entity)}` : 'blocks'];
  if (other) parts.push(`with ${formatClientName(other)} ${layer === 'consensus' ? 'execution' : 'consensus'}`);
  return entity || other ? parts.join(' ') : 'all proposed blocks';
}

/**
 * Clients overview: every consensus and execution client with its share of proposed blocks parsed from graffiti,
 * diversity against the 33%, 50% and 67% thresholds, newest release and Xatu nodes, with a per-block drill-down.
 */
export function IndexPage(): JSX.Element {
  const navigate = useNavigate({ from: '/ethereum/clients/' });
  const search = useSearch({ from: '/ethereum/clients/' });
  const timePeriod: TimePeriod = search.t ?? DEFAULT_TIME_PERIOD;
  const identifiedOnly = search.identified ?? false;

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
  const diversityBy = search.by ?? 'blocks';
  const clNodes = useNodeWeightedShares(diversityBy === 'blocks' ? null : 'consensus');
  const elNodes = useNodeWeightedShares(diversityBy === 'blocks' ? null : 'execution');
  const { nodes } = useActiveNodes();
  const nodeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const node of nodes) {
      const client = normalizeClientName(node.meta_consensus_implementation ?? '');
      if (client) counts.set(client, (counts.get(client) ?? 0) + 1);
    }
    return counts;
  }, [nodes]);

  // Each layer's own filter is skipped for its chart and breakdown, so the selected client shows among the others.
  const filtered = useMemo(() => filterRecords(records, filters), [records, filters]);
  const consensusRecords = useMemo(() => filterRecords(records, filters, 'consensus'), [records, filters]);
  const executionRecords = useMemo(() => filterRecords(records, filters, 'execution'), [records, filters]);

  const coverage = useMemo(() => computeCoverage(filtered), [filtered]);
  const consensusSummary = useMemo(() => summariseClients(consensusRecords, 'consensus'), [consensusRecords]);
  const executionSummary = useMemo(() => summariseClients(executionRecords, 'execution'), [executionRecords]);
  const consensusClients = useMemo(() => summariseClients(records, 'consensus').map(s => s.client), [records]);
  const executionClients = useMemo(() => summariseClients(records, 'execution').map(s => s.client), [records]);
  const pairs = useMemo(() => summarisePairs(filtered), [filtered]);
  const consensusChart = useMemo(
    () => buildShareChartConfig(consensusRecords, keys, 'consensus', isDaily, identifiedOnly),
    [consensusRecords, keys, isDaily, identifiedOnly]
  );
  const executionChart = useMemo(
    () => buildShareChartConfig(executionRecords, keys, 'execution', isDaily, identifiedOnly),
    [executionRecords, keys, isDaily, identifiedOnly]
  );

  // Every change here can change the blocks table's rows, so it returns to the table's first page
  const setSearch = useCallback(
    (update: { t?: TimePeriod; cl?: string; el?: string; entity?: string; identified?: boolean; by?: 'p2p' | 'enr' }) =>
      navigate({ search: prev => ({ ...prev, ...update, page: undefined }), replace: true }),
    [navigate]
  );
  const setBlockSearch = useCallback(
    (update: Partial<BlockSearch>) => navigate({ search: prev => ({ ...prev, ...update }), resetScroll: false }),
    [navigate]
  );
  const clearFilters = useCallback(() => setSearch({ cl: undefined, el: undefined, entity: undefined }), [setSearch]);

  const makeTooltip = useCallback(
    (layer: ClientLayer) =>
      (params: unknown): string => {
        const points = (Array.isArray(params) ? params : [params]) as Array<{ dataIndex?: number }>;
        const index = points[0]?.dataIndex;
        const key = index === undefined ? undefined : keys[index];
        if (!key) return '';
        const layerRecords = layer === 'consensus' ? consensusRecords : executionRecords;
        const { total, items } = bucketShares(layerRecords, key, layer, identifiedOnly);
        return buildTooltipHtml(formatTooltipDate(isDaily ? key : Number(key), isDaily), [
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
    [keys, consensusRecords, executionRecords, identifiedOnly, isDaily]
  );

  const periodLabel = isDaily ? 'Daily' : 'Hourly';
  const shareSubtitle = (layer: ClientLayer): string => {
    const blocks = describeBlocks(entity, filters, layer);
    return identifiedOnly
      ? `${periodLabel} share of ${blocks === 'all proposed blocks' ? 'blocks' : blocks} whose graffiti names a client`
      : `${periodLabel} share of ${blocks}, unknown included`;
  };
  const isEmpty = !isLoading && !boundsLoading && !error && coverage.total === 0;

  return (
    <Container>
      <Header title="Clients" description="Consensus and execution clients, by share of proposed blocks" />

      {!boundsLoading && !hasData ? (
        <Card rounded>
          <h3 className="text-base/7 font-semibold text-foreground">No graffiti data for this network</h3>
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
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
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted">Identified blocks only</span>
              <Toggle
                checked={identifiedOnly}
                onChange={checked => setSearch({ identified: checked || undefined })}
                size="small"
                srLabel="Show shares of identified blocks only"
              />
            </div>
          </div>

          <InfoBox summary="How this is measured">
            <p>
              Clients are read from what proposers put in their graffiti: the engine API client version codes most
              consensus clients append (for example <span className="font-mono">GEa579PMfea2</span>) or a client&apos;s
              default version string. Blocks with empty or custom graffiti count as unknown, so these shares describe
              the blocks that name a client, not the whole validator set. Entities are the proposer&apos;s current
              validator mapping; validators without one are left out when filtering by entity.
            </p>
            <p>A client with over ⅓ of stake can stop finality with a bug; over ⅔, it can finalize an invalid chain.</p>
          </InfoBox>

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
              <section className="flex flex-col gap-3">
                <div>
                  <h2 className="text-base/7 font-semibold text-foreground">Consensus clients</h2>
                  <p className="text-sm/6 text-muted">Share of blocks whose graffiti names a consensus client</p>
                </div>
                <ClientSummaryGrid
                  layer="consensus"
                  summaries={consensusSummary}
                  latestReleases={latestReleases}
                  nodeCounts={nodeCounts}
                />
              </section>
              <section className="flex flex-col gap-3">
                <div>
                  <h2 className="text-base/7 font-semibold text-foreground">Execution clients</h2>
                  <p className="text-sm/6 text-muted">Share of blocks whose graffiti names an execution client</p>
                </div>
                <ClientSummaryGrid
                  layer="execution"
                  summaries={executionSummary}
                  latestReleases={latestReleases}
                  nodeCounts={nodeCounts}
                />
              </section>

              <Stats
                gridClassName="grid grid-cols-2 gap-4 lg:grid-cols-4"
                stats={[
                  { id: 'blocks', name: 'Blocks', value: coverage.total.toLocaleString() },
                  {
                    id: 'consensus',
                    name: 'CL identified',
                    value: formatShare(coverage.withConsensus, coverage.total),
                  },
                  {
                    id: 'execution',
                    name: 'EL identified',
                    value: formatShare(coverage.withExecution, coverage.total),
                  },
                  { id: 'both', name: 'Both identified', value: formatShare(coverage.withBoth, coverage.total) },
                ]}
              />

              <SegmentedControl
                options={DIVERSITY_OPTIONS}
                value={diversityBy}
                onChange={value => setSearch({ by: value === 'blocks' ? undefined : value })}
                ariaLabel="Count diversity by"
              />
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <DiversityCard
                  title="Consensus diversity"
                  summaries={
                    diversityBy === 'p2p' ? clNodes.p2p : diversityBy === 'enr' ? clNodes.enr : consensusSummary
                  }
                  subtitle={DIVERSITY_SUBTITLES[diversityBy]}
                  countLabel={diversityBy === 'blocks' ? 'Blocks' : diversityBy === 'p2p' ? 'Peers' : 'Nodes'}
                  isLoading={diversityBy !== 'blocks' && clNodes.isLoading}
                />
                <DiversityCard
                  title="Execution diversity"
                  summaries={
                    diversityBy === 'p2p' ? elNodes.p2p : diversityBy === 'enr' ? elNodes.enr : executionSummary
                  }
                  subtitle={DIVERSITY_SUBTITLES[diversityBy]}
                  countLabel={diversityBy === 'blocks' ? 'Blocks' : diversityBy === 'p2p' ? 'Peers' : 'Nodes'}
                  isLoading={diversityBy !== 'blocks' && elNodes.isLoading}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <PopoutCard
                  title="Consensus Client Share"
                  subtitle={shareSubtitle('consensus')}
                  anchorId="consensus-client-share"
                  modalSize="full"
                >
                  {({ inModal }) => (
                    <MultiLineChart
                      series={consensusChart.series}
                      xAxis={{ type: 'category', labels: consensusChart.labels, name: 'Date' }}
                      yAxis={{ name: 'Share (%)', min: 0, max: 100 }}
                      height={inModal ? 600 : 320}
                      showLegend
                      legendPosition="top"
                      enableDataZoom
                      tooltipFormatter={makeTooltip('consensus')}
                      syncGroup={inModal ? undefined : 'proposer-clients'}
                    />
                  )}
                </PopoutCard>
                <PopoutCard
                  title="Execution Client Share"
                  subtitle={shareSubtitle('execution')}
                  anchorId="execution-client-share"
                  modalSize="full"
                >
                  {({ inModal }) => (
                    <MultiLineChart
                      series={executionChart.series}
                      xAxis={{ type: 'category', labels: executionChart.labels, name: 'Date' }}
                      yAxis={{ name: 'Share (%)', min: 0, max: 100 }}
                      height={inModal ? 600 : 320}
                      showLegend
                      legendPosition="top"
                      enableDataZoom
                      tooltipFormatter={makeTooltip('execution')}
                      syncGroup={inModal ? undefined : 'proposer-clients'}
                    />
                  )}
                </PopoutCard>

                <ClientBreakdown
                  title="Consensus clients"
                  summaries={consensusSummary}
                  identifiedOnly={identifiedOnly}
                  selectedClient={filters.consensusClient}
                  onSelect={client => setSearch({ cl: client })}
                />
                <ClientBreakdown
                  title="Execution clients"
                  summaries={executionSummary}
                  identifiedOnly={identifiedOnly}
                  selectedClient={filters.executionClient}
                  onSelect={client => setSearch({ el: client })}
                />
              </div>

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
