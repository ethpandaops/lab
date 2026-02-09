import { type JSX, useMemo, useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Container } from '@/components/Layout/Container';
import { Card } from '@/components/Layout/Card';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import {
  MultiLineChart,
  createBlobScheduleMarkLines,
  createExecutionForkMarkLines,
  createForkMarkLines,
} from '@/components/Charts/MultiLine';
import { useNetwork } from '@/hooks/useNetwork';
import { useForks } from '@/hooks/useForks';
import { Toggle } from '@/components/Forms/Toggle';
import clsx from 'clsx';
import {
  fctBlobCountByHourlyServiceListOptions,
  fctBlobCountByDailyServiceListOptions,
} from '@/api/@tanstack/react-query.gen';
import type { FctBlobCountByHourly, FctBlobCountByDaily } from '@/api/types.gen';
import { ConsensusOverviewSkeleton } from './components';
import { type TimePeriod, TIME_RANGE_CONFIG, TIME_PERIOD_OPTIONS } from './constants';
import {
  fillTimeKeys,
  formatTooltipDate,
  buildTooltipHtml,
  formatBand,
  buildBlobCountChartConfig,
  type TooltipSection,
} from './utils';

/**
 * IndexPage - Consensus Overview page
 */
export function IndexPage(): JSX.Element {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('7d');
  const [showAnnotations, setShowAnnotations] = useState(true);
  const config = TIME_RANGE_CONFIG[timePeriod];
  const isDaily = config.dataType === 'daily';

  const { currentNetwork } = useNetwork();
  const { allForks } = useForks();

  const startTimestamp = useMemo(() => {
    if (config.days === null) return undefined;
    const now = Math.floor(Date.now() / 1000);
    return now - config.days * 24 * 60 * 60;
  }, [config.days]);

  // --- Queries ---

  const blobHourlyQuery = useQuery({
    ...fctBlobCountByHourlyServiceListOptions({
      query: {
        hour_start_date_time_gte: startTimestamp,
        order_by: 'hour_start_date_time asc',
        page_size: config.pageSize,
      },
    }),
    enabled: !isDaily,
  });
  const blobDailyQuery = useQuery({
    ...fctBlobCountByDailyServiceListOptions({
      query: { day_start_date_like: '20%', order_by: 'day_start_date desc', page_size: config.pageSize },
    }),
    enabled: isDaily,
  });

  // --- Records ---

  const blobRecords = useMemo(
    () =>
      isDaily
        ? [...(blobDailyQuery.data?.fct_blob_count_by_daily ?? [])].reverse()
        : blobHourlyQuery.data?.fct_blob_count_by_hourly,
    [isDaily, blobDailyQuery.data, blobHourlyQuery.data]
  );

  // --- Unified time keys ---

  const unifiedTimeKeys = useMemo(() => {
    const allKeys = new Set<string>();

    const addHourlyKeys = (records: { hour_start_date_time?: number }[] | undefined) => {
      records?.forEach(r => allKeys.add(String(r.hour_start_date_time ?? '')));
    };
    const addDailyKeys = (records: { day_start_date?: string }[] | undefined) => {
      records?.forEach(r => allKeys.add(r.day_start_date ?? ''));
    };

    if (!isDaily) {
      addHourlyKeys(blobRecords as FctBlobCountByHourly[] | undefined);
    } else {
      addDailyKeys(blobRecords as FctBlobCountByDaily[] | undefined);
    }

    allKeys.delete('');
    const sortedKeys = [...allKeys].sort();
    return fillTimeKeys(sortedKeys, isDaily);
  }, [blobRecords, isDaily]);

  // --- Loading & error ---

  const isLoading = isDaily ? blobDailyQuery.isLoading : blobHourlyQuery.isLoading;
  const error = isDaily ? blobDailyQuery.error : blobHourlyQuery.error;

  // --- Chart configs ---

  const blobChartConfig = useMemo(() => {
    if (!blobRecords?.length || !unifiedTimeKeys.length) return null;
    return buildBlobCountChartConfig(blobRecords, unifiedTimeKeys, isDaily);
  }, [blobRecords, unifiedTimeKeys, isDaily]);

  // --- Fork mark lines ---

  const chartLabels = blobChartConfig?.labels ?? [];

  const consensusForkMarkLines = useMemo(() => {
    if (!currentNetwork || !allForks.length) return [];
    return createForkMarkLines({
      forks: allForks,
      labels: chartLabels,
      genesisTime: currentNetwork.genesis_time,
      isDaily,
    });
  }, [currentNetwork, allForks, chartLabels, isDaily]);

  const executionForkMarkLines = useMemo(() => {
    if (!currentNetwork?.forks?.execution) return [];
    return createExecutionForkMarkLines({ executionForks: currentNetwork.forks.execution, labels: chartLabels });
  }, [currentNetwork, chartLabels]);

  const blobScheduleMarkLines = useMemo(() => {
    if (!currentNetwork?.blob_schedule?.length) return [];
    return createBlobScheduleMarkLines({
      blobSchedule: currentNetwork.blob_schedule,
      labels: chartLabels,
      genesisTime: currentNetwork.genesis_time,
    });
  }, [currentNetwork, chartLabels]);

  const forkMarkLines = useMemo(
    () => [...consensusForkMarkLines, ...executionForkMarkLines, ...blobScheduleMarkLines],
    [consensusForkMarkLines, executionForkMarkLines, blobScheduleMarkLines]
  );

  // --- Tooltip formatters ---

  const makeStatsTooltipFormatter = useCallback(
    (
      records: Record<string, unknown>[] | undefined,
      fields: {
        avg: string;
        movingAvg: string;
        median: string;
        lowerBand: string;
        upperBand: string;
        p05: string;
        p95: string;
        min: string;
        max: string;
      },
      unit: string
    ) =>
      (params: unknown): string => {
        if (!records?.length || !unifiedTimeKeys.length) return '';

        const recordsByKey = new Map<string, Record<string, unknown>>();
        for (const r of records) {
          const key = isDaily ? String(r.day_start_date ?? '') : String(r.hour_start_date_time ?? '');
          recordsByKey.set(key, r);
        }

        const dataPoints = Array.isArray(params) ? params : [params];
        if (!dataPoints.length) return '';
        const firstPoint = dataPoints[0] as { dataIndex?: number };
        if (firstPoint.dataIndex === undefined) return '';
        const timeKey = unifiedTimeKeys[firstPoint.dataIndex];
        if (!timeKey) return '';
        const record = recordsByKey.get(timeKey);
        if (!record) return '';

        const dateValue = isDaily ? (record.day_start_date ?? '') : (record.hour_start_date_time ?? 0);
        const dateStr = formatTooltipDate(dateValue as string | number, isDaily);
        const fmt = (v: unknown) => `${Number(v ?? 0).toFixed(2)}${unit}`;

        const sections: TooltipSection[] = [
          {
            title: 'STATISTICS',
            items: [
              { color: '#10b981', label: 'Average', value: fmt(record[fields.avg]) },
              { color: '#06b6d4', label: 'Moving Avg', value: fmt(record[fields.movingAvg]) },
              { color: '#a855f7', label: 'Median', value: fmt(record[fields.median]), style: 'dotted' },
            ],
          },
          {
            title: 'BANDS',
            items: [
              {
                color: '#f59e0b',
                label: 'Bollinger',
                value: `${formatBand(record[fields.lowerBand] as number, record[fields.upperBand] as number)}${unit}`,
                style: 'area',
              },
              {
                color: '#6366f1',
                label: 'P5/P95',
                value: `${formatBand(record[fields.p05] as number, record[fields.p95] as number)}${unit}`,
                style: 'area',
              },
              {
                color: '#64748b',
                label: 'Min/Max',
                value: `${formatBand(record[fields.min] as number, record[fields.max] as number)}${unit}`,
                style: 'area',
              },
            ],
          },
        ];

        return buildTooltipHtml(dateStr, sections);
      },
    [unifiedTimeKeys, isDaily]
  );

  const blobTooltipFormatter = useMemo(
    () =>
      makeStatsTooltipFormatter(
        blobRecords as Record<string, unknown>[] | undefined,
        {
          avg: 'avg_blob_count',
          movingAvg: 'moving_avg_blob_count',
          median: 'p50_blob_count',
          lowerBand: 'lower_band_blob_count',
          upperBand: 'upper_band_blob_count',
          p05: 'p05_blob_count',
          p95: 'p95_blob_count',
          min: 'min_blob_count',
          max: 'max_blob_count',
        },
        ''
      ),
    [makeStatsTooltipFormatter, blobRecords]
  );

  // --- Subtitles ---

  const makeSub = (metric: string) =>
    isDaily ? `Daily ${metric} with statistical bands` : `Hourly ${metric} over ${config.days} days`;

  return (
    <Container>
      <div className="mb-8">
        <h1 className="text-4xl/tight font-bold text-foreground">Consensus Overview</h1>
        <p className="mt-1 text-muted">Ethereum consensus layer metrics</p>
      </div>

      {/* Time Period Selector */}
      <div className="mb-6 flex flex-wrap items-center gap-6">
        <div className="flex flex-wrap items-center gap-1.5">
          {TIME_PERIOD_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setTimePeriod(value)}
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
          <span className="text-sm text-muted">Show Forks</span>
          <Toggle checked={showAnnotations} onChange={setShowAnnotations} size="small" />
        </div>
      </div>

      {isLoading && <ConsensusOverviewSkeleton />}

      {error && (
        <Card rounded className="p-6">
          <p className="text-danger">Failed to load data: {error.message}</p>
        </Card>
      )}

      {/* Charts */}
      {!isLoading && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {/* Blob Count */}
          {blobChartConfig && (
            <PopoutCard
              title="Blob Count"
              subtitle={makeSub('blob count per slot')}
              anchorId="blob-count-chart"
              modalSize="full"
            >
              {({ inModal }) => (
                <MultiLineChart
                  series={blobChartConfig.series}
                  xAxis={{ type: 'category', labels: blobChartConfig.labels, name: 'Date' }}
                  yAxis={{ name: 'Blobs', min: 0 }}
                  height={inModal ? 600 : 400}
                  showLegend
                  legendPosition="top"
                  enableDataZoom
                  tooltipFormatter={blobTooltipFormatter}
                  markLines={showAnnotations ? forkMarkLines : []}
                  syncGroup={inModal ? undefined : 'consensus-overview'}
                />
              )}
            </PopoutCard>
          )}
        </div>
      )}
    </Container>
  );
}
