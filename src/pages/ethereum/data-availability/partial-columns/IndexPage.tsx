import { type JSX, useCallback, useMemo } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { Card } from '@/components/Layout/Card';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { InfoBox } from '@/components/Feedback/InfoBox';
import { Stats } from '@/components/DataDisplay/Stats';
import { MultiLineChart } from '@/components/Charts/MultiLine';
import type { SeriesData } from '@/components/Charts/MultiLine';
import { SegmentedControl } from '@/components/Forms/SegmentedControl';
import { useTableBounds } from '@/hooks/useBounds';
import {
  buildTooltipHtml,
  formatCompact,
  formatTooltipDate,
  type TooltipItem,
} from '@/pages/ethereum/execution/overview/overview.utils';
import { CompletionBlocksTable, PartialColumnsSkeleton, SentryFilter, VersionAdoption } from './components';
import { useCompletionBlocks, usePartialColumnRollups } from './hooks';
import {
  COMPLETION_HOURLY_TABLE,
  COMPLETION_PATHS,
  DEFAULT_TIME_PERIOD,
  PATH_COLORS,
  PATH_LABELS,
  TIME_PERIOD_OPTIONS,
  TIME_RANGE_CONFIG,
} from './constants';
import type { TimePeriod } from './IndexPage.types';
import {
  buildAdoptionSeries,
  buildCellSourceSeries,
  buildHeaderSeries,
  buildPathLatencySeries,
  buildPathShareSeries,
  buildUsefulCellSeries,
  buildVerdictSeries,
  formatBucketLabel,
  formatClientName,
  formatSeconds,
  formatShare,
  latestAdoption,
  pickSentryClient,
  sentryClientsOf,
  summariseCompletions,
  summarisePartials,
  summariseVersions,
} from './utils/partial-columns';

/** Formats a chart value as milliseconds from slot start */
const formatMs = (value: number): string => `${Math.round(value)}`;

/** Series values at one category index, as tooltip rows */
function seriesItems(
  series: SeriesData[],
  index: number,
  format: (value: number, entry: SeriesData) => string
): TooltipItem[] {
  return series.flatMap(entry => {
    const value = entry.data[index];
    if (typeof value !== 'number') return [];
    return [
      {
        color: entry.color ?? '#9ca3af',
        label: entry.name,
        value: format(value, entry),
        style: entry.lineStyle === 'dashed' ? ('dashed' as const) : undefined,
      },
    ];
  });
}

