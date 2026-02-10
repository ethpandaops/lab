import { type JSX, useMemo, useCallback, useState } from 'react';
import { useSearch, useNavigate } from '@tanstack/react-router';
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
  fctExecutionTpsHourlyServiceListOptions,
  fctExecutionTpsDailyServiceListOptions,
  fctExecutionGasUsedHourlyServiceListOptions,
  fctExecutionGasUsedDailyServiceListOptions,
  fctExecutionGasLimitHourlyServiceListOptions,
  fctExecutionGasLimitDailyServiceListOptions,
  fctExecutionGasLimitSignallingHourlyServiceListOptions,
  fctExecutionGasLimitSignallingDailyServiceListOptions,
  fctExecutionTransactionsHourlyServiceListOptions,
  fctExecutionTransactionsDailyServiceListOptions,
} from '@/api/@tanstack/react-query.gen';
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
} from '@/api/types.gen';
import { ExecutionOverviewSkeleton } from './components';
import { type TimePeriod, TIME_RANGE_CONFIG, TIME_PERIOD_OPTIONS, GAS_BANDS } from './constants';
import {
  fillTimeKeys,
  formatTooltipDate,
  buildTooltipHtml,
  formatTpsBand,
  formatGas,
  formatGasBand,
  formatCumulativeGas,
  formatCompact,
  formatBigNum,
  buildTpsChartConfig,
  buildGasChartConfig,
  buildSignallingChartConfig,
  buildTransactionsChartConfig,
  type TooltipItem,
  type TooltipSection,
} from './utils';

/**
 * IndexPage - Execution Overview page showing TPS, Gas Used, and Gas Limit charts
 */
