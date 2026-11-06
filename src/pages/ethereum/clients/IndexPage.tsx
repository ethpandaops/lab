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
  AttestationPerformance,
  ClientPairs,
  ClientsSkeleton,
  EntityFilter,
  LayerClients,
  ProposerBehaviour,
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
  formatClientName,
  summariseClients,
  summarisePairs,
  toDailyRecords,
  unfilteredNote,
  type ClientLayer,
} from './utils/client-share';

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

/** Layers the performance comparison switches between */
const LAYER_OPTIONS: ReadonlyArray<{ value: ClientLayer; label: string }> = [
  { value: 'consensus', label: 'Consensus' },
  { value: 'execution', label: 'Execution' },
];

/** Describes the blocks counted, e.g. "from coinbase in the last 7 days" */
function describeBlocks(entity: string | undefined, timePeriod: TimePeriod): string {
  return entity ? `from ${entityLabel(entity)} ${WINDOW_TEXT[timePeriod]}` : WINDOW_TEXT[timePeriod];
}

/**
 * Clients overview: per layer, every client by share of proposed blocks and of P2P peers, Xatu nodes and adoption of
 * its latest release, with both shares over time, the most common pairs, and each layer's clients compared on
 * proposal and attestation performance.
 */
export function IndexPage(): JSX.Element {
  const navigate = useNavigate({ from: '/ethereum/clients/' });
  const search = useSearch({ from: '/ethereum/clients/' });
  const timePeriod: TimePeriod = search.t ?? DEFAULT_TIME_PERIOD;

  const { data: tableBounds, isLoading: boundsLoading } = useTableBounds(BLOCK_GRAFFITI_TABLE);
  const hasData = !!tableBounds;

  const entity = search.entity;
  const performanceLayer: ClientLayer = search.layer ?? 'consensus';

  const { records, keys, isDaily, isLoading, error } = useClientCounts(timePeriod, entity);
  const entityOptions = useEntityOptions();
  const { latest: latestReleases } = useLatestReleases();
  const { adoption } = useLatestAdoption(latestReleases, entity);
  const days = TIME_RANGE_CONFIG[timePeriod].days;
  const peerFrom = useMemo(
    // 0 loads the census from its first day; undefined would load only the latest days
    () => (days === null ? 0 : windowStart(Math.max(days, MIN_PEER_DAYS))),
    [days]
  );
  const performanceFrom = useMemo(() => (days === null ? undefined : windowStart(days)), [days]);
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

  const coverage = useMemo(() => computeCoverage(records), [records]);
  const consensusSummary = useMemo(() => summariseClients(records, 'consensus'), [records]);
  const executionSummary = useMemo(() => summariseClients(records, 'execution'), [records]);
  const pairs = useMemo(() => summarisePairs(records), [records]);
  // One entity proposes too rarely for hourly buckets, so its charts count blocks per day over the same window
  const rebucket = !isDaily && !!entity;
  const chartDaily = isDaily || rebucket;
  const chartRecords = useMemo(() => (rebucket ? toDailyRecords(records) : records), [records, rebucket]);
  const chartKeys = useMemo(
    () => (rebucket ? fillTimeKeys([...new Set(chartRecords.map(record => record.key))].sort(), true) : keys),
    [chartRecords, keys, rebucket]
  );
  const consensusChart = useMemo(
    () => buildShareChartConfig(chartRecords, chartKeys, 'consensus', chartDaily, true),
    [chartRecords, chartKeys, chartDaily]
  );
  const executionChart = useMemo(
    () => buildShareChartConfig(chartRecords, chartKeys, 'execution', chartDaily, true),
    [chartRecords, chartKeys, chartDaily]
  );

  const setSearch = useCallback(
    (update: { t?: TimePeriod; entity?: string; layer?: ClientLayer }) =>
      navigate({ search: prev => ({ ...prev, ...update }), replace: true, resetScroll: false }),
    [navigate]
  );
  const clearEntity = useCallback(() => setSearch({ entity: undefined }), [setSearch]);

  const makeTooltip = useCallback(
    (layer: ClientLayer) =>
      (params: unknown): string => {
        const points = (Array.isArray(params) ? params : [params]) as Array<{ dataIndex?: number }>;
        const index = points[0]?.dataIndex;
        const key = index === undefined ? undefined : chartKeys[index];
        if (!key) return '';
        const { total, items } = bucketShares(chartRecords, key, layer, true);
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
    [chartKeys, chartRecords, chartDaily]
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
                    {entity ? 'Try a longer window or fewer filters.' : 'Nothing has been proposed in this window yet.'}
                  </p>
                </div>
                {entity && (
                  <Button variant="secondary" size="sm" rounded="sm" onClick={clearEntity}>
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
                blockScope={describeBlocks(entity, timePeriod)}
                blockChart={consensusChart}
                blockChartDaily={chartDaily}
                blockTooltip={makeTooltip('consensus')}
                peerRows={clPeers.rows}
                peerDay={clPeers.day}
                peersLoading={clPeers.isLoading}
                xatuNodes={nodeCounts}
                latestReleases={latestReleases}
                latestAdoption={adoption}
                unfilteredNote={unfilteredNote('consensus', entity)}
                adoptionScope={entity ? `from ${entityLabel(entity)}` : undefined}
              />
              <LayerClients
                layer="execution"
                blockSummaries={executionSummary}
                blockTotal={coverage.total}
                blockScope={describeBlocks(entity, timePeriod)}
                blockChart={executionChart}
                blockChartDaily={chartDaily}
                blockTooltip={makeTooltip('execution')}
                peerRows={elPeers.rows}
                peerDay={elPeers.day}
                peersLoading={elPeers.isLoading}
                latestReleases={latestReleases}
                latestAdoption={adoption}
                unfilteredNote={unfilteredNote('execution', entity)}
                adoptionScope={entity ? `from ${entityLabel(entity)}` : undefined}
              />
              <ClientPairs pairs={pairs} scope={describeBlocks(entity, timePeriod)} />
            </>
          )}

          <section id="performance" className="flex scroll-mt-24 flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base/7 font-semibold text-foreground">Performance</h2>
              {!entity && (
                <SegmentedControl
                  options={LAYER_OPTIONS}
                  value={performanceLayer}
                  onChange={value => setSearch({ layer: value })}
                  ariaLabel="Layer"
                />
              )}
            </div>
            {entity ? (
              <p className="text-xs/5 text-muted">
                Client performance can&apos;t be attributed to an entity; clear the entity filter to compare.
              </p>
            ) : (
              <>
                <ProposerBehaviour layer={performanceLayer} from={performanceFrom} />
                <AttestationPerformance layer={performanceLayer} from={performanceFrom} />
              </>
            )}
          </section>
        </div>
      )}
    </Container>
  );
}