/** Partial columns page: partial message adoption, how sentry nodes complete their columns, and recent blocks. */
export function IndexPage(): JSX.Element {
  const navigate = useNavigate({ from: '/ethereum/data-availability/partial-columns' });
  const search = useSearch({ from: '/ethereum/data-availability/partial-columns' });
  const timePeriod: TimePeriod = search.t ?? DEFAULT_TIME_PERIOD;
  const config = TIME_RANGE_CONFIG[timePeriod];

  const { data: tableBounds, isLoading: boundsLoading } = useTableBounds(COMPLETION_HOURLY_TABLE);
  const hasData = !!tableBounds;

  const { pathRecords, partialRecords, peerRecords, keys, peerKeys, isDaily, isLoading, error } =
    usePartialColumnRollups(timePeriod);

  const sentryClients = useMemo(() => sentryClientsOf(pathRecords, partialRecords), [pathRecords, partialRecords]);
  const sentry = pickSentryClient(sentryClients, search.sentry);
  const sentryName = sentry ? formatClientName(sentry) : 'Sentry';
  const sentryPaths = useMemo(() => pathRecords.filter(r => r.sentryClient === sentry), [pathRecords, sentry]);
  const sentryPartials = useMemo(() => partialRecords.filter(r => r.sentryClient === sentry), [partialRecords, sentry]);

  const windowStart = useMemo(() => {
    if (config.days === null) return tableBounds?.min ?? 0;
    return Math.floor(Date.now() / 1000) - config.days * 24 * 3600;
  }, [config.days, tableBounds?.min]);
  const blocks = useCompletionBlocks(windowStart);

  const completion = useMemo(() => summariseCompletions(sentryPaths), [sentryPaths]);
  const partials = useMemo(() => summarisePartials(sentryPartials), [sentryPartials]);
  const adoption = useMemo(() => latestAdoption(peerRecords, isDaily), [peerRecords, isDaily]);
  const versions = useMemo(() => summariseVersions(peerRecords), [peerRecords]);

  const labels = useMemo(() => keys.map(key => formatBucketLabel(key, isDaily)), [keys, isDaily]);
  const peerLabels = useMemo(() => peerKeys.map(key => formatBucketLabel(key, isDaily)), [peerKeys, isDaily]);
  const charts = useMemo(
    () => ({
      adoption: buildAdoptionSeries(peerRecords, peerKeys),
      pathShare: buildPathShareSeries(sentryPaths, keys),
      pathLatency: buildPathLatencySeries(sentryPaths, keys),
      cellSource: buildCellSourceSeries(sentryPaths, keys),
      usefulCells: buildUsefulCellSeries(sentryPartials, keys),
      verdicts: buildVerdictSeries(sentryPartials, keys),
      header: buildHeaderSeries(sentryPartials, keys),
    }),
    [peerRecords, peerKeys, sentryPaths, sentryPartials, keys]
  );

  const setSearch = useCallback(
    (update: { t?: TimePeriod; sentry?: string }) =>
      navigate({ search: prev => ({ ...prev, ...update }), replace: true }),
    [navigate]
  );

  const tooltip = useCallback(
    (bucketKeys: string[], build: (index: number) => Array<{ title: string; items: TooltipItem[] }>) =>
      (params: unknown): string => {
        const points = (Array.isArray(params) ? params : [params]) as Array<{ dataIndex?: number }>;
        const index = points[0]?.dataIndex;
        const key = index === undefined ? undefined : bucketKeys[index];
        if (index === undefined || !key) return '';
        return buildTooltipHtml(formatTooltipDate(isDaily ? key : Number(key), isDaily), build(index));
      },
    [isDaily]
  );

  const pathShareTooltip = useMemo(
    () =>
      tooltip(keys, index => {
        const key = keys[index];
        const bucket = sentryPaths.filter(r => r.key === key);
        const total = bucket.reduce((sum, r) => sum + r.completions, 0);
        return [
          {
            title: `${sentryName} sentries (${total.toLocaleString()} completions)`,
            items: COMPLETION_PATHS.flatMap(path => {
              const count = bucket.filter(r => r.path === path).reduce((sum, r) => sum + r.completions, 0);
              if (count === 0) return [];
              return [
                {
                  color: PATH_COLORS[path],
                  label: PATH_LABELS[path],
                  value: `${formatShare(count, total)} (${count.toLocaleString()})`,
                },
              ];
            }),
          },
        ];
      }),
    [tooltip, keys, sentryPaths, sentryName]
  );

  const latencyTooltip = useMemo(
    () =>
      tooltip(keys, index => {
        const key = keys[index];
        return [
          {
            title: 'Completion time from slot start (p50 / p90 / p99)',
            items: COMPLETION_PATHS.flatMap(path => {
              const record = sentryPaths.find(r => r.key === key && r.path === path);
              if (!record) return [];
              return [
                {
                  color: PATH_COLORS[path],
                  label: PATH_LABELS[path],
                  value: `${formatSeconds(record.p50)} / ${formatSeconds(record.p90)} / ${formatSeconds(record.p99)}`,
                },
              ];
            }),
          },
        ];
      }),
    [tooltip, keys, sentryPaths]
  );

  const shareTooltip = (series: SeriesData[], bucketKeys: string[], title: string): ((params: unknown) => string) =>
    tooltip(bucketKeys, index => [{ title, items: seriesItems(series, index, value => `${value.toFixed(1)}%`) }]);

  const usefulTooltip = tooltip(keys, index => [
    {
      title: `${sentryName} sentries`,
      items: seriesItems(charts.usefulCells, index, (value, entry) =>
        entry.yAxisIndex === 1 ? value.toLocaleString() : `${value.toFixed(1)}%`
      ),
    },
  ]);
  const verdictTooltip = tooltip(keys, index => [
    { title: `${sentryName} sentry verdicts`, items: seriesItems(charts.verdicts, index, v => v.toLocaleString()) },
  ]);
  const headerTooltip = tooltip(keys, index => [
    {
      title: 'First header receipt per node and block',
      items: seriesItems(charts.header, index, value => formatSeconds(value)),
    },
  ]);

  const periodLabel = isDaily ? 'Daily' : 'Hourly';
  const hasPathData = completion.completions > 0;
  const hasCellVerdicts = partials.cellVerdicts > 0;
  const hasHeaders = partials.headerNodeBlocks > 0;
  const noSentryData = !isLoading && !boundsLoading && !error && sentryClients.length === 0;

  return (
    <Container>
      <Header
        title="Partial Columns"
        description="How sentry nodes complete their custody data columns: cell by cell over gossipsub partial messages, from the execution layer, or as whole columns"
      />

      {!boundsLoading && !hasData ? (
        <Card rounded title="No partial column data for this network">
          {null}
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
            <SentryFilter clients={sentryClients} value={sentry} onChange={client => setSearch({ sentry: client })} />
          </div>

          <InfoBox summary="How this is measured">
            Gossipsub partial messages (EIP-8136) let peers exchange data columns cell by cell: a node fills what it can
            from its execution layer with getBlobs, tells its peers which cells it has, and receives only the missing
            ones. Lighthouse v8.3.0 and Prysm v7.2.1 turn it on by default. Completion and message numbers come from
            ethPandaOps sentry nodes, one consensus client at a time: Prysm sentries capture every partial RPC on the
            wire, Lighthouse sentries what the gossipsub router passes to the client, and the two report different
            completion paths. Adoption counts the partial flags peers set when subscribing to data column topics.
          </InfoBox>

          {error && (
            <Card rounded>
              <p className="text-sm text-danger">Failed to load partial column data: {error.message}</p>
            </Card>
          )}

          {isLoading || boundsLoading ? (
            <PartialColumnsSkeleton />
          ) : error ? null : noSentryData ? (
            <Card rounded title="No completions in this window">
              <p className="text-sm/6 text-muted">Try a longer window.</p>
            </Card>
          ) : (
            <>
              <Stats
                gridClassName="grid grid-cols-2 gap-4 lg:grid-cols-4"
                stats={[
                  {
                    id: 'adoption',
                    name: 'Partial adoption',
                    value: adoption ? formatShare(adoption.requestsPartial, adoption.subscribed) : '-',
                    subtitle: adoption
                      ? `of ${Math.round(adoption.subscribed).toLocaleString()} subscribing peers request partials, ${formatTooltipDate(isDaily ? adoption.key : Number(adoption.key), isDaily)}`
                      : 'no subscription flags reported',
                  },
                  {
                    id: 'partial',
                    name: 'From partials',
                    value: formatShare(completion.byPath.PARTIAL_GOSSIP, completion.completions),
                    subtitle: `of ${completion.completions.toLocaleString()} ${sentryName} sentry column completions`,
                  },
                  {
                    id: 'el',
                    name: 'Cells from EL',
                    value: formatShare(completion.cellsFromEl, completion.cellsTotal),
                    subtitle: `of ${completion.cellsTotal.toLocaleString()} cells in completed columns`,
                  },
                  {
                    id: 'useful',
                    name: 'Useful cells',
                    value: formatShare(partials.newCells, partials.verdictCells),
                    subtitle: hasCellVerdicts
                      ? `new cells of ${partials.verdictCells.toLocaleString()} checked`
                      : `no cell verdicts from ${sentryName} sentries`,
                  },
                ]}
              />

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <PopoutCard
                  title="Peers Requesting Partial Messages"
                  subtitle={`${periodLabel} share of subscribing peers that request partial messages on data column topics`}
                  anchorId="partial-adoption"
                  modalSize="full"
                >
                  {({ inModal }) =>
                    charts.adoption.length === 0 ? (
                      <p className="text-sm text-muted">No sentry reported peer subscription flags in this window.</p>
                    ) : (
                      <MultiLineChart
                        series={charts.adoption}
                        xAxis={{ type: 'category', labels: peerLabels, name: 'Date' }}
                        yAxis={{ name: 'Requesting (%)', min: 0, max: 100 }}
                        height={inModal ? 600 : 320}
                        showLegend
                        legendPosition="top"
                        enableDataZoom
                        tooltipFormatter={shareTooltip(
                          charts.adoption,
                          peerKeys,
                          'Subscribing peers requesting partials'
                        )}
                      />
                    )
                  }
                </PopoutCard>

                <VersionAdoption versions={versions} isDaily={isDaily} />

                <PopoutCard
                  title="Completion Paths"
                  subtitle={`${periodLabel} share of ${sentryName} sentry column completions by how the column was completed`}
                  anchorId="completion-paths"
                  modalSize="full"
                >
                  {({ inModal }) =>
                    hasPathData ? (
                      <MultiLineChart
                        series={charts.pathShare}
                        xAxis={{ type: 'category', labels, name: 'Date' }}
                        yAxis={{ name: 'Share (%)', min: 0, max: 100 }}
                        height={inModal ? 600 : 320}
                        showLegend
                        legendPosition="top"
                        enableDataZoom
                        tooltipFormatter={pathShareTooltip}
                        syncGroup={inModal ? undefined : 'partial-columns'}
                      />
                    ) : (
                      <p className="text-sm text-muted">No completions from {sentryName} sentries in this window.</p>
                    )
                  }
                </PopoutCard>

                <PopoutCard
                  title="Completion Time by Path"
                  subtitle={`${periodLabel} median time from slot start until a ${sentryName} sentry completed a column`}
                  anchorId="completion-time"
                  modalSize="full"
                >
                  {({ inModal }) =>
                    hasPathData ? (
                      <MultiLineChart
                        series={charts.pathLatency}
                        xAxis={{ type: 'category', labels, name: 'Date' }}
                        yAxis={{ name: 'Time (ms)', min: 0, formatter: formatMs }}
                        height={inModal ? 600 : 320}
                        showLegend
                        legendPosition="top"
                        enableDataZoom
                        tooltipFormatter={latencyTooltip}
                        syncGroup={inModal ? undefined : 'partial-columns'}
                      />
                    ) : (
                      <p className="text-sm text-muted">No completions from {sentryName} sentries in this window.</p>
                    )
                  }
                </PopoutCard>

                <PopoutCard
                  title="Cells by Source"
                  subtitle={`${periodLabel} share of the cells in ${sentryName} sentry completed columns by where they came from`}
                  anchorId="cells-by-source"
                  modalSize="full"
                >
                  {({ inModal }) =>
                    charts.cellSource.length > 0 ? (
                      <MultiLineChart
                        series={charts.cellSource}
                        xAxis={{ type: 'category', labels, name: 'Date' }}
                        yAxis={{ name: 'Share (%)', min: 0, max: 100 }}
                        height={inModal ? 600 : 320}
                        showLegend
                        legendPosition="top"
                        enableDataZoom
                        tooltipFormatter={shareTooltip(charts.cellSource, keys, `${sentryName} sentry cells`)}
                        syncGroup={inModal ? undefined : 'partial-columns'}
                      />
                    ) : (
                      <p className="text-sm text-muted">
                        No completed cells from {sentryName} sentries in this window.
                      </p>
                    )
                  }
                </PopoutCard>

                <PopoutCard
                  title="Useful Partial Cells"
                  subtitle={`${periodLabel} share of received cells that were new to the ${sentryName} sentry and passed verification`}
                  anchorId="useful-cells"
                  modalSize="full"
                >
                  {({ inModal }) =>
                    hasCellVerdicts ? (
                      <MultiLineChart
                        series={charts.usefulCells}
                        xAxis={{ type: 'category', labels, name: 'Date' }}
                        yAxis={{ name: 'Useful (%)', min: 0, max: 100 }}
                        secondaryYAxis={{ name: 'Cells received', min: 0, formatter: formatCompact }}
                        height={inModal ? 600 : 320}
                        showLegend
                        legendPosition="top"
                        enableDataZoom
                        tooltipFormatter={usefulTooltip}
                        syncGroup={inModal ? undefined : 'partial-columns'}
                      />
                    ) : (
                      <p className="text-sm text-muted">
                        {sentryName} sentries reported no cell verdicts in this window.
                        {sentry === 'prysm' && ' Their partial peers send them header pushes but no cells.'}
                      </p>
                    )
                  }
                </PopoutCard>

                <PopoutCard
                  title="Partial Message Verdicts"
                  subtitle={`${periodLabel} validation verdicts on partial messages received by ${sentryName} sentries`}
                  anchorId="verdicts"
                  modalSize="full"
                >
                  {({ inModal }) =>
                    charts.verdicts.length > 0 ? (
                      <MultiLineChart
                        series={charts.verdicts}
                        xAxis={{ type: 'category', labels, name: 'Date' }}
                        yAxis={{ name: 'Verdicts', min: 0, formatter: formatCompact }}
                        height={inModal ? 600 : 320}
                        showLegend
                        legendPosition="top"
                        enableDataZoom
                        tooltipFormatter={verdictTooltip}
                        syncGroup={inModal ? undefined : 'partial-columns'}
                      />
                    ) : (
                      <p className="text-sm text-muted">No verdicts from {sentryName} sentries in this window.</p>
                    )
                  }
                </PopoutCard>

                <PopoutCard
                  title="Header Push"
                  subtitle={`${periodLabel} time from slot start until a ${sentryName} sentry first received a block's partial column header`}
                  anchorId="header-push"
                  modalSize="full"
                >
                  {({ inModal }) =>
                    hasHeaders ? (
                      <MultiLineChart
                        series={charts.header}
                        xAxis={{ type: 'category', labels, name: 'Date' }}
                        yAxis={{ name: 'Time (ms)', min: 0, formatter: formatMs }}
                        height={inModal ? 600 : 320}
                        showLegend
                        legendPosition="top"
                        enableDataZoom
                        tooltipFormatter={headerTooltip}
                        syncGroup={inModal ? undefined : 'partial-columns'}
                      />
                    ) : (
                      <p className="text-sm text-muted">
                        No partial column headers in this window. Only Fulu blocks push a header, Gloas blocks take
                        their commitments from the bid.
                      </p>
                    )
                  }
                </PopoutCard>
              </div>
            </>
          )}

          {hasData && !error && (
            <CompletionBlocksTable
              blocks={blocks.blocks}
              isLoading={blocks.isLoading}
              error={blocks.error}
              hasNextPage={blocks.hasNextPage}
              isFetchingNextPage={blocks.isFetchingNextPage}
              onLoadMore={blocks.fetchNextPage}
            />
          )}
        </div>
      )}
    </Container>
  );
}
