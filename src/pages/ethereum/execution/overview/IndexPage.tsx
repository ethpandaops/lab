import { type JSX, useMemo, useCallback, useState } from 'react';
import clsx from 'clsx';
import { useSearch, useNavigate } from '@tanstack/react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { completeBucketEnd, completeUtcDays, currentUtcDate } from '@/utils/time';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { Card } from '@/components/Layout/Card';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import {
  MultiLineChart,
  createBlobScheduleMarkLines,
  createExecutionForkMarkLines,
  createForkMarkLines,
  type MultiLineChartProps,
} from '@/components/Charts/MultiLine';
import { useNetwork } from '@/hooks/useNetwork';
import { useForks } from '@/hooks/useForks';
import { Toggle } from '@/components/Forms/Toggle';
import { SegmentedControl } from '@/components/Forms/SegmentedControl';
import {
  fctExecutionTpsHourlyServiceList,
  fctExecutionTpsDailyServiceList,
  fctExecutionGasUsedHourlyServiceList,
  fctExecutionGasUsedDailyServiceList,
  fctExecutionGasLimitHourlyServiceList,
  fctExecutionGasLimitDailyServiceList,
  fctExecutionGasLimitSignallingHourlyServiceList,
  fctExecutionGasLimitSignallingDailyServiceList,
  fctExecutionTransactionsHourlyServiceList,
  fctExecutionTransactionsDailyServiceList,
  fctExecutionReceiptSizeHourlyServiceList,
  fctExecutionReceiptSizeDailyServiceList,
  fctOpcodeOpsHourlyServiceList,
  fctOpcodeOpsDailyServiceList,
} from '@/api/sdk.gen';
import type {
  FctExecutionTpsHourly,
  FctExecutionTpsDaily,
  FctExecutionGasUsedHourly,
  FctExecutionGasUsedDaily,
  FctExecutionGasLimitHourly,
  FctExecutionGasLimitDaily,
  FctExecutionGasLimitSignallingHourly,
  FctExecutionGasLimitSignallingDaily,
  FctExecutionTransactionsHourly,
  FctExecutionTransactionsDaily,
  FctExecutionReceiptSizeHourly,
  FctExecutionReceiptSizeDaily,
  FctOpcodeOpsHourly,
  FctOpcodeOpsDaily,
} from '@/api/types.gen';
import { hexToRgba } from '@/utils';
import { getDataVizColors } from '@/utils/dataVizColors';
import { ExecutionOverviewSkeleton } from './components';
import { type TimePeriod, TIME_RANGE_CONFIG, TIME_PERIOD_OPTIONS, GAS_BANDS } from './constants';
import {
  FIRST_BLOCK_DAY,
  buildSignallingSeries,
  buildStatSeries,
  buildTooltipHtml,
  bucketSeconds,
  formatBigNum,
  formatBucket,
  formatBytesDecimal,
  formatCompact,
  formatCumulativeGas,
  periodOps,
  periodTps,
  rowTime,
  statTooltipSections,
  timedRows,
  tooltipTime,
  type TooltipSection,
} from './overview.utils';

const { DATA_COLORS } = getDataVizColors();

const DAY_SECONDS = 86_400;

/**
 * Every chart on the page draws its plot between the same edges, so the time axes, fork lines and the
 * shared crosshair line up from one chart to the next. The right edge leaves room for a secondary axis.
 */
const CHART_GRID = { left: 52, right: 56, top: 32, bottom: 28 };

/** Compact labels for a cumulative axis */
function formatCumulativeAxis(val: number): string {
  if (val >= 1e18) return `${(val / 1e18).toFixed(1)}E`;
  if (val >= 1e15) return `${(val / 1e15).toFixed(1)}P`;
  if (val >= 1e12) return `${(val / 1e12).toFixed(1)}T`;
  if (val >= 1e9) return `${(val / 1e9).toFixed(1)}B`;
  if (val >= 1e6) return `${(val / 1e6).toFixed(0)}M`;
  if (val >= 1e3) return `${(val / 1e3).toFixed(0)}K`;
  return String(val);
}