export function IndexPage(): JSX.Element {
  const navigate = useNavigate({ from: '/ethereum/execution/overview' });
  const { t } = useSearch({ from: '/ethereum/execution/overview' });
  const timePeriod: TimePeriod = t ?? '7d';
  const [showAnnotations, setShowAnnotations] = useState(true);
  const config = TIME_RANGE_CONFIG[timePeriod];
  const isDaily = config.dataType === 'daily';

  const { currentNetwork } = useNetwork();
  const { allForks } = useForks();

  // Calculate timestamp for start of selected time range (for hourly queries)
  const startTimestamp = useMemo(() => {
    if (config.days === null) return undefined;
    const now = Math.floor(Date.now() / 1000);
    return now - config.days * 24 * 60 * 60;
  }, [config.days]);

  // TPS Queries
  const tpsHourlyQuery = useQuery({
    ...fctExecutionTpsHourlyServiceListOptions({
      query: {
        hour_start_date_time_gte: startTimestamp,
        order_by: 'hour_start_date_time asc',
        page_size: config.pageSize,
      },
    }),
    enabled: !isDaily,
  });

  const tpsDailyQuery = useQuery({
    ...fctExecutionTpsDailyServiceListOptions({
      query: {
        day_start_date_like: '20%',
        order_by: 'day_start_date desc',
        page_size: config.pageSize,
      },
    }),
    enabled: isDaily,
  });

  // Gas Used Queries
  const gasHourlyQuery = useQuery({
    ...fctExecutionGasUsedHourlyServiceListOptions({
      query: {
        hour_start_date_time_gte: startTimestamp,
        order_by: 'hour_start_date_time asc',
        page_size: config.pageSize,
      },
    }),
    enabled: !isDaily,
  });

  const gasDailyQuery = useQuery({
    ...fctExecutionGasUsedDailyServiceListOptions({
      query: {
        day_start_date_like: '20%',
        order_by: 'day_start_date desc',
        page_size: config.pageSize,
      },
    }),
    enabled: isDaily,
  });

  // Gas Limit Queries
  const gasLimitHourlyQuery = useQuery({
    ...fctExecutionGasLimitHourlyServiceListOptions({
      query: {
        hour_start_date_time_gte: startTimestamp,
        order_by: 'hour_start_date_time asc',
        page_size: config.pageSize,
      },
    }),
    enabled: !isDaily,
  });

  const gasLimitDailyQuery = useQuery({
    ...fctExecutionGasLimitDailyServiceListOptions({
      query: {
        day_start_date_like: '20%',
        order_by: 'day_start_date desc',
        page_size: config.pageSize,
      },
    }),
    enabled: isDaily,
  });

  // Gas Limit Signalling Queries
  const signallingHourlyQuery = useQuery({
    ...fctExecutionGasLimitSignallingHourlyServiceListOptions({
      query: {
        hour_start_date_time_gte: startTimestamp,
        order_by: 'hour_start_date_time asc',
        page_size: config.pageSize,
      },
    }),
    enabled: !isDaily,
  });

  const signallingDailyQuery = useQuery({
    ...fctExecutionGasLimitSignallingDailyServiceListOptions({
      query: {
        day_start_date_like: '20%',
        order_by: 'day_start_date desc',
        page_size: config.pageSize,
      },
    }),
    enabled: isDaily,
  });

  // Transactions Queries
  const transactionsHourlyQuery = useQuery({
    ...fctExecutionTransactionsHourlyServiceListOptions({
      query: {
        hour_start_date_time_gte: startTimestamp,
        order_by: 'hour_start_date_time asc',
        page_size: config.pageSize,
      },
    }),
    enabled: !isDaily,
  });

  const transactionsDailyQuery = useQuery({
    ...fctExecutionTransactionsDailyServiceListOptions({
      query: {
        day_start_date_like: '20%',
        order_by: 'day_start_date desc',
        page_size: config.pageSize,
      },
    }),
    enabled: isDaily,
  });

  // Memoize record arrays to prevent unnecessary recomputes
  const tpsRecords = useMemo(
    () =>
      isDaily
        ? [...(tpsDailyQuery.data?.fct_execution_tps_daily ?? [])].reverse()
        : tpsHourlyQuery.data?.fct_execution_tps_hourly,
    [isDaily, tpsDailyQuery.data, tpsHourlyQuery.data]
  );

  const gasRecords = useMemo(
    () =>
      isDaily
        ? [...(gasDailyQuery.data?.fct_execution_gas_used_daily ?? [])].reverse()
        : gasHourlyQuery.data?.fct_execution_gas_used_hourly,
    [isDaily, gasDailyQuery.data, gasHourlyQuery.data]
  );

  const gasLimitRecords = useMemo(
    () =>
      isDaily
        ? [...(gasLimitDailyQuery.data?.fct_execution_gas_limit_daily ?? [])].reverse()
        : gasLimitHourlyQuery.data?.fct_execution_gas_limit_hourly,
    [isDaily, gasLimitDailyQuery.data, gasLimitHourlyQuery.data]
  );

  const transactionsRecords = useMemo(
    () =>
      isDaily
        ? [...(transactionsDailyQuery.data?.fct_execution_transactions_daily ?? [])].reverse()
        : transactionsHourlyQuery.data?.fct_execution_transactions_hourly,
    [isDaily, transactionsDailyQuery.data, transactionsHourlyQuery.data]
  );

  const signallingRecords = useMemo(
    () =>
      isDaily
        ? [...(signallingDailyQuery.data?.fct_execution_gas_limit_signalling_daily ?? [])].reverse()
        : signallingHourlyQuery.data?.fct_execution_gas_limit_signalling_hourly,
    [isDaily, signallingDailyQuery.data, signallingHourlyQuery.data]
  );

  // Compute unified time keys for synchronized chart labels
  const unifiedTimeKeys = useMemo(() => {
    const allKeys = new Set<string>();

    if (!isDaily) {
      (tpsRecords as FctExecutionTpsHourly[] | undefined)?.forEach(r =>
        allKeys.add(String(r.hour_start_date_time ?? ''))
      );
      (gasRecords as FctExecutionGasUsedHourly[] | undefined)?.forEach(r =>
        allKeys.add(String(r.hour_start_date_time ?? ''))
      );
      (signallingRecords as FctExecutionGasLimitSignallingHourly[] | undefined)?.forEach(r =>
        allKeys.add(String(r.hour_start_date_time ?? ''))
      );
      (transactionsRecords as FctExecutionTransactionsHourly[] | undefined)?.forEach(r =>
        allKeys.add(String(r.hour_start_date_time ?? ''))
      );
    } else {
      (tpsRecords as FctExecutionTpsDaily[] | undefined)?.forEach(r => allKeys.add(r.day_start_date ?? ''));
      (gasRecords as FctExecutionGasUsedDaily[] | undefined)?.forEach(r => allKeys.add(r.day_start_date ?? ''));
      (signallingRecords as FctExecutionGasLimitSignallingDaily[] | undefined)?.forEach(r =>
        allKeys.add(r.day_start_date ?? '')
      );
      (transactionsRecords as FctExecutionTransactionsDaily[] | undefined)?.forEach(r =>
        allKeys.add(r.day_start_date ?? '')
      );
    }

    allKeys.delete('');
    const sortedKeys = [...allKeys].sort();
    return fillTimeKeys(sortedKeys, isDaily);
  }, [tpsRecords, gasRecords, signallingRecords, transactionsRecords, isDaily]);

  const isLoading = isDaily
    ? tpsDailyQuery.isLoading ||
      gasDailyQuery.isLoading ||
      gasLimitDailyQuery.isLoading ||
      signallingDailyQuery.isLoading ||
      transactionsDailyQuery.isLoading
    : tpsHourlyQuery.isLoading ||
      gasHourlyQuery.isLoading ||
      gasLimitHourlyQuery.isLoading ||
      signallingHourlyQuery.isLoading ||
      transactionsHourlyQuery.isLoading;

  const error = isDaily
    ? tpsDailyQuery.error || gasDailyQuery.error || gasLimitDailyQuery.error
    : tpsHourlyQuery.error || gasHourlyQuery.error || gasLimitHourlyQuery.error;

  // Build chart configs using unified time keys
  const tpsChartConfig = useMemo(() => {
    if (!tpsRecords?.length || !unifiedTimeKeys.length) return null;
    return buildTpsChartConfig(tpsRecords, unifiedTimeKeys, isDaily);
  }, [tpsRecords, unifiedTimeKeys, isDaily]);

  const gasChartConfig = useMemo(() => {
    if (!gasRecords?.length || !unifiedTimeKeys.length) return null;
    return buildGasChartConfig(gasRecords, unifiedTimeKeys, isDaily, gasLimitRecords);
  }, [gasRecords, unifiedTimeKeys, isDaily, gasLimitRecords]);

  const signallingChartConfig = useMemo(() => {
    if (!signallingRecords?.length || !unifiedTimeKeys.length) return null;
    return buildSignallingChartConfig(signallingRecords, unifiedTimeKeys, isDaily);
  }, [signallingRecords, unifiedTimeKeys, isDaily]);

  const transactionsChartConfig = useMemo(() => {
    if (!transactionsRecords?.length || !unifiedTimeKeys.length) return null;
    return buildTransactionsChartConfig(transactionsRecords, unifiedTimeKeys, isDaily);
  }, [transactionsRecords, unifiedTimeKeys, isDaily]);

  // Fork annotation mark lines
  const consensusForkMarkLines = useMemo(() => {
    if (!currentNetwork || !allForks.length) return [];
    const labels = tpsChartConfig?.labels ?? gasChartConfig?.labels ?? [];
    return createForkMarkLines({
      forks: allForks,
      labels,
      genesisTime: currentNetwork.genesis_time,
      isDaily,
    });
  }, [currentNetwork, allForks, tpsChartConfig?.labels, gasChartConfig?.labels, isDaily]);

  const executionForkMarkLines = useMemo(() => {
    if (!currentNetwork?.forks?.execution) return [];
    const labels = tpsChartConfig?.labels ?? gasChartConfig?.labels ?? [];
    return createExecutionForkMarkLines({
      executionForks: currentNetwork.forks.execution,
      labels,
    });
  }, [currentNetwork, tpsChartConfig?.labels, gasChartConfig?.labels]);

  const blobScheduleMarkLines = useMemo(() => {
    if (!currentNetwork?.blob_schedule?.length) return [];
    const labels = tpsChartConfig?.labels ?? gasChartConfig?.labels ?? [];
    return createBlobScheduleMarkLines({
      blobSchedule: currentNetwork.blob_schedule,
      labels,
      genesisTime: currentNetwork.genesis_time,
    });
  }, [currentNetwork, tpsChartConfig?.labels, gasChartConfig?.labels]);

  const forkMarkLines = useMemo(
    () => [...consensusForkMarkLines, ...executionForkMarkLines, ...blobScheduleMarkLines],
    [consensusForkMarkLines, executionForkMarkLines, blobScheduleMarkLines]
  );

  const signallingForkMarkLines = useMemo(() => {
    if (!currentNetwork || !allForks.length || !signallingChartConfig?.labels.length) return [];

    const consensusLines = createForkMarkLines({
      forks: allForks,
      labels: signallingChartConfig.labels,
      genesisTime: currentNetwork.genesis_time,
      isDaily,
    });

    const executionLines = currentNetwork.forks?.execution
      ? createExecutionForkMarkLines({
          executionForks: currentNetwork.forks.execution,
          labels: signallingChartConfig.labels,
        })
      : [];

    const blobLines = currentNetwork.blob_schedule?.length
      ? createBlobScheduleMarkLines({
          blobSchedule: currentNetwork.blob_schedule,
          labels: signallingChartConfig.labels,
          genesisTime: currentNetwork.genesis_time,
        })
      : [];

    return [...consensusLines, ...executionLines, ...blobLines];
  }, [currentNetwork, allForks, signallingChartConfig?.labels, isDaily]);

  // TPS tooltip formatter
  const tpsTooltipFormatter = useCallback(
    (params: unknown): string => {
      if (!tpsRecords?.length || !unifiedTimeKeys.length) return '';

      const recordsByKey = new Map<string, FctExecutionTpsHourly | FctExecutionTpsDaily>();
      for (const r of tpsRecords) {
        const key = isDaily
          ? ((r as FctExecutionTpsDaily).day_start_date ?? '')
          : String((r as FctExecutionTpsHourly).hour_start_date_time ?? '');
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

      const dateValue = isDaily
        ? ((record as FctExecutionTpsDaily).day_start_date ?? '')
        : ((record as FctExecutionTpsHourly).hour_start_date_time ?? 0);
      const dateStr = formatTooltipDate(dateValue, isDaily);

      const sections: TooltipSection[] = [
        {
          title: 'STATISTICS',
          items: [
            { color: '#10b981', label: 'Average', value: (record.avg_tps ?? 0).toFixed(4) },
            { color: '#06b6d4', label: 'Moving Avg', value: (record.moving_avg_tps ?? 0).toFixed(4) },
            { color: '#a855f7', label: 'Median', value: (record.p50_tps ?? 0).toFixed(4), style: 'dotted' },
          ],
        },
        {
          title: 'BANDS',
          items: [
            {
              color: '#f59e0b',
              label: 'Bollinger',
              value: formatTpsBand(record.lower_band_tps, record.upper_band_tps),
              style: 'area',
            },
            { color: '#6366f1', label: 'P5/P95', value: formatTpsBand(record.p05_tps, record.p95_tps), style: 'area' },
            { color: '#64748b', label: 'Min/Max', value: formatTpsBand(record.min_tps, record.max_tps), style: 'area' },
          ],
        },
      ];

      return buildTooltipHtml(dateStr, sections);
    },
    [tpsRecords, unifiedTimeKeys, isDaily]
  );

  // Gas tooltip formatter
  const gasTooltipFormatter = useCallback(
    (params: unknown): string => {
      if (!gasRecords?.length || !unifiedTimeKeys.length) return '';

      const recordsByKey = new Map<string, FctExecutionGasUsedHourly | FctExecutionGasUsedDaily>();
      for (const r of gasRecords) {
        const key = isDaily
          ? ((r as FctExecutionGasUsedDaily).day_start_date ?? '')
          : String((r as FctExecutionGasUsedHourly).hour_start_date_time ?? '');
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

      const dateValue = isDaily
        ? ((record as FctExecutionGasUsedDaily).day_start_date ?? '')
        : ((record as FctExecutionGasUsedHourly).hour_start_date_time ?? 0);
      const dateStr = formatTooltipDate(dateValue, isDaily);

      const statsItems: TooltipItem[] = [
        { color: '#10b981', label: 'Average', value: formatGas(record.avg_gas_used ?? 0) },
        { color: '#06b6d4', label: 'Moving Avg', value: formatGas(record.moving_avg_gas_used ?? 0) },
        { color: '#a855f7', label: 'Median', value: formatGas(record.p50_gas_used ?? 0), style: 'dotted' },
        {
          color: 'rgba(156, 163, 175, 0.6)',
          label: 'Cumulative',
          value: formatCumulativeGas(record.cumulative_gas_used ?? 0),
        },
      ];

      // Add gas limit if available
      if (gasLimitRecords?.length) {
        const dateKey = isDaily
          ? ((record as FctExecutionGasUsedDaily).day_start_date ?? '')
          : String((record as FctExecutionGasUsedHourly).hour_start_date_time ?? 0);
        const gasLimitRecord = gasLimitRecords.find(r => {
          const rDateKey = isDaily
            ? ((r as FctExecutionGasLimitDaily).day_start_date ?? '')
            : String((r as FctExecutionGasLimitHourly).hour_start_date_time ?? 0);
          return rDateKey === dateKey;
        });
        if (gasLimitRecord) {
          statsItems.push({
            color: '#ef4444',
            label: 'Gas Limit',
            value: formatGas(gasLimitRecord.max_gas_limit ?? 0),
            style: 'dashed',
          });
        }
      }

      const sections: TooltipSection[] = [
        { title: 'STATISTICS', items: statsItems },
        {
          title: 'BANDS',
          items: [
            {
              color: '#f59e0b',
              label: 'Bollinger',
              value: formatGasBand(record.lower_band_gas_used, record.upper_band_gas_used),
              style: 'area',
            },
            {
              color: '#6366f1',
              label: 'P5/P95',
              value: formatGasBand(record.p05_gas_used, record.p95_gas_used),
              style: 'area',
            },
            {
              color: '#64748b',
              label: 'Min/Max',
              value: formatGasBand(record.min_gas_used, record.max_gas_used),
              style: 'area',
            },
          ],
        },
      ];

      return buildTooltipHtml(dateStr, sections);
    },
    [gasRecords, gasLimitRecords, unifiedTimeKeys, isDaily]
  );

  // Signalling tooltip formatter
  const signallingTooltipFormatter = useCallback(
    (params: unknown): string => {
      if (!signallingRecords?.length || !unifiedTimeKeys.length) return '';

      const recordsByKey = new Map<
        string,
        FctExecutionGasLimitSignallingHourly | FctExecutionGasLimitSignallingDaily
      >();
      for (const r of signallingRecords) {
        const key = isDaily
          ? ((r as FctExecutionGasLimitSignallingDaily).day_start_date ?? '')
          : String((r as FctExecutionGasLimitSignallingHourly).hour_start_date_time ?? '');
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

      const dateValue = isDaily
        ? ((record as FctExecutionGasLimitSignallingDaily).day_start_date ?? '')
        : ((record as FctExecutionGasLimitSignallingHourly).hour_start_date_time ?? 0);
      const dateStr = formatTooltipDate(dateValue, isDaily);

      type TooltipParam = { value?: number; marker?: string; seriesName?: string };
      const byName = new Map<string, TooltipParam>();
      for (const p of dataPoints as TooltipParam[]) {
        if (p.seriesName) byName.set(p.seriesName, p);
      }

      const gasLimitItems = [...GAS_BANDS].reverse().map(band => {
        const p = byName.get(band.label);
        const value = p?.value ?? 0;
        return { color: band.color, label: band.label, value: `${value.toFixed(1)}%`, style: 'area' as const };
      });

      const sections: TooltipSection[] = [{ title: 'Gas Limits', items: gasLimitItems }];

      const mevData = byName.get('Relay Registered Validators');
      if (mevData) {
        sections.push({
          title: 'Total',
          items: [{ color: '#a855f7', label: 'Relay Registered Validators', value: formatCompact(mevData.value ?? 0) }],
        });
      }

      return buildTooltipHtml(dateStr, sections);
    },
    [signallingRecords, unifiedTimeKeys, isDaily]
  );

  // Transactions tooltip formatter
  const transactionsTooltipFormatter = useCallback(
    (params: unknown): string => {
      if (!transactionsRecords?.length || !unifiedTimeKeys.length) return '';

      const recordsByKey = new Map<string, FctExecutionTransactionsHourly | FctExecutionTransactionsDaily>();
      for (const r of transactionsRecords) {
        const key = isDaily
          ? ((r as FctExecutionTransactionsDaily).day_start_date ?? '')
          : String((r as FctExecutionTransactionsHourly).hour_start_date_time ?? '');
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

      const dateValue = isDaily
        ? ((record as FctExecutionTransactionsDaily).day_start_date ?? '')
        : ((record as FctExecutionTransactionsHourly).hour_start_date_time ?? 0);
      const dateStr = formatTooltipDate(dateValue, isDaily);

      const formatNum = (n: number | undefined): string => (n ?? 0).toLocaleString();
      const formatBand = (lower: number | undefined, upper: number | undefined): string =>
        `${formatNum(lower)} – ${formatNum(upper)}`;

      const sections: TooltipSection[] = [
        {
          title: 'STATISTICS',
          items: [
            { color: '#10b981', label: 'Average', value: formatNum(record.avg_txn_per_block) },
            { color: '#06b6d4', label: 'Moving Avg', value: formatNum(record.moving_avg_txn_per_block) },
            { color: '#a855f7', label: 'Median', value: formatNum(record.p50_txn_per_block), style: 'dotted' },
            {
              color: 'rgba(156, 163, 175, 0.6)',
              label: 'Cumulative',
              value: formatBigNum(record.cumulative_transactions),
            },
            {
              color: 'rgba(156, 163, 175, 0.6)',
              label: 'Period Total',
              value: formatBigNum(record.total_transactions),
            },
          ],
        },
        {
          title: 'BANDS',
          items: [
            {
              color: '#f59e0b',
              label: 'Bollinger',
              value: formatBand(record.lower_band_txn_per_block, record.upper_band_txn_per_block),
              style: 'area',
            },
            {
              color: '#6366f1',
              label: 'P5/P95',
              value: formatBand(record.p05_txn_per_block, record.p95_txn_per_block),
              style: 'area',
            },
            {
              color: '#64748b',
              label: 'Min/Max',
              value: formatBand(record.min_txn_per_block, record.max_txn_per_block),
              style: 'area',
            },
          ],
        },
      ];

      return buildTooltipHtml(dateStr, sections);
    },
    [transactionsRecords, unifiedTimeKeys, isDaily]
  );

  // Chart subtitles
  const subtitles = {
    tps: isDaily ? 'Daily TPS with statistical bands' : `Hourly TPS over ${config.days} days`,
    transactions: isDaily
      ? 'Daily transactions per block with cumulative'
      : `Hourly transactions over ${config.days} days`,
    gas: isDaily ? 'Daily gas usage with limit reference' : `Hourly gas metrics over ${config.days} days`,
    signalling: isDaily ? 'Validator gas limit preferences' : `Gas limit signalling over ${config.days} days`,
  };

  return (
    <Container>
      <div className="mb-8">
        <h1 className="text-4xl/tight font-bold text-foreground">Execution Overview</h1>
        <p className="mt-1 text-muted">Ethereum execution layer throughput and metrics</p>
      </div>

      {/* Time Period Selector */}
      <div className="mb-6 flex flex-wrap items-center gap-6">
        <div className="flex flex-wrap items-center gap-1.5">
          {TIME_PERIOD_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => navigate({ search: prev => ({ ...prev, t: value }), replace: true })}
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

        {/* Annotations Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">Show Forks</span>
          <Toggle checked={showAnnotations} onChange={setShowAnnotations} size="small" />
        </div>
      </div>

      {isLoading && <ExecutionOverviewSkeleton />}

      {error && (
        <Card rounded className="p-6">
          <p className="text-danger">Failed to load data: {error.message}</p>
        </Card>
      )}

      {/* Charts */}
      {!isLoading && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {/* TPS Chart */}
          {tpsChartConfig && (
            <PopoutCard title="Transactions Per Second" subtitle={subtitles.tps} anchorId="tps-chart" modalSize="full">
              {({ inModal }) => (
                <MultiLineChart
                  series={tpsChartConfig.series}
                  xAxis={{
                    type: 'category',
                    labels: tpsChartConfig.labels,
                    name: 'Date',
                  }}
                  yAxis={{
                    name: 'TPS',
                    min: 0,
                  }}
                  height={inModal ? 600 : 400}
                  showLegend
                  legendPosition="top"
                  enableDataZoom
                  tooltipFormatter={tpsTooltipFormatter}
                  markLines={showAnnotations ? forkMarkLines : []}
                  syncGroup={inModal ? undefined : 'execution-overview'}
                />
              )}
            </PopoutCard>
          )}

          {/* Transactions Chart */}
          {transactionsChartConfig && (
            <PopoutCard
              title="Transactions Per Block"
              subtitle={subtitles.transactions}
              anchorId="transactions-chart"
              modalSize="full"
            >
              {({ inModal }) => (
                <MultiLineChart
                  series={transactionsChartConfig.series}
                  xAxis={{
                    type: 'category',
                    labels: transactionsChartConfig.labels,
                    name: 'Date',
                  }}
                  yAxis={{
                    name: 'Txn/Block',
                    min: 0,
                  }}
                  secondaryYAxis={{
                    name: 'Cumulative',
                    min: 0,
                    formatter: (val: number) => {
                      if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)}B`;
                      if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(0)}M`;
                      return String(val);
                    },
                  }}
                  height={inModal ? 600 : 400}
                  showLegend
                  legendPosition="top"
                  enableDataZoom
                  tooltipFormatter={transactionsTooltipFormatter}
                  markLines={showAnnotations ? forkMarkLines : []}
                  syncGroup={inModal ? undefined : 'execution-overview'}
                />
              )}
            </PopoutCard>
          )}

          {/* Gas Used Chart */}
          {gasChartConfig && (
            <PopoutCard title="Gas Used Per Block" subtitle={subtitles.gas} anchorId="gas-chart" modalSize="full">
              {({ inModal }) => (
                <MultiLineChart
                  series={gasChartConfig.series}
                  xAxis={{
                    type: 'category',
                    labels: gasChartConfig.labels,
                    name: 'Date',
                  }}
                  yAxis={{
                    name: 'Gas',
                    min: 0,
                  }}
                  secondaryYAxis={{
                    name: 'Cumulative',
                    min: 0,
                    formatter: (val: number) => {
                      if (val >= 1e18) return `${(val / 1e18).toFixed(1)}E`;
                      if (val >= 1e15) return `${(val / 1e15).toFixed(1)}P`;
                      if (val >= 1e12) return `${(val / 1e12).toFixed(1)}T`;
                      if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)}B`;
                      if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(0)}M`;
                      return String(val);
                    },
                  }}
                  height={inModal ? 600 : 400}
                  showLegend
                  legendPosition="top"
                  enableDataZoom
                  tooltipFormatter={gasTooltipFormatter}
                  markLines={showAnnotations ? forkMarkLines : []}
                  syncGroup={inModal ? undefined : 'execution-overview'}
                />
              )}
            </PopoutCard>
          )}

          {/* Gas Limit Signalling Chart */}
          {signallingChartConfig && (
            <PopoutCard
              title="Gas Limit Signalling"
              subtitle={subtitles.signalling}
              anchorId="gas-signalling-chart"
              modalSize="full"
            >
              {({ inModal }) => (
                <MultiLineChart
                  series={signallingChartConfig.series}
                  xAxis={{
                    type: 'category',
                    labels: signallingChartConfig.labels,
                    name: 'Date',
                  }}
                  yAxis={{
                    name: 'Share (%)',
                    min: 0,
                    max: 100,
                  }}
                  secondaryYAxis={{
                    name: 'Validators',
                    min: 0,
                    formatter: (val: number) => {
                      if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
                      if (val >= 1_000) return `${(val / 1_000).toFixed(0)}K`;
                      return String(val);
                    },
                  }}
                  height={inModal ? 600 : 400}
                  showLegend
                  legendPosition="top"
                  enableDataZoom
                  tooltipFormatter={signallingTooltipFormatter}
                  markLines={showAnnotations ? signallingForkMarkLines : []}
                  syncGroup={inModal ? undefined : 'execution-overview'}
                />
              )}
            </PopoutCard>
          )}
        </div>
      )}
    </Container>
  );
}
