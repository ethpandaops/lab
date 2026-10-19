import { type JSX, useCallback, useMemo } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import clsx from 'clsx';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { Card } from '@/components/Layout/Card';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { InfoBox } from '@/components/Feedback/InfoBox';
import { Stats } from '@/components/DataDisplay/Stats';
import { Toggle } from '@/components/Forms/Toggle';
import { MultiLineChart } from '@/components/Charts/MultiLine';
import { useNetwork } from '@/hooks/useNetwork';
import { useTableBounds } from '@/hooks/useBounds';
import { getClientColor } from '@/utils/ethereum';
import { buildTooltipHtml, formatTooltipDate } from '@/pages/ethereum/execution/overview/overview.utils';
import { ClientBreakdown, ClientPairs, ClientsSkeleton, GraffitiBlocksTable } from './components';
import { useClientCounts, useGraffitiBlocks } from './hooks';
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
  formatClientName,
  summariseClients,
  summarisePairs,
  type ClientLayer,
} from './utils/client-share';

/** Formats a share of blocks as a percentage, or a dash when there are no blocks */
function formatShare(part: number, total: number): string {
  return total > 0 ? `${((part / total) * 100).toFixed(1)}%` : '-';
}

/** Proposer clients page: client shares of proposed blocks parsed from graffiti, with a per-block drill-down. */
export function IndexPage(): JSX.Element {
  const navigate = useNavigate({ from: '/ethereum/clients' });
  const search = useSearch({ from: '/ethereum/clients' });
  const timePeriod: TimePeriod = search.t ?? DEFAULT_TIME_PERIOD;
  const identifiedOnly = search.identified ?? false;
  const config = TIME_RANGE_CONFIG[timePeriod];

  const { currentNetwork } = useNetwork();
  const { data: tableBounds, isLoading: boundsLoading } = useTableBounds(BLOCK_GRAFFITI_TABLE);
  const hasData = !!tableBounds;

  const { records, keys, isDaily, isLoading, error } = useClientCounts(timePeriod);

  const windowStart = useMemo(() => {
    if (config.days === null) return tableBounds?.min ?? 0;
    return Math.floor(Date.now() / 1000) - config.days * 24 * 3600;
  }, [config.days, tableBounds?.min]);

  const blocks = useGraffitiBlocks({
    since: windowStart,
    consensusClient: search.cl,
    executionClient: search.el,
  });

  const coverage = useMemo(() => computeCoverage(records), [records]);
  const consensusSummary = useMemo(() => summariseClients(records, 'consensus'), [records]);
  const executionSummary = useMemo(() => summariseClients(records, 'execution'), [records]);
  const pairs = useMemo(() => summarisePairs(records), [records]);
  const consensusChart = useMemo(
    () => buildShareChartConfig(records, keys, 'consensus', isDaily, identifiedOnly),
    [records, keys, isDaily, identifiedOnly]
  );
  const executionChart = useMemo(
    () => buildShareChartConfig(records, keys, 'execution', isDaily, identifiedOnly),
    [records, keys, isDaily, identifiedOnly]
  );

  const setSearch = useCallback(
    (update: { t?: TimePeriod; cl?: string; el?: string; identified?: boolean }) =>
      navigate({ search: prev => ({ ...prev, ...update }), replace: true }),
    [navigate]
  );

  const makeTooltip = useCallback(
    (layer: ClientLayer) =>
      (params: unknown): string => {
        const points = (Array.isArray(params) ? params : [params]) as Array<{ dataIndex?: number }>;
        const index = points[0]?.dataIndex;
        const key = index === undefined ? undefined : keys[index];
        if (!key) return '';
        const { total, items } = bucketShares(records, key, layer, identifiedOnly);
        return buildTooltipHtml(formatTooltipDate(isDaily ? key : Number(key), isDaily), [
          {
            title: `${layer === 'consensus' ? 'CONSENSUS' : 'EXECUTION'} CLIENTS (${total} blocks)`,
            items: items.map((item, i) => ({
              color: getClientColor(item.client, i),
              label: formatClientName(item.client),
              value: `${item.share.toFixed(1)}% (${item.blocks})`,
            })),
          },
        ]);
      },
    [keys, records, identifiedOnly, isDaily]
  );

  const periodLabel = isDaily ? 'Daily' : 'Hourly';
  const shareSubtitle = identifiedOnly
    ? `${periodLabel} share of blocks whose graffiti names a client`
    : `${periodLabel} share of all proposed blocks, unknown included`;

  return (
    <Container>
      <Header
        title="Proposer Clients"
        description="Consensus and execution clients of block proposers, parsed from block graffiti"
        showAccent={false}
      />

      {!boundsLoading && !hasData ? (
        <Card rounded>
          <div className="flex flex-col gap-2">
            <h3 className="text-base/7 font-semibold text-foreground">No graffiti data for this network</h3>
            <p className="text-sm/6 text-muted">
              {currentNetwork?.display_name ?? 'This network'} has no parsed block graffiti yet, so its proposer clients
              cannot be shown.
            </p>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex flex-wrap items-center gap-1.5">
              {TIME_PERIOD_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSearch({ t: value })}
                  className={clsx(
                    'rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                    timePeriod === value
                      ? 'text-primary-foreground bg-primary ring-2 ring-primary/30'
                      : 'bg-surface text-muted ring-1 ring-border hover:bg-primary/10 hover:ring-primary/30'
                  )}
                >
                  {label}
                </button>
              ))}
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

          <InfoBox>
            Clients are read from what proposers put in their graffiti: the engine API client version codes most
            consensus clients append (for example <span className="font-mono">GEa579PMfea2</span>) or a client&apos;s
            default version string. Blocks with empty or custom graffiti count as unknown, so these shares describe the
            blocks that name a client, not the whole validator set.
          </InfoBox>

          {error && (
            <Card rounded>
              <p className="text-sm text-danger">Failed to load client counts: {error.message}</p>
            </Card>
          )}

          {isLoading || boundsLoading ? (
            <ClientsSkeleton />
          ) : (
            <>
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

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <PopoutCard
                  title="Consensus Client Share"
                  subtitle={shareSubtitle}
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
                  subtitle={shareSubtitle}
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
                  selectedClient={search.cl}
                  onSelect={client => setSearch({ cl: client })}
                />
                <ClientBreakdown
                  title="Execution clients"
                  summaries={executionSummary}
                  identifiedOnly={identifiedOnly}
                  selectedClient={search.el}
                  onSelect={client => setSearch({ el: client })}
                />
              </div>

              <ClientPairs
                pairs={pairs}
                onSelect={pair => setSearch({ cl: pair.consensusClient, el: pair.executionClient })}
              />
            </>
          )}

          <GraffitiBlocksTable
            blocks={blocks.blocks}
            isLoading={blocks.isLoading}
            error={blocks.error}
            hasNextPage={blocks.hasNextPage}
            isFetchingNextPage={blocks.isFetchingNextPage}
            onLoadMore={blocks.fetchNextPage}
            consensusClient={search.cl}
            executionClient={search.el}
            onClearFilter={layer => setSearch(layer === 'consensus' ? { cl: undefined } : { el: undefined })}
          />
        </div>
      )}
    </Container>
  );
}