/** Rows of every table the page charts, for one time period */
interface OverviewData {
  period: TimePeriod;
  tps?: (FctExecutionTpsHourly | FctExecutionTpsDaily)[];
  gasUsed?: (FctExecutionGasUsedHourly | FctExecutionGasUsedDaily)[];
  gasLimit?: (FctExecutionGasLimitHourly | FctExecutionGasLimitDaily)[];
  transactions?: (FctExecutionTransactionsHourly | FctExecutionTransactionsDaily)[];
  receiptSize?: (FctExecutionReceiptSizeHourly | FctExecutionReceiptSizeDaily)[];
  opcodeOps?: (FctOpcodeOpsHourly | FctOpcodeOpsDaily)[];
  signalling?: (FctExecutionGasLimitSignallingHourly | FctExecutionGasLimitSignallingDaily)[];
  /** Newest signalling row before the period in progress, wherever the window ends */
  signallingLatest?: FctExecutionGasLimitSignallingHourly | FctExecutionGasLimitSignallingDaily;
}

/**
 * Reads every table the page charts for one time period, in parallel. Hourly periods read the
 * complete hours of the window; daily periods read complete UTC days, up to but never including today.
 */
async function fetchOverview(period: TimePeriod, signal: AbortSignal): Promise<OverviewData> {
  const config = TIME_RANGE_CONFIG[period];
  const hourlyEnd = completeBucketEnd('hour');
  const today = currentUtcDate();
  const hourly = {
    hour_start_date_time_gte: hourlyEnd - (config.days ?? 0) * DAY_SECONDS,
    hour_start_date_time_lt: hourlyEnd,
    order_by: 'hour_start_date_time asc',
    page_size: config.pageSize,
  };
  const daily = { day_start_date_ne: today, order_by: 'day_start_date desc', page_size: config.pageSize };
  const latestHour = { hour_start_date_time_lt: hourlyEnd, order_by: 'hour_start_date_time desc', page_size: 1 };
  const latestDay = { day_start_date_ne: today, order_by: 'day_start_date desc', page_size: 1 };
  const opts = { signal, throwOnError: true as const };

  if (config.dataType === 'daily') {
    const [tps, gasUsed, gasLimit, transactions, receiptSize, opcodeOps, signalling, signallingLatest] =
      await Promise.all([
        fctExecutionTpsDailyServiceList({ query: daily, ...opts }).then(r => r.data.fct_execution_tps_daily),
        fctExecutionGasUsedDailyServiceList({ query: daily, ...opts }).then(r => r.data.fct_execution_gas_used_daily),
        fctExecutionGasLimitDailyServiceList({ query: daily, ...opts }).then(r => r.data.fct_execution_gas_limit_daily),
        fctExecutionTransactionsDailyServiceList({ query: daily, ...opts }).then(
          r => r.data.fct_execution_transactions_daily
        ),
        fctExecutionReceiptSizeDailyServiceList({ query: daily, ...opts }).then(
          r => r.data.fct_execution_receipt_size_daily
        ),
        fctOpcodeOpsDailyServiceList({ query: daily, ...opts }).then(r => r.data.fct_opcode_ops_daily),
        fctExecutionGasLimitSignallingDailyServiceList({ query: daily, ...opts }).then(
          r => r.data.fct_execution_gas_limit_signalling_daily
        ),
        fctExecutionGasLimitSignallingDailyServiceList({ query: latestDay, ...opts }).then(
          r => r.data.fct_execution_gas_limit_signalling_daily?.[0]
        ),
      ]);
    return { period, tps, gasUsed, gasLimit, transactions, receiptSize, opcodeOps, signalling, signallingLatest };
  }

  const [tps, gasUsed, gasLimit, transactions, receiptSize, opcodeOps, signalling, signallingLatest] =
    await Promise.all([
      fctExecutionTpsHourlyServiceList({ query: hourly, ...opts }).then(r => r.data.fct_execution_tps_hourly),
      fctExecutionGasUsedHourlyServiceList({ query: hourly, ...opts }).then(r => r.data.fct_execution_gas_used_hourly),
      fctExecutionGasLimitHourlyServiceList({ query: hourly, ...opts }).then(
        r => r.data.fct_execution_gas_limit_hourly
      ),
      fctExecutionTransactionsHourlyServiceList({ query: hourly, ...opts }).then(
        r => r.data.fct_execution_transactions_hourly
      ),
      fctExecutionReceiptSizeHourlyServiceList({ query: hourly, ...opts }).then(
        r => r.data.fct_execution_receipt_size_hourly
      ),
      fctOpcodeOpsHourlyServiceList({ query: hourly, ...opts }).then(r => r.data.fct_opcode_ops_hourly),
      fctExecutionGasLimitSignallingHourlyServiceList({ query: hourly, ...opts }).then(
        r => r.data.fct_execution_gas_limit_signalling_hourly
      ),
      fctExecutionGasLimitSignallingHourlyServiceList({ query: latestHour, ...opts }).then(
        r => r.data.fct_execution_gas_limit_signalling_hourly?.[0]
      ),
    ]);
  return { period, tps, gasUsed, gasLimit, transactions, receiptSize, opcodeOps, signalling, signallingLatest };
}

