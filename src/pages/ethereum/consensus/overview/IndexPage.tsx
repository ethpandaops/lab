import { type JSX, useMemo, useCallback, useState } from 'react';
import { useSearch, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Container } from '@/components/Layout/Container';
import { Card } from '@/components/Layout/Card';
import { Header } from '@/components/Layout/Header';
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
import { epochToTimestamp } from '@/utils/beacon';
import clsx from 'clsx';
import {
  fctBlobCountHourlyServiceListOptions,
  fctBlobCountDailyServiceListOptions,
  fctAttestationParticipationRateHourlyServiceListOptions,
  fctAttestationParticipationRateDailyServiceListOptions,
  fctHeadVoteCorrectnessRateHourlyServiceListOptions,
  fctHeadVoteCorrectnessRateDailyServiceListOptions,
  fctReorgHourlyServiceListOptions,
  fctReorgDailyServiceListOptions,
  fctMissedSlotRateHourlyServiceListOptions,
  fctMissedSlotRateDailyServiceListOptions,
  fctBlockProposalStatusHourlyServiceListOptions,
  fctBlockProposalStatusDailyServiceListOptions,
  fctAttestationInclusionDelayHourlyServiceListOptions,
  fctAttestationInclusionDelayDailyServiceListOptions,
  fctProposerRewardHourlyServiceListOptions,
  fctProposerRewardDailyServiceListOptions,
} from '@/api/@tanstack/react-query.gen';
import type {
  FctBlobCountHourly,
  FctBlobCountDaily,
  FctAttestationParticipationRateHourly,
  FctAttestationParticipationRateDaily,
  FctHeadVoteCorrectnessRateHourly,
  FctHeadVoteCorrectnessRateDaily,
  FctReorgHourly,
  FctReorgDaily,
  FctMissedSlotRateHourly,
  FctMissedSlotRateDaily,
  FctBlockProposalStatusHourly,
  FctBlockProposalStatusDaily,
  FctAttestationInclusionDelayHourly,
  FctAttestationInclusionDelayDaily,
  FctProposerRewardHourly,
  FctProposerRewardDaily,
} from '@/api/types.gen';
import { ConsensusOverviewSkeleton } from './components';
import { type TimePeriod, TIME_RANGE_CONFIG, TIME_PERIOD_OPTIONS } from './constants';
import {
  fillTimeKeys,
  formatTooltipDate,
  buildTooltipHtml,
  formatBand,
  buildBlobCountChartConfig,
  buildAttestationParticipationChartConfig,
  buildHeadVoteCorrectnessChartConfig,
  buildReorgChartConfig,
  buildMissedSlotRateChartConfig,
  buildBlockProposalStatusChartConfig,
  buildAttestationInclusionDelayChartConfig,
  buildProposerRewardChartConfig,
  DEPTH_COLORS,
  STATUS_COLORS,
  type TooltipSection,
} from './overview.utils';

/**
 * IndexPage - Consensus Overview page
 */