/**
 * IndexPage - Execution Overview: throughput and per-block charts on one shared time axis
 */
export function IndexPage(): JSX.Element {
  const navigate = useNavigate({ from: '/ethereum/execution/overview' });
  const { t } = useSearch({ from: '/ethereum/execution/overview' });
  const timePeriod: TimePeriod = t ?? 'all';
  const [showAnnotations, setShowAnnotations] = useState(true);

  const { currentNetwork } = useNetwork();
  const { allForks } = useForks();

  // One query for every table, so a range change keeps the previous range's charts, complete and
  // consistent, on screen until the new range has loaded; the page doesn't collapse and jump
  const query = useQuery({
    queryKey: ['execution-overview', currentNetwork?.name, timePeriod],
    queryFn: ({ signal }) => fetchOverview(timePeriod, signal),
    placeholderData: keepPreviousData,
    enabled: !!currentNetwork,
  });
  const data = query.data;

  // Everything below describes the period of the data on screen, which lags the selection while it loads
  const shownPeriod = data?.period ?? timePeriod;
  const config = TIME_RANGE_CONFIG[shownPeriod];
  const isDaily = config.dataType === 'daily';
  const bucket = bucketSeconds(isDaily);

  const rows = useMemo(
    () => ({
      tps: timedRows(data?.tps, bucket),
      gasUsed: timedRows(data?.gasUsed, bucket),
      gasLimit: timedRows(data?.gasLimit, bucket),
      transactions: timedRows(data?.transactions, bucket),
      receiptSize: timedRows(data?.receiptSize, bucket),
      opcodeOps: timedRows(data?.opcodeOps, bucket),
      signalling: timedRows(data?.signalling, bucket),
    }),
    [data, bucket]
  );

  // The time axis every chart shares: the selected window, or for All from the earliest row of any chart.
  // Points sit at the start of their hour or day, so the axis ends at the last complete one.
  const domain = useMemo((): [number, number] | null => {
    if (!data) return null;
    if (!isDaily) {
      const end = completeBucketEnd('hour');
      return [end - (config.days ?? 0) * DAY_SECONDS, end - 3600];
    }
    const lastDay = completeBucketEnd('day') - DAY_SECONDS;
    if (config.days !== null) return [Date.parse(`${completeUtcDays(config.days)[0]}T00:00:00Z`) / 1000, lastDay];
    const firsts = Object.values(rows)
      .map(r => r.times[0])
      .filter((v): v is number => v !== undefined);
    return firsts.length ? [Math.max(FIRST_BLOCK_DAY, Math.min(...firsts)), lastDay] : null;
  }, [data, isDaily, config.days, rows]);

  const xAxis = useMemo(
    (): MultiLineChartProps['xAxis'] | null => (domain ? { type: 'time', min: domain[0], max: domain[1] } : null),
    [domain]
  );

  // Fork, upgrade and blob schedule lines at their exact times, the same on every chart
  const forkMarkLines = useMemo(() => {
    if (!currentNetwork || !domain) return [];
    return [
      ...(allForks.length
        ? createForkMarkLines({ forks: allForks, range: domain, genesisTime: currentNetwork.genesis_time })
        : []),
      ...(currentNetwork.forks?.execution
        ? createExecutionForkMarkLines({ executionForks: currentNetwork.forks.execution, range: domain })
        : []),
      ...(currentNetwork.blob_schedule?.length
        ? createBlobScheduleMarkLines({
            blobSchedule: currentNetwork.blob_schedule,
            range: domain,
            genesisTime: currentNetwork.genesis_time,
          })
        : []),
    ];
  }, [currentNetwork, allForks, domain]);

  // When signalling data stops more than a day before the axis ends, name where it ends
  const signallingEnd = useMemo(() => {
    const latest = data?.signallingLatest ? rowTime(data.signallingLatest) : null;
    if (latest === null || !domain) return null;
    return domain[1] - latest > DAY_SECONDS ? formatBucket(latest, isDaily) : null;
  }, [data, domain, isDaily]);

  // ==========================================================================
  // Series
  // ==========================================================================

  const tpsSeries = useMemo(
    () =>
      buildStatSeries(
        rows.tps,
        r => ({
          avg: periodTps(r),
          movingAvg: r.moving_avg_tps,
          median: r.p50_tps,
          p05: r.p05_tps,
          p95: r.p95_tps,
          lowerBand: r.lower_band_tps,
          upperBand: r.upper_band_tps,
          min: r.min_tps,
          max: r.max_tps,
        }),
        'tps'
      ),
    [rows.tps]
  );

  const opsSeries = useMemo(
    () =>
      buildStatSeries(
        rows.opcodeOps,
        r => ({
          avg: periodOps(r),
          movingAvg: r.moving_avg_ops,
          median: r.p50_ops,
          p05: r.p05_ops,
          p95: r.p95_ops,
          lowerBand: r.lower_band_ops,
          upperBand: r.upper_band_ops,
          min: r.min_ops,
          max: r.max_ops,
        }),
        'ops'
      ),
    [rows.opcodeOps]
  );

  const gasSeries = useMemo(
    () =>
      buildStatSeries(
        rows.gasUsed,
        r => ({
          avg: r.avg_gas_used ?? 0,
          movingAvg: r.moving_avg_gas_used,
          median: r.p50_gas_used,
          p05: r.p05_gas_used,
          p95: r.p95_gas_used,
          lowerBand: r.lower_band_gas_used,
          upperBand: r.upper_band_gas_used,
          min: r.min_gas_used,
          max: r.max_gas_used,
        }),
        'gas',
        [
          {
            series: { name: 'Cumulative', color: hexToRgba(DATA_COLORS.slate, 0.6), lineWidth: 1.5, yAxisIndex: 1 },
            value: (t: number) => Number(rows.gasUsed.byTime.get(t)?.cumulative_gas_used ?? 0),
          },
          ...(rows.gasLimit.byTime.size
            ? [
                {
                  series: { name: 'Gas Limit', color: DATA_COLORS.red, lineWidth: 2, lineStyle: 'dashed' as const },
                  value: (t: number) => rows.gasLimit.byTime.get(t)?.max_gas_limit ?? null,
                },
              ]
            : []),
        ].map(line => ({ ...line, series: { ...line.series, group: 'Statistics' } }))
      ),
    [rows.gasUsed, rows.gasLimit]
  );

  const transactionsSeries = useMemo(
    () =>
      buildStatSeries(
        rows.transactions,
        r => ({
          avg: r.avg_txn_per_block ?? 0,
          movingAvg: r.moving_avg_txn_per_block,
          median: r.p50_txn_per_block,
          p05: r.p05_txn_per_block,
          p95: r.p95_txn_per_block,
          lowerBand: r.lower_band_txn_per_block,
          upperBand: r.upper_band_txn_per_block,
          min: r.min_txn_per_block,
          max: r.max_txn_per_block,
        }),
        'txn',
        [
          {
            series: {
              name: 'Cumulative',
              color: hexToRgba(DATA_COLORS.slate, 0.6),
              lineWidth: 1.5,
              yAxisIndex: 1,
              group: 'Statistics',
            },
            value: t => Number(rows.transactions.byTime.get(t)?.cumulative_transactions ?? 0),
          },
        ]
      ),
    [rows.transactions]
  );

  const receiptSeries = useMemo(
    () =>
      buildStatSeries(
        rows.receiptSize,
        r => ({
          avg: r.avg_receipt_bytes_per_block ?? 0,
          movingAvg: r.moving_avg_receipt_bytes_per_block,
          median: r.p50_receipt_bytes_per_block,
          p05: r.p05_receipt_bytes_per_block,
          p95: r.p95_receipt_bytes_per_block,
          lowerBand: r.lower_band_receipt_bytes_per_block,
          upperBand: r.upper_band_receipt_bytes_per_block,
          min: r.min_receipt_bytes_per_block,
          max: r.max_receipt_bytes_per_block,
        }),
        'receipt'
      ),
    [rows.receiptSize]
  );

  const signallingSeries = useMemo(() => buildSignallingSeries(rows.signalling), [rows.signalling]);

  // ==========================================================================
  // Tooltips
  // ==========================================================================

  /** Tooltip for the bucket under the cursor, or nothing when the chart has no row there */
  const tooltip = useCallback(
    <T,>(byTime: Map<number, T>, sections: (row: T, t: number) => TooltipSection[]) =>
      (params: unknown): string => {
        const t = tooltipTime(params);
        const row = t === null ? undefined : byTime.get(t);
        if (t === null || !row) return '';
        return buildTooltipHtml(formatBucket(t, isDaily), sections(row, t));
      },
    [isDaily]
  );

  const tpsTooltip = useMemo(
    () =>
      tooltip(rows.tps.byTime, r =>
        statTooltipSections(
          {
            avg: periodTps(r),
            movingAvg: r.moving_avg_tps,
            median: r.p50_tps,
            p05: r.p05_tps,
            p95: r.p95_tps,
            lowerBand: r.lower_band_tps,
            upperBand: r.upper_band_tps,
            min: r.min_tps,
            max: r.max_tps,
          },
          v => v.toFixed(2)
        )
      ),
    [tooltip, rows.tps]
  );

  const opsTooltip = useMemo(
    () =>
      tooltip(rows.opcodeOps.byTime, r =>
        statTooltipSections(
          {
            avg: periodOps(r),
            movingAvg: r.moving_avg_ops,
            median: r.p50_ops,
            p05: r.p05_ops,
            p95: r.p95_ops,
            lowerBand: r.lower_band_ops,
            upperBand: r.upper_band_ops,
            min: r.min_ops,
            max: r.max_ops,
          },
          formatCompact
        )
      ),
    [tooltip, rows.opcodeOps]
  );

  const gasTooltip = useMemo(
    () =>
      tooltip(rows.gasUsed.byTime, (r, t) => {
        const limit = rows.gasLimit.byTime.get(t)?.max_gas_limit;
        return statTooltipSections(
          {
            avg: r.avg_gas_used ?? 0,
            movingAvg: r.moving_avg_gas_used,
            median: r.p50_gas_used,
            p05: r.p05_gas_used,
            p95: r.p95_gas_used,
            lowerBand: r.lower_band_gas_used,
            upperBand: r.upper_band_gas_used,
            min: r.min_gas_used,
            max: r.max_gas_used,
          },
          formatCompact,
          [
            {
              color: hexToRgba(DATA_COLORS.slate, 0.6),
              label: 'Cumulative',
              value: formatCumulativeGas(r.cumulative_gas_used ?? 0),
            },
            ...(limit !== undefined
              ? [{ color: DATA_COLORS.red, label: 'Gas Limit', value: formatCompact(limit), style: 'dashed' as const }]
              : []),
          ]
        );
      }),
    [tooltip, rows.gasUsed, rows.gasLimit]
  );

  const transactionsTooltip = useMemo(
    () =>
      tooltip(rows.transactions.byTime, r =>
        statTooltipSections(
          {
            avg: r.avg_txn_per_block ?? 0,
            movingAvg: r.moving_avg_txn_per_block,
            median: r.p50_txn_per_block,
            p05: r.p05_txn_per_block,
            p95: r.p95_txn_per_block,
            lowerBand: r.lower_band_txn_per_block,
            upperBand: r.upper_band_txn_per_block,
            min: r.min_txn_per_block,
            max: r.max_txn_per_block,
          },
          v => v.toLocaleString(),
          [
            {
              color: hexToRgba(DATA_COLORS.slate, 0.6),
              label: 'Cumulative',
              value: formatBigNum(r.cumulative_transactions),
            },
            {
              color: hexToRgba(DATA_COLORS.slate, 0.6),
              label: 'Period Total',
              value: formatBigNum(r.total_transactions),
            },
          ]
        )
      ),
    [tooltip, rows.transactions]
  );

  const receiptTooltip = useMemo(
    () =>
      tooltip(rows.receiptSize.byTime, r =>
        statTooltipSections(
          {
            avg: r.avg_receipt_bytes_per_block ?? 0,
            movingAvg: r.moving_avg_receipt_bytes_per_block,
            median: r.p50_receipt_bytes_per_block,
            p05: r.p05_receipt_bytes_per_block,
            p95: r.p95_receipt_bytes_per_block,
            lowerBand: r.lower_band_receipt_bytes_per_block,
            upperBand: r.upper_band_receipt_bytes_per_block,
            min: r.min_receipt_bytes_per_block,
            max: r.max_receipt_bytes_per_block,
          },
          v => formatBytesDecimal(v, 1)
        )
      ),
    [tooltip, rows.receiptSize]
  );

  const signallingTooltip = useCallback(
    (params: unknown): string => {
      const t = tooltipTime(params);
      if (t === null || !rows.signalling.byTime.has(t)) return '';
      type TooltipParam = { value?: [number, number | null]; seriesName?: string };
      const byName = new Map<string, number>();
      for (const p of (Array.isArray(params) ? params : [params]) as TooltipParam[]) {
        if (p.seriesName) byName.set(p.seriesName, p.value?.[1] ?? 0);
      }
      const sections: TooltipSection[] = [
        {
          title: 'Gas Limits',
          items: [...GAS_BANDS].reverse().map(band => ({
            color: band.color,
            label: band.label,
            value: `${(byName.get(band.label) ?? 0).toFixed(1)}%`,
            style: 'area' as const,
          })),
        },
      ];
      if (byName.has('Relay Registered Validators')) {
        sections.push({
          title: 'Total',
          items: [
            {
              color: DATA_COLORS.purple,
              label: 'Relay Registered Validators',
              value: formatCompact(byName.get('Relay Registered Validators') ?? 0),
            },
          ],
        });
      }
      return buildTooltipHtml(formatBucket(t, isDaily), sections);
    },
    [rows.signalling, isDaily]
  );

  // ==========================================================================
  // Render
  // ==========================================================================

  const period = isDaily ? 'UTC day' : 'hour';
  const movingAvgWindow = isDaily ? '7 days' : '6 hours';
  const signallingSubtitle = [
    isDaily
      ? 'MEV-relay-registered validators only, each at the highest gas limit it registered in the 7 days ending that day, rounded up to 1M.'
      : 'MEV-relay-registered validators only, each at the highest gas limit it registered that UTC day or the 7 days before, rounded up to 1M.',
    signallingEnd && `Data ends ${signallingEnd}.`,
  ]
    .filter(Boolean)
    .join(' ');

  /** Props every chart on the page shares, so they read as one stack on one time axis */
  const shared = (inModal: boolean): Omit<MultiLineChartProps, 'series' | 'xAxis'> => ({
    height: inModal ? 600 : 240,
    showLegend: true,
    legendPosition: 'top',
    enableDataZoom: true,
    showDataZoomSlider: inModal,
    endLabels: false,
    grid: inModal ? undefined : CHART_GRID,
    markLines: showAnnotations ? forkMarkLines : [],
    syncGroup: inModal ? undefined : 'execution-overview',
  });

  const hasRows = (r: { byTime: Map<number, unknown> }): boolean => r.byTime.size > 0;

  return (
    <Container>
      <Header title="Execution Overview" />

      {/* Time Period Selector */}
      <div className="mb-6 flex flex-wrap items-center gap-6">
        <SegmentedControl
          options={TIME_PERIOD_OPTIONS}
          value={timePeriod}
          onChange={value => navigate({ search: prev => ({ ...prev, t: value }), replace: true, resetScroll: false })}
          ariaLabel="Time window"
        />

        {/* Annotations Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">Forks</span>
          <Toggle checked={showAnnotations} onChange={setShowAnnotations} size="small" />
        </div>
      </div>

      {!data && !query.error && <ExecutionOverviewSkeleton />}

      {query.error && (
        <Card rounded className="p-6">
          <p className="text-danger">Failed to load data: {query.error.message}</p>
        </Card>
      )}

      {data && xAxis && (
        <div
          className={clsx('flex flex-col gap-4 transition-opacity', query.isPlaceholderData && 'opacity-60')}
          aria-busy={query.isPlaceholderData}
        >
          {hasRows(rows.tps) && (
            <PopoutCard
              title="Transactions Per Second"
              subtitle={`Canonical blocks per ${period}. Average is transactions ÷ seconds; median and bands are over per-block TPS; moving average over ${movingAvgWindow}.`}
              anchorId="tps-chart"
              modalSize="full"
            >
              {({ inModal }) => (
                <MultiLineChart
                  {...shared(inModal)}
                  height={inModal ? 600 : 320}
                  series={tpsSeries}
                  xAxis={xAxis}
                  yAxis={{ name: 'TPS', min: 0 }}
                  tooltipFormatter={tpsTooltip}
                />
              )}
            </PopoutCard>
          )}

          {hasRows(rows.opcodeOps) && (
            <PopoutCard
              title="Opcodes Per Second"
              subtitle={`EVM opcodes executed in canonical blocks per ${period}. Average is opcodes ÷ seconds; median and bands are over per-block rates; moving average over ${movingAvgWindow}.`}
              anchorId="ops-chart"
              modalSize="full"
            >
              {({ inModal }) => (
                <MultiLineChart
                  {...shared(inModal)}
                  series={opsSeries}
                  xAxis={xAxis}
                  yAxis={{ name: 'Ops/s', min: 0, formatter: formatCompact }}
                  tooltipFormatter={opsTooltip}
                />
              )}
            </PopoutCard>
          )}

          {hasRows(rows.gasUsed) && (
            <PopoutCard
              title="Gas Used Per Block"
              subtitle={`Canonical blocks per ${period}. Average, median and bands are over blocks; moving average over ${movingAvgWindow}.`}
              anchorId="gas-chart"
              modalSize="full"
            >
              {({ inModal }) => (
                <MultiLineChart
                  {...shared(inModal)}
                  series={gasSeries}
                  xAxis={xAxis}
                  yAxis={{ name: 'Gas', min: 0 }}
                  secondaryYAxis={{ name: 'Cumulative', min: 0, formatter: formatCumulativeAxis }}
                  tooltipFormatter={gasTooltip}
                />
              )}
            </PopoutCard>
          )}

          {hasRows(rows.transactions) && (
            <PopoutCard
              title="Transactions Per Block"
              subtitle={`Canonical blocks per ${period}. Average, median and bands are over blocks; moving average over ${movingAvgWindow}.`}
              anchorId="transactions-chart"
              modalSize="full"
            >
              {({ inModal }) => (
                <MultiLineChart
                  {...shared(inModal)}
                  series={transactionsSeries}
                  xAxis={xAxis}
                  yAxis={{ name: 'Txn/Block', min: 0 }}
                  secondaryYAxis={{ name: 'Cumulative', min: 0, formatter: formatCumulativeAxis }}
                  tooltipFormatter={transactionsTooltip}
                />
              )}
            </PopoutCard>
          )}

          {hasRows(rows.receiptSize) && (
            <PopoutCard
              title="Receipt Size Per Block"
              subtitle={`Receipt bytes per canonical block, per ${period}. Average, median and bands are over blocks; moving average over ${movingAvgWindow}.`}
              anchorId="receipt-size-chart"
              modalSize="full"
            >
              {({ inModal }) => (
                <MultiLineChart
                  {...shared(inModal)}
                  series={receiptSeries}
                  xAxis={xAxis}
                  yAxis={{ name: 'Bytes', min: 0, formatter: v => formatBytesDecimal(v) }}
                  tooltipFormatter={receiptTooltip}
                />
              )}
            </PopoutCard>
          )}

          {!hasRows(rows.signalling) && signallingEnd && (
            <Card rounded title="Gas Limit Signalling">
              <p className="text-sm text-muted">Data ends {signallingEnd}.</p>
            </Card>
          )}
          {hasRows(rows.signalling) && (
            <PopoutCard
              title="Gas Limit Signalling"
              subtitle={signallingSubtitle}
              anchorId="gas-signalling-chart"
              modalSize="full"
            >
              {({ inModal }) => (
                <MultiLineChart
                  {...shared(inModal)}
                  series={signallingSeries}
                  xAxis={xAxis}
                  yAxis={{ name: 'Share (%)', min: 0, max: 100 }}
                  secondaryYAxis={{ name: 'Validators', min: 0, formatter: formatCompact }}
                  tooltipFormatter={signallingTooltip}
                />
              )}
            </PopoutCard>
          )}
        </div>
      )}
    </Container>
  );
}