export function IndexPage(): JSX.Element {
  const navigate = useNavigate({ from: '/ethereum/consensus/overview' });
  const { t } = useSearch({ from: '/ethereum/consensus/overview' });
  const timePeriod: TimePeriod = t ?? '7d';
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
    ...fctBlobCountHourlyServiceListOptions({
      query: {
        hour_start_date_time_gte: startTimestamp,
        order_by: 'hour_start_date_time asc',
        page_size: config.pageSize,
      },
    }),
    enabled: !isDaily,
  });
  const blobDailyQuery = useQuery({
    ...fctBlobCountDailyServiceListOptions({
      query: { day_start_date_like: '20%', order_by: 'day_start_date desc', page_size: config.pageSize },
    }),
    enabled: isDaily,
  });

  const attnHourlyQuery = useQuery({
    ...fctAttestationParticipationRateHourlyServiceListOptions({
      query: {
        hour_start_date_time_gte: startTimestamp,
        order_by: 'hour_start_date_time asc',
        page_size: config.pageSize,
      },
    }),
    enabled: !isDaily,
  });
  const attnDailyQuery = useQuery({
    ...fctAttestationParticipationRateDailyServiceListOptions({
      query: { day_start_date_like: '20%', order_by: 'day_start_date desc', page_size: config.pageSize },
    }),
    enabled: isDaily,
  });

  const hvHourlyQuery = useQuery({
    ...fctHeadVoteCorrectnessRateHourlyServiceListOptions({
      query: {
        hour_start_date_time_gte: startTimestamp,
        order_by: 'hour_start_date_time asc',
        page_size: config.pageSize,
      },
    }),
    enabled: !isDaily,
  });
  const hvDailyQuery = useQuery({
    ...fctHeadVoteCorrectnessRateDailyServiceListOptions({
      query: { day_start_date_like: '20%', order_by: 'day_start_date desc', page_size: config.pageSize },
    }),
    enabled: isDaily,
  });

  const reorgHourlyQuery = useQuery({
    ...fctReorgHourlyServiceListOptions({
      query: {
        hour_start_date_time_gte: startTimestamp,
        order_by: 'hour_start_date_time asc',
        page_size: config.pageSize,
      },
    }),
    enabled: !isDaily,
  });
  const reorgDailyQuery = useQuery({
    ...fctReorgDailyServiceListOptions({
      query: { day_start_date_like: '20%', order_by: 'day_start_date desc', page_size: config.pageSize },
    }),
    enabled: isDaily,
  });

  const missedSlotHourlyQuery = useQuery({
    ...fctMissedSlotRateHourlyServiceListOptions({
      query: {
        hour_start_date_time_gte: startTimestamp,
        order_by: 'hour_start_date_time asc',
        page_size: config.pageSize,
      },
    }),
    enabled: !isDaily,
  });
  const missedSlotDailyQuery = useQuery({
    ...fctMissedSlotRateDailyServiceListOptions({
      query: { day_start_date_like: '20%', order_by: 'day_start_date desc', page_size: config.pageSize },
    }),
    enabled: isDaily,
  });

  const proposalStatusHourlyQuery = useQuery({
    ...fctBlockProposalStatusHourlyServiceListOptions({
      query: {
        hour_start_date_time_gte: startTimestamp,
        order_by: 'hour_start_date_time asc',
        page_size: config.pageSize,
      },
    }),
    enabled: !isDaily,
  });
  const proposalStatusDailyQuery = useQuery({
    ...fctBlockProposalStatusDailyServiceListOptions({
      query: { day_start_date_like: '20%', order_by: 'day_start_date desc', page_size: config.pageSize },
    }),
    enabled: isDaily,
  });

  const inclusionDelayHourlyQuery = useQuery({
    ...fctAttestationInclusionDelayHourlyServiceListOptions({
      query: {
        hour_start_date_time_gte: startTimestamp,
        order_by: 'hour_start_date_time asc',
        page_size: config.pageSize,
      },
    }),
    enabled: !isDaily,
  });
  const inclusionDelayDailyQuery = useQuery({
    ...fctAttestationInclusionDelayDailyServiceListOptions({
      query: { day_start_date_like: '20%', order_by: 'day_start_date desc', page_size: config.pageSize },
    }),
    enabled: isDaily,
  });

  const proposerRewardHourlyQuery = useQuery({
    ...fctProposerRewardHourlyServiceListOptions({
      query: {
        hour_start_date_time_gte: startTimestamp,
        order_by: 'hour_start_date_time asc',
        page_size: config.pageSize,
      },
    }),
    enabled: !isDaily,
  });
  const proposerRewardDailyQuery = useQuery({
    ...fctProposerRewardDailyServiceListOptions({
      query: { day_start_date_like: '20%', order_by: 'day_start_date desc', page_size: config.pageSize },
    }),
    enabled: isDaily,
  });

  // --- Records ---

  const blobRecords = useMemo(
    () =>
      isDaily
        ? [...(blobDailyQuery.data?.fct_blob_count_daily ?? [])].reverse()
        : blobHourlyQuery.data?.fct_blob_count_hourly,
    [isDaily, blobDailyQuery.data, blobHourlyQuery.data]
  );

  const attnRecords = useMemo(
    () =>
      isDaily
        ? [...(attnDailyQuery.data?.fct_attestation_participation_rate_daily ?? [])].reverse()
        : attnHourlyQuery.data?.fct_attestation_participation_rate_hourly,
    [isDaily, attnDailyQuery.data, attnHourlyQuery.data]
  );

  const hvRecords = useMemo(
    () =>
      isDaily
        ? [...(hvDailyQuery.data?.fct_head_vote_correctness_rate_daily ?? [])].reverse()
        : hvHourlyQuery.data?.fct_head_vote_correctness_rate_hourly,
    [isDaily, hvDailyQuery.data, hvHourlyQuery.data]
  );

  const reorgRecords = useMemo(
    () =>
      isDaily ? [...(reorgDailyQuery.data?.fct_reorg_daily ?? [])].reverse() : reorgHourlyQuery.data?.fct_reorg_hourly,
    [isDaily, reorgDailyQuery.data, reorgHourlyQuery.data]
  );

  const missedSlotRecords = useMemo(
    () =>
      isDaily
        ? [...(missedSlotDailyQuery.data?.fct_missed_slot_rate_daily ?? [])].reverse()
        : missedSlotHourlyQuery.data?.fct_missed_slot_rate_hourly,
    [isDaily, missedSlotDailyQuery.data, missedSlotHourlyQuery.data]
  );

  const proposalStatusRecords = useMemo(
    () =>
      isDaily
        ? [...(proposalStatusDailyQuery.data?.fct_block_proposal_status_daily ?? [])].reverse()
        : proposalStatusHourlyQuery.data?.fct_block_proposal_status_hourly,
    [isDaily, proposalStatusDailyQuery.data, proposalStatusHourlyQuery.data]
  );

  const inclusionDelayRecords = useMemo(
    () =>
      isDaily
        ? [...(inclusionDelayDailyQuery.data?.fct_attestation_inclusion_delay_daily ?? [])].reverse()
        : inclusionDelayHourlyQuery.data?.fct_attestation_inclusion_delay_hourly,
    [isDaily, inclusionDelayDailyQuery.data, inclusionDelayHourlyQuery.data]
  );

  const proposerRewardRecords = useMemo(
    () =>
      isDaily
        ? [...(proposerRewardDailyQuery.data?.fct_proposer_reward_daily ?? [])].reverse()
        : proposerRewardHourlyQuery.data?.fct_proposer_reward_hourly,
    [isDaily, proposerRewardDailyQuery.data, proposerRewardHourlyQuery.data]
  );

  // --- Unified time keys from all datasets ---

  const unifiedTimeKeys = useMemo(() => {
    const allKeys = new Set<string>();

    const addHourlyKeys = (records: { hour_start_date_time?: number }[] | undefined): void => {
      records?.forEach(r => allKeys.add(String(r.hour_start_date_time ?? '')));
    };
    const addDailyKeys = (records: { day_start_date?: string }[] | undefined): void => {
      records?.forEach(r => allKeys.add(r.day_start_date ?? ''));
    };

    if (!isDaily) {
      addHourlyKeys(blobRecords as FctBlobCountHourly[] | undefined);
      addHourlyKeys(attnRecords as FctAttestationParticipationRateHourly[] | undefined);
      addHourlyKeys(hvRecords as FctHeadVoteCorrectnessRateHourly[] | undefined);
      addHourlyKeys(reorgRecords as FctReorgHourly[] | undefined);
      addHourlyKeys(missedSlotRecords as FctMissedSlotRateHourly[] | undefined);
      addHourlyKeys(proposalStatusRecords as FctBlockProposalStatusHourly[] | undefined);
      addHourlyKeys(inclusionDelayRecords as FctAttestationInclusionDelayHourly[] | undefined);
      addHourlyKeys(proposerRewardRecords as FctProposerRewardHourly[] | undefined);
    } else {
      addDailyKeys(blobRecords as FctBlobCountDaily[] | undefined);
      addDailyKeys(attnRecords as FctAttestationParticipationRateDaily[] | undefined);
      addDailyKeys(hvRecords as FctHeadVoteCorrectnessRateDaily[] | undefined);
      addDailyKeys(reorgRecords as FctReorgDaily[] | undefined);
      addDailyKeys(missedSlotRecords as FctMissedSlotRateDaily[] | undefined);
      addDailyKeys(proposalStatusRecords as FctBlockProposalStatusDaily[] | undefined);
      addDailyKeys(inclusionDelayRecords as FctAttestationInclusionDelayDaily[] | undefined);
      addDailyKeys(proposerRewardRecords as FctProposerRewardDaily[] | undefined);
    }

    allKeys.delete('');
    const sortedKeys = [...allKeys].sort();
    return fillTimeKeys(sortedKeys, isDaily);
  }, [
    blobRecords,
    attnRecords,
    hvRecords,
    reorgRecords,
    missedSlotRecords,
    proposalStatusRecords,
    inclusionDelayRecords,
    proposerRewardRecords,
    isDaily,
  ]);

  // --- Loading & error ---

  const hourlyLoading =
    blobHourlyQuery.isLoading ||
    attnHourlyQuery.isLoading ||
    hvHourlyQuery.isLoading ||
    reorgHourlyQuery.isLoading ||
    missedSlotHourlyQuery.isLoading ||
    proposalStatusHourlyQuery.isLoading ||
    inclusionDelayHourlyQuery.isLoading ||
    proposerRewardHourlyQuery.isLoading;
  const dailyLoading =
    blobDailyQuery.isLoading ||
    attnDailyQuery.isLoading ||
    hvDailyQuery.isLoading ||
    reorgDailyQuery.isLoading ||
    missedSlotDailyQuery.isLoading ||
    proposalStatusDailyQuery.isLoading ||
    inclusionDelayDailyQuery.isLoading ||
    proposerRewardDailyQuery.isLoading;
  const isLoading = isDaily ? dailyLoading : hourlyLoading;
  const error = isDaily
    ? (blobDailyQuery.error ??
      attnDailyQuery.error ??
      hvDailyQuery.error ??
      reorgDailyQuery.error ??
      missedSlotDailyQuery.error ??
      proposalStatusDailyQuery.error ??
      inclusionDelayDailyQuery.error ??
      proposerRewardDailyQuery.error)
    : (blobHourlyQuery.error ??
      attnHourlyQuery.error ??
      hvHourlyQuery.error ??
      reorgHourlyQuery.error ??
      missedSlotHourlyQuery.error ??
      proposalStatusHourlyQuery.error ??
      inclusionDelayHourlyQuery.error ??
      proposerRewardHourlyQuery.error);

  // --- Max blob values for reference line ---
  // Base limits from consensus forks + BPO overrides from blob_schedule

  const maxBlobValues = useMemo(() => {
    if (!currentNetwork?.genesis_time || !currentNetwork?.forks?.consensus || !unifiedTimeKeys.length) return undefined;

    const genesisTime = currentNetwork.genesis_time;
    const consensus = currentNetwork.forks.consensus;

    // Start with base fork blob limits
    const schedule: { timestamp: number; maxBlobs: number }[] = [];
    if (consensus.deneb) {
      schedule.push({ timestamp: epochToTimestamp(consensus.deneb.epoch, genesisTime), maxBlobs: 6 });
    }
    if (consensus.electra) {
      schedule.push({ timestamp: epochToTimestamp(consensus.electra.epoch, genesisTime), maxBlobs: 9 });
    }

    // Layer on BPO (Blob Parameter-Only) overrides from blob_schedule
    if (currentNetwork.blob_schedule?.length) {
      for (const item of currentNetwork.blob_schedule) {
        schedule.push({
          timestamp: item.timestamp ?? epochToTimestamp(item.epoch, genesisTime),
          maxBlobs: item.max_blobs_per_block,
        });
      }
    }

    schedule.sort((a, b) => a.timestamp - b.timestamp);

    if (!schedule.length) return undefined;

    return unifiedTimeKeys.map(key => {
      const ts = isDaily ? Math.floor(new Date(key).getTime() / 1000) : Number(key);

      let activeMaxBlobs: number | null = null;
      for (const item of schedule) {
        if (ts >= item.timestamp) {
          activeMaxBlobs = item.maxBlobs;
        } else {
          break;
        }
      }
      return activeMaxBlobs;
    });
  }, [currentNetwork, unifiedTimeKeys, isDaily]);

  // --- Chart configs ---

  const blobChartConfig = useMemo(() => {
    if (!blobRecords?.length || !unifiedTimeKeys.length) return null;
    return buildBlobCountChartConfig(blobRecords, unifiedTimeKeys, isDaily, maxBlobValues);
  }, [blobRecords, unifiedTimeKeys, isDaily, maxBlobValues]);

  const attnChartConfig = useMemo(() => {
    if (!attnRecords?.length || !unifiedTimeKeys.length) return null;
    return buildAttestationParticipationChartConfig(attnRecords, unifiedTimeKeys, isDaily);
  }, [attnRecords, unifiedTimeKeys, isDaily]);

  const hvChartConfig = useMemo(() => {
    if (!hvRecords?.length || !unifiedTimeKeys.length) return null;
    return buildHeadVoteCorrectnessChartConfig(hvRecords, unifiedTimeKeys, isDaily);
  }, [hvRecords, unifiedTimeKeys, isDaily]);

  const reorgChartConfig = useMemo(() => {
    if (!reorgRecords?.length || !unifiedTimeKeys.length) return null;
    return buildReorgChartConfig(reorgRecords, unifiedTimeKeys, isDaily);
  }, [reorgRecords, unifiedTimeKeys, isDaily]);

  const missedSlotChartConfig = useMemo(() => {
    if (!missedSlotRecords?.length || !unifiedTimeKeys.length) return null;
    return buildMissedSlotRateChartConfig(missedSlotRecords, unifiedTimeKeys, isDaily);
  }, [missedSlotRecords, unifiedTimeKeys, isDaily]);

  const proposalStatusChartConfig = useMemo(() => {
    if (!proposalStatusRecords?.length || !unifiedTimeKeys.length) return null;
    return buildBlockProposalStatusChartConfig(proposalStatusRecords, unifiedTimeKeys, isDaily);
  }, [proposalStatusRecords, unifiedTimeKeys, isDaily]);

  const inclusionDelayChartConfig = useMemo(() => {
    if (!inclusionDelayRecords?.length || !unifiedTimeKeys.length) return null;
    return buildAttestationInclusionDelayChartConfig(inclusionDelayRecords, unifiedTimeKeys, isDaily);
  }, [inclusionDelayRecords, unifiedTimeKeys, isDaily]);

  const proposerRewardChartConfig = useMemo(() => {
    if (!proposerRewardRecords?.length || !unifiedTimeKeys.length) return null;
    return buildProposerRewardChartConfig(proposerRewardRecords, unifiedTimeKeys, isDaily);
  }, [proposerRewardRecords, unifiedTimeKeys, isDaily]);

  // --- Fork mark lines ---

  const chartLabels = useMemo(
    () =>
      blobChartConfig?.labels ??
      attnChartConfig?.labels ??
      hvChartConfig?.labels ??
      reorgChartConfig?.labels ??
      missedSlotChartConfig?.labels ??
      [],
    [blobChartConfig, attnChartConfig, hvChartConfig, reorgChartConfig, missedSlotChartConfig]
  );

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
        const fmt = (v: unknown): string => `${Number(v ?? 0).toFixed(2)}${unit}`;

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

  const attnTooltipFormatter = useMemo(
    () =>
      makeStatsTooltipFormatter(
        attnRecords as Record<string, unknown>[] | undefined,
        {
          avg: 'avg_participation_rate',
          movingAvg: 'moving_avg_participation_rate',
          median: 'p50_participation_rate',
          lowerBand: 'lower_band_participation_rate',
          upperBand: 'upper_band_participation_rate',
          p05: 'p05_participation_rate',
          p95: 'p95_participation_rate',
          min: 'min_participation_rate',
          max: 'max_participation_rate',
        },
        '%'
      ),
    [makeStatsTooltipFormatter, attnRecords]
  );

  const hvTooltipFormatter = useMemo(
    () =>
      makeStatsTooltipFormatter(
        hvRecords as Record<string, unknown>[] | undefined,
        {
          avg: 'avg_head_vote_rate',
          movingAvg: 'moving_avg_head_vote_rate',
          median: 'p50_head_vote_rate',
          lowerBand: 'lower_band_head_vote_rate',
          upperBand: 'upper_band_head_vote_rate',
          p05: 'p05_head_vote_rate',
          p95: 'p95_head_vote_rate',
          min: 'min_head_vote_rate',
          max: 'max_head_vote_rate',
        },
        '%'
      ),
    [makeStatsTooltipFormatter, hvRecords]
  );

  const reorgTooltipFormatter = useCallback(
    (params: unknown): string => {
      if (!reorgRecords?.length || !unifiedTimeKeys.length) return '';

      const dataPoints = Array.isArray(params) ? params : [params];
      if (!dataPoints.length) return '';
      const firstPoint = dataPoints[0] as { dataIndex?: number };
      if (firstPoint.dataIndex === undefined) return '';
      const timeKey = unifiedTimeKeys[firstPoint.dataIndex];
      if (!timeKey) return '';

      const dateValue = isDaily ? timeKey : Number(timeKey);
      const dateStr = formatTooltipDate(dateValue, isDaily);

      // Sum reorgs per depth for this time key
      const depthCounts = new Map<number, number>();
      for (const r of reorgRecords) {
        const rKey = isDaily
          ? ((r as FctReorgDaily).day_start_date ?? '')
          : String((r as FctReorgHourly).hour_start_date_time ?? '');
        if (rKey === timeKey) {
          depthCounts.set(r.depth ?? 1, r.reorg_count ?? 0);
        }
      }

      const total = [...depthCounts.values()].reduce((s, c) => s + c, 0);
      const sortedDepths = [...depthCounts.entries()].sort((a, b) => a[0] - b[0]);

      const sections: TooltipSection[] = [
        {
          title: `REORGS (${total} total)`,
          items: sortedDepths.map(([depth, count], i) => ({
            color: DEPTH_COLORS[i % DEPTH_COLORS.length],
            label: `Depth ${depth}`,
            value: String(count),
            style: 'area' as const,
          })),
        },
      ];

      return buildTooltipHtml(dateStr, sections);
    },
    [reorgRecords, unifiedTimeKeys, isDaily]
  );

  const missedSlotTooltipFormatter = useCallback(
    (params: unknown): string => {
      if (!missedSlotRecords?.length || !unifiedTimeKeys.length) return '';

      const recordsByKey = new Map<string, FctMissedSlotRateHourly | FctMissedSlotRateDaily>();
      for (const r of missedSlotRecords) {
        const key = isDaily
          ? ((r as FctMissedSlotRateDaily).day_start_date ?? '')
          : String((r as FctMissedSlotRateHourly).hour_start_date_time ?? '');
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

      const dateValue = isDaily ? timeKey : Number(timeKey);
      const dateStr = formatTooltipDate(dateValue, isDaily);

      const sections: TooltipSection[] = [
        {
          title: `MISSED SLOTS (${record.missed_count ?? 0} / ${record.slot_count ?? 0})`,
          items: [
            { color: '#f43f5e', label: 'Missed Rate', value: `${(record.missed_rate ?? 0).toFixed(2)}%` },
            { color: '#06b6d4', label: 'Moving Avg', value: `${(record.moving_avg_missed_rate ?? 0).toFixed(2)}%` },
          ],
        },
      ];

      return buildTooltipHtml(dateStr, sections);
    },
    [missedSlotRecords, unifiedTimeKeys, isDaily]
  );

  const proposalStatusTooltipFormatter = useCallback(
    (params: unknown): string => {
      if (!proposalStatusRecords?.length || !unifiedTimeKeys.length) return '';

      const dataPoints = Array.isArray(params) ? params : [params];
      if (!dataPoints.length) return '';
      const firstPoint = dataPoints[0] as { dataIndex?: number };
      if (firstPoint.dataIndex === undefined) return '';
      const timeKey = unifiedTimeKeys[firstPoint.dataIndex];
      if (!timeKey) return '';

      const dateValue = isDaily ? timeKey : Number(timeKey);
      const dateStr = formatTooltipDate(dateValue, isDaily);

      const statusCounts = new Map<string, number>();
      for (const r of proposalStatusRecords) {
        const rKey = isDaily
          ? ((r as FctBlockProposalStatusDaily).day_start_date ?? '')
          : String((r as FctBlockProposalStatusHourly).hour_start_date_time ?? '');
        if (rKey === timeKey) {
          statusCounts.set(r.status ?? 'unknown', r.slot_count ?? 0);
        }
      }

      const total = [...statusCounts.values()].reduce((s, c) => s + c, 0);
      const sortedStatuses = [...statusCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]));

      const sections: TooltipSection[] = [
        {
          title: `PROPOSAL STATUS (${total} slots)`,
          items: sortedStatuses.map(([status, count]) => {
            const rate = total > 0 ? ((count / total) * 100).toFixed(2) : '0.00';
            return {
              color: STATUS_COLORS[status] ?? '#94a3b8',
              label: status.charAt(0).toUpperCase() + status.slice(1),
              value: `${rate}% (${count})`,
            };
          }),
        },
      ];

      return buildTooltipHtml(dateStr, sections);
    },
    [proposalStatusRecords, unifiedTimeKeys, isDaily]
  );

  const inclusionDelayTooltipFormatter = useMemo(
    () =>
      makeStatsTooltipFormatter(
        inclusionDelayRecords as Record<string, unknown>[] | undefined,
        {
          avg: 'avg_inclusion_delay',
          movingAvg: 'moving_avg_inclusion_delay',
          median: 'p50_inclusion_delay',
          lowerBand: 'lower_band_inclusion_delay',
          upperBand: 'upper_band_inclusion_delay',
          p05: 'p05_inclusion_delay',
          p95: 'p95_inclusion_delay',
          min: 'min_inclusion_delay',
          max: 'max_inclusion_delay',
        },
        ' slots'
      ),
    [makeStatsTooltipFormatter, inclusionDelayRecords]
  );

  const proposerRewardTooltipFormatter = useMemo(
    () =>
      makeStatsTooltipFormatter(
        proposerRewardRecords as Record<string, unknown>[] | undefined,
        {
          avg: 'avg_reward_eth',
          movingAvg: 'moving_avg_reward_eth',
          median: 'p50_reward_eth',
          lowerBand: 'lower_band_reward_eth',
          upperBand: 'upper_band_reward_eth',
          p05: 'p05_reward_eth',
          p95: 'p95_reward_eth',
          min: 'min_reward_eth',
          max: 'max_reward_eth',
        },
        ' ETH'
      ),
    [makeStatsTooltipFormatter, proposerRewardRecords]
  );

  // --- Subtitles ---

  const makeSub = (metric: string): string =>
    isDaily ? `Daily ${metric} with statistical bands` : `Hourly ${metric} over ${config.days} days`;

  return (
    <Container>
      <Header title="Consensus Overview" description="Ethereum consensus layer metrics" showAccent={false} />

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
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 3xl:grid-cols-3">
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
                  yAxis={{ name: 'Blobs', min: 'dataMin' }}
                  height={inModal ? 600 : 280}
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

          {/* Attestation Participation Rate */}
          {attnChartConfig && (
            <PopoutCard
              title="Attestation Participation Rate"
              subtitle={makeSub('attestation participation rate')}
              anchorId="attestation-participation-chart"
              modalSize="full"
            >
              {({ inModal }) => (
                <MultiLineChart
                  series={attnChartConfig.series}
                  xAxis={{ type: 'category', labels: attnChartConfig.labels, name: 'Date' }}
                  yAxis={{ name: 'Participation Rate (%)', min: 'dataMin' }}
                  height={inModal ? 600 : 280}
                  showLegend
                  legendPosition="top"
                  enableDataZoom
                  tooltipFormatter={attnTooltipFormatter}
                  markLines={showAnnotations ? forkMarkLines : []}
                  syncGroup={inModal ? undefined : 'consensus-overview'}
                />
              )}
            </PopoutCard>
          )}

          {/* Head Vote Correctness Rate */}
          {hvChartConfig && (
            <PopoutCard
              title="Head Vote Correctness"
              subtitle={makeSub('head vote correctness rate')}
              anchorId="head-vote-correctness-chart"
              modalSize="full"
            >
              {({ inModal }) => (
                <MultiLineChart
                  series={hvChartConfig.series}
                  xAxis={{ type: 'category', labels: hvChartConfig.labels, name: 'Date' }}
                  yAxis={{ name: 'Head Vote Rate (%)', min: 'dataMin' }}
                  height={inModal ? 600 : 280}
                  showLegend
                  legendPosition="top"
                  enableDataZoom
                  tooltipFormatter={hvTooltipFormatter}
                  markLines={showAnnotations ? forkMarkLines : []}
                  syncGroup={inModal ? undefined : 'consensus-overview'}
                />
              )}
            </PopoutCard>
          )}

          {/* Reorgs */}
          {reorgChartConfig && (
            <PopoutCard
              title="Reorgs"
              subtitle={isDaily ? 'Daily reorg events by depth' : `Hourly reorg events over ${config.days} days`}
              anchorId="reorg-chart"
              modalSize="full"
            >
              {({ inModal }) => (
                <MultiLineChart
                  series={reorgChartConfig.series}
                  xAxis={{ type: 'category', labels: reorgChartConfig.labels, name: 'Date' }}
                  yAxis={{ name: 'Reorg Count', min: 'dataMin' }}
                  height={inModal ? 600 : 280}
                  showLegend
                  legendPosition="top"
                  enableDataZoom
                  tooltipFormatter={reorgTooltipFormatter}
                  markLines={showAnnotations ? forkMarkLines : []}
                  syncGroup={inModal ? undefined : 'consensus-overview'}
                />
              )}
            </PopoutCard>
          )}

          {/* Missed Slot Rate */}
          {missedSlotChartConfig && (
            <PopoutCard
              title="Missed Slot Rate"
              subtitle={makeSub('missed slot rate')}
              anchorId="missed-slot-rate-chart"
              modalSize="full"
            >
              {({ inModal }) => (
                <MultiLineChart
                  series={missedSlotChartConfig.series}
                  xAxis={{ type: 'category', labels: missedSlotChartConfig.labels, name: 'Date' }}
                  yAxis={{ name: 'Missed Rate (%)', min: 'dataMin' }}
                  height={inModal ? 600 : 280}
                  showLegend
                  legendPosition="top"
                  enableDataZoom
                  tooltipFormatter={missedSlotTooltipFormatter}
                  markLines={showAnnotations ? forkMarkLines : []}
                  syncGroup={inModal ? undefined : 'consensus-overview'}
                />
              )}
            </PopoutCard>
          )}

          {/* Block Proposal Status */}
          {proposalStatusChartConfig && (
            <PopoutCard
              title="Block Proposal Status"
              subtitle={
                isDaily
                  ? 'Daily block proposal outcome rates'
                  : `Hourly block proposal outcome rates over ${config.days} days`
              }
              anchorId="block-proposal-status-chart"
              modalSize="full"
            >
              {({ inModal }) => (
                <MultiLineChart
                  series={proposalStatusChartConfig.series}
                  xAxis={{ type: 'category', labels: proposalStatusChartConfig.labels, name: 'Date' }}
                  yAxis={{ name: 'Rate (%)', min: 'dataMin' }}
                  height={inModal ? 600 : 280}
                  showLegend
                  legendPosition="top"
                  enableDataZoom
                  tooltipFormatter={proposalStatusTooltipFormatter}
                  markLines={showAnnotations ? forkMarkLines : []}
                  syncGroup={inModal ? undefined : 'consensus-overview'}
                />
              )}
            </PopoutCard>
          )}

          {/* Attestation Inclusion Delay */}
          {inclusionDelayChartConfig && (
            <PopoutCard
              title="Attestation Inclusion Delay"
              subtitle={makeSub('attestation inclusion delay')}
              anchorId="inclusion-delay-chart"
              modalSize="full"
            >
              {({ inModal }) => (
                <MultiLineChart
                  series={inclusionDelayChartConfig.series}
                  xAxis={{ type: 'category', labels: inclusionDelayChartConfig.labels, name: 'Date' }}
                  yAxis={{ name: 'Inclusion Delay (slots)', min: 'dataMin' }}
                  height={inModal ? 600 : 280}
                  showLegend
                  legendPosition="top"
                  enableDataZoom
                  tooltipFormatter={inclusionDelayTooltipFormatter}
                  markLines={showAnnotations ? forkMarkLines : []}
                  syncGroup={inModal ? undefined : 'consensus-overview'}
                />
              )}
            </PopoutCard>
          )}

          {/* Proposer Reward (MEV Relay) */}
          {proposerRewardChartConfig && (
            <PopoutCard
              title="Proposer Reward (MEV Relay)"
              subtitle={makeSub('MEV proposer reward')}
              anchorId="proposer-reward-chart"
              modalSize="full"
            >
              {({ inModal }) => (
                <MultiLineChart
                  series={proposerRewardChartConfig.series}
                  xAxis={{ type: 'category', labels: proposerRewardChartConfig.labels, name: 'Date' }}
                  yAxis={{ name: 'Reward (ETH)', min: 'dataMin' }}
                  height={inModal ? 600 : 280}
                  showLegend
                  legendPosition="top"
                  enableDataZoom
                  tooltipFormatter={proposerRewardTooltipFormatter}
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
