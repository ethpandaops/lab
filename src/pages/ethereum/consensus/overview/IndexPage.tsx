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
import { useThemeColors } from '@/hooks/useThemeColors';
import { getDataVizColors } from '@/utils/dataVizColors';
import { Toggle } from '@/components/Forms/Toggle';
import { SegmentedControl } from '@/components/Forms/SegmentedControl';
import { epochToTimestamp } from '@/utils/beacon';
import { completeBucketEnd, currentUtcDate } from '@/utils/time';
import { fetchAllPages } from '@/utils/api-pagination';
import { useTableBounds } from '@/hooks/useBounds';
import {
  fctBlobCountHourlyServiceListOptions,
  fctBlobCountDailyServiceListOptions,
  fctAttestationParticipationRateHourlyServiceListOptions,
  fctAttestationParticipationRateDailyServiceListOptions,
  fctHeadVoteCorrectnessRateHourlyServiceListOptions,
  fctHeadVoteCorrectnessRateDailyServiceListOptions,
  fctMissedSlotRateHourlyServiceListOptions,
  fctMissedSlotRateDailyServiceListOptions,
  fctBlockProposalStatusHourlyServiceListOptions,
  fctBlockProposalStatusDailyServiceListOptions,
  fctBlockPayloadStatusHourlyServiceListOptions,
  fctBlockPayloadStatusDailyServiceListOptions,
  fctAttestationInclusionDelayHourlyServiceListOptions,
  fctAttestationInclusionDelayDailyServiceListOptions,
} from '@/api/@tanstack/react-query.gen';
import { fctReorgDailyServiceList, fctReorgHourlyServiceList } from '@/api/sdk.gen';
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
} from '@/api/types.gen';
import { ConsensusOverviewSkeleton } from './components';
import { type TimePeriod, TIME_RANGE_CONFIG, TIME_PERIOD_OPTIONS, PAGE_SIZE } from './constants';
import {
  fillTimeKeys,
  formatTooltipDate,
  buildTooltipHtml,
  formatBand,
  dailyWindowStartDate,
  trimDailyRecords,
  buildBlobCountChartConfig,
  buildAttestationParticipationChartConfig,
  buildHeadVoteCorrectnessChartConfig,
  buildReorgChartConfig,
  isBucketCovered,
  buildBlockProposalStatusChartConfig,
  buildProposalStatusChartConfig,
  proposalStatusCounts,
  orphansKnown,
  buildAttestationInclusionDelayChartConfig,
  DEPTH_COLORS,
  type TooltipSection,
} from './overview.utils';

const { DATA_COLORS } = getDataVizColors();

/**
 * IndexPage - Consensus Overview page
 */
export function IndexPage(): JSX.Element {
  const navigate = useNavigate({ from: '/ethereum/consensus/overview' });
  const { t } = useSearch({ from: '/ethereum/consensus/overview' });
  const timePeriod: TimePeriod = t ?? 'all';
  const [showAnnotations, setShowAnnotations] = useState(true);
  const config = TIME_RANGE_CONFIG[timePeriod];
  const isDaily = config.dataType === 'daily';

  const { currentNetwork } = useNetwork();
  const themeColors = useThemeColors();
  const { allForks } = useForks();

  // Rollups are read up to the hour or UTC day in progress, never including it
  const hourlyEnd = useMemo(() => completeBucketEnd('hour'), []);
  const today = useMemo(() => currentUtcDate(), []);
  const startTimestamp = config.days === null ? undefined : hourlyEnd - config.days * 24 * 60 * 60;

  // Daily endpoints have no server-side range filter on their primary key, so the
  // selected window is applied to daily records client-side via this cutoff date.
  const dailyStartDate = useMemo(() => dailyWindowStartDate(config.days), [config.days]);

  // --- Queries ---

  const blobHourlyQuery = useQuery({
    ...fctBlobCountHourlyServiceListOptions({
      query: {
        hour_start_date_time_gte: startTimestamp,
        hour_start_date_time_lt: hourlyEnd,
        order_by: 'hour_start_date_time asc',
        page_size: PAGE_SIZE,
      },
    }),
    enabled: !isDaily,
  });
  const blobDailyQuery = useQuery({
    ...fctBlobCountDailyServiceListOptions({
      query: { day_start_date_ne: today, order_by: 'day_start_date desc', page_size: PAGE_SIZE },
    }),
    enabled: isDaily,
  });

  const attnHourlyQuery = useQuery({
    ...fctAttestationParticipationRateHourlyServiceListOptions({
      query: {
        hour_start_date_time_gte: startTimestamp,
        hour_start_date_time_lt: hourlyEnd,
        order_by: 'hour_start_date_time asc',
        page_size: PAGE_SIZE,
      },
    }),
    enabled: !isDaily,
  });
  const attnDailyQuery = useQuery({
    ...fctAttestationParticipationRateDailyServiceListOptions({
      query: { day_start_date_ne: today, order_by: 'day_start_date desc', page_size: PAGE_SIZE },
    }),
    enabled: isDaily,
  });

  const hvHourlyQuery = useQuery({
    ...fctHeadVoteCorrectnessRateHourlyServiceListOptions({
      query: {
        hour_start_date_time_gte: startTimestamp,
        hour_start_date_time_lt: hourlyEnd,
        order_by: 'hour_start_date_time asc',
        page_size: PAGE_SIZE,
      },
    }),
    enabled: !isDaily,
  });
  const hvDailyQuery = useQuery({
    ...fctHeadVoteCorrectnessRateDailyServiceListOptions({
      query: { day_start_date_ne: today, order_by: 'day_start_date desc', page_size: PAGE_SIZE },
    }),
    enabled: isDaily,
  });

  // Reorg tables write a zero row for every depth in every bucket, so only non-zero rows are read, across
  // every page: their count grows with reorgs, not with time.
  const reorgHourlyQuery = useQuery({
    queryKey: ['consensus-overview', 'reorg-hourly', currentNetwork?.name, startTimestamp, hourlyEnd],
    queryFn: ({ signal }) =>
      fetchAllPages<FctReorgHourly>(
        fctReorgHourlyServiceList,
        {
          query: {
            hour_start_date_time_gte: startTimestamp,
            hour_start_date_time_lt: hourlyEnd,
            reorg_count_gt: 0,
            order_by: 'hour_start_date_time asc',
            page_size: PAGE_SIZE,
          },
        },
        'fct_reorg_hourly',
        signal
      ),
    enabled: !isDaily,
  });
  const reorgDailyQuery = useQuery({
    queryKey: ['consensus-overview', 'reorg-daily', currentNetwork?.name, today],
    queryFn: ({ signal }) =>
      fetchAllPages<FctReorgDaily>(
        fctReorgDailyServiceList,
        {
          query: { day_start_date_ne: today, reorg_count_gt: 0, order_by: 'day_start_date desc', page_size: PAGE_SIZE },
        },
        'fct_reorg_daily',
        signal
      ),
    enabled: isDaily,
  });
  const reorgTableBounds = useTableBounds(isDaily ? 'fct_reorg_daily' : 'fct_reorg_hourly');
  // Orphaned blocks, and so reorgs, are only known from the proposer head table's first slot
  const headBounds = useTableBounds('fct_block_proposer_head');
  const orphansKnownFrom = headBounds.data?.min;
  const reorgCoverage = useMemo(
    () =>
      reorgTableBounds.data && orphansKnownFrom !== undefined
        ? { min: Math.max(reorgTableBounds.data.min, orphansKnownFrom), max: reorgTableBounds.data.max }
        : undefined,
    [reorgTableBounds.data, orphansKnownFrom]
  );
  const reorgBounds = { isLoading: reorgTableBounds.isLoading || headBounds.isLoading, data: reorgCoverage };

  const missedSlotHourlyQuery = useQuery({
    ...fctMissedSlotRateHourlyServiceListOptions({
      query: {
        hour_start_date_time_gte: startTimestamp,
        hour_start_date_time_lt: hourlyEnd,
        order_by: 'hour_start_date_time asc',
        page_size: PAGE_SIZE,
      },
    }),
    enabled: !isDaily,
  });
  const missedSlotDailyQuery = useQuery({
    ...fctMissedSlotRateDailyServiceListOptions({
      query: { day_start_date_ne: today, order_by: 'day_start_date desc', page_size: PAGE_SIZE },
    }),
    enabled: isDaily,
  });

  const proposalStatusHourlyQuery = useQuery({
    ...fctBlockProposalStatusHourlyServiceListOptions({
      query: {
        hour_start_date_time_gte: startTimestamp,
        hour_start_date_time_lt: hourlyEnd,
        order_by: 'hour_start_date_time asc',
        page_size: PAGE_SIZE,
      },
    }),
    enabled: !isDaily,
  });
  const proposalStatusDailyQuery = useQuery({
    ...fctBlockProposalStatusDailyServiceListOptions({
      query: { day_start_date_ne: today, order_by: 'day_start_date desc', page_size: PAGE_SIZE },
    }),
    enabled: isDaily,
  });

  // Gloas (ePBS): payload delivery outcomes judged by the PTC. The tables are empty pre-gloas, so the chart
  // self-gates by data presence.
  const payloadStatusHourlyQuery = useQuery({
    ...fctBlockPayloadStatusHourlyServiceListOptions({
      query: {
        hour_start_date_time_gte: startTimestamp,
        hour_start_date_time_lt: hourlyEnd,
        order_by: 'hour_start_date_time asc',
        page_size: PAGE_SIZE,
      },
    }),
    enabled: !isDaily,
  });
  const payloadStatusDailyQuery = useQuery({
    ...fctBlockPayloadStatusDailyServiceListOptions({
      query: { day_start_date_ne: today, order_by: 'day_start_date desc', page_size: PAGE_SIZE },
    }),
    enabled: isDaily,
  });

  const inclusionDelayHourlyQuery = useQuery({
    ...fctAttestationInclusionDelayHourlyServiceListOptions({
      query: {
        hour_start_date_time_gte: startTimestamp,
        hour_start_date_time_lt: hourlyEnd,
        order_by: 'hour_start_date_time asc',
        page_size: PAGE_SIZE,
      },
    }),
    enabled: !isDaily,
  });
  const inclusionDelayDailyQuery = useQuery({
    ...fctAttestationInclusionDelayDailyServiceListOptions({
      query: { day_start_date_ne: today, order_by: 'day_start_date desc', page_size: PAGE_SIZE },
    }),
    enabled: isDaily,
  });

  // --- Records ---

  const blobRecords = useMemo(
    () =>
      isDaily
        ? trimDailyRecords([...(blobDailyQuery.data?.fct_blob_count_daily ?? [])].reverse(), dailyStartDate)
        : blobHourlyQuery.data?.fct_blob_count_hourly,
    [isDaily, blobDailyQuery.data, blobHourlyQuery.data, dailyStartDate]
  );

  const attnRecords = useMemo(
    () =>
      isDaily
        ? trimDailyRecords(
            [...(attnDailyQuery.data?.fct_attestation_participation_rate_daily ?? [])].reverse(),
            dailyStartDate
          )
        : attnHourlyQuery.data?.fct_attestation_participation_rate_hourly,
    [isDaily, attnDailyQuery.data, attnHourlyQuery.data, dailyStartDate]
  );

  const hvRecords = useMemo(
    () =>
      isDaily
        ? trimDailyRecords(
            [...(hvDailyQuery.data?.fct_head_vote_correctness_rate_daily ?? [])].reverse(),
            dailyStartDate
          )
        : hvHourlyQuery.data?.fct_head_vote_correctness_rate_hourly,
    [isDaily, hvDailyQuery.data, hvHourlyQuery.data, dailyStartDate]
  );

  const reorgRecords = useMemo(
    () =>
      isDaily ? trimDailyRecords([...(reorgDailyQuery.data ?? [])].reverse(), dailyStartDate) : reorgHourlyQuery.data,
    [isDaily, reorgDailyQuery.data, reorgHourlyQuery.data, dailyStartDate]
  );

  const missedSlotRecords = useMemo(
    () =>
      isDaily
        ? trimDailyRecords([...(missedSlotDailyQuery.data?.fct_missed_slot_rate_daily ?? [])].reverse(), dailyStartDate)
        : missedSlotHourlyQuery.data?.fct_missed_slot_rate_hourly,
    [isDaily, missedSlotDailyQuery.data, missedSlotHourlyQuery.data, dailyStartDate]
  );

  const proposalStatusRecords = useMemo(
    () =>
      isDaily
        ? trimDailyRecords(
            [...(proposalStatusDailyQuery.data?.fct_block_proposal_status_daily ?? [])].reverse(),
            dailyStartDate
          )
        : proposalStatusHourlyQuery.data?.fct_block_proposal_status_hourly,
    [isDaily, proposalStatusDailyQuery.data, proposalStatusHourlyQuery.data, dailyStartDate]
  );

  const inclusionDelayRecords = useMemo(
    () =>
      isDaily
        ? trimDailyRecords(
            [...(inclusionDelayDailyQuery.data?.fct_attestation_inclusion_delay_daily ?? [])].reverse(),
            dailyStartDate
          )
        : inclusionDelayHourlyQuery.data?.fct_attestation_inclusion_delay_hourly,
    [isDaily, inclusionDelayDailyQuery.data, inclusionDelayHourlyQuery.data, dailyStartDate]
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
    } else {
      addDailyKeys(blobRecords as FctBlobCountDaily[] | undefined);
      addDailyKeys(attnRecords as FctAttestationParticipationRateDaily[] | undefined);
      addDailyKeys(hvRecords as FctHeadVoteCorrectnessRateDaily[] | undefined);
      addDailyKeys(reorgRecords as FctReorgDaily[] | undefined);
      addDailyKeys(missedSlotRecords as FctMissedSlotRateDaily[] | undefined);
      addDailyKeys(proposalStatusRecords as FctBlockProposalStatusDaily[] | undefined);
      addDailyKeys(inclusionDelayRecords as FctAttestationInclusionDelayDaily[] | undefined);
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
    isDaily,
  ]);

  // --- Loading & error ---

  const hourlyLoading =
    blobHourlyQuery.isLoading ||
    attnHourlyQuery.isLoading ||
    hvHourlyQuery.isLoading ||
    reorgHourlyQuery.isLoading ||
    reorgBounds.isLoading ||
    missedSlotHourlyQuery.isLoading ||
    proposalStatusHourlyQuery.isLoading ||
    inclusionDelayHourlyQuery.isLoading;
  const dailyLoading =
    blobDailyQuery.isLoading ||
    attnDailyQuery.isLoading ||
    hvDailyQuery.isLoading ||
    reorgDailyQuery.isLoading ||
    reorgBounds.isLoading ||
    missedSlotDailyQuery.isLoading ||
    proposalStatusDailyQuery.isLoading ||
    inclusionDelayDailyQuery.isLoading;
  const isLoading = isDaily ? dailyLoading : hourlyLoading;
  const error = isDaily
    ? (blobDailyQuery.error ??
      attnDailyQuery.error ??
      hvDailyQuery.error ??
      reorgDailyQuery.error ??
      missedSlotDailyQuery.error ??
      proposalStatusDailyQuery.error ??
      inclusionDelayDailyQuery.error)
    : (blobHourlyQuery.error ??
      attnHourlyQuery.error ??
      hvHourlyQuery.error ??
      reorgHourlyQuery.error ??
      missedSlotHourlyQuery.error ??
      proposalStatusHourlyQuery.error ??
      inclusionDelayHourlyQuery.error);

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
    if (!reorgRecords || !unifiedTimeKeys.length) return null;
    return buildReorgChartConfig(reorgRecords, unifiedTimeKeys, isDaily, reorgBounds.data);
  }, [reorgRecords, unifiedTimeKeys, isDaily, reorgBounds.data]);

  const proposalStatusChartConfig = useMemo(() => {
    if (!proposalStatusRecords?.length || !unifiedTimeKeys.length) return null;
    return buildProposalStatusChartConfig(
      proposalStatusRecords,
      missedSlotRecords ?? [],
      unifiedTimeKeys,
      isDaily,
      orphansKnownFrom,
      themeColors
    );
  }, [proposalStatusRecords, missedSlotRecords, unifiedTimeKeys, isDaily, orphansKnownFrom, themeColors]);

  const payloadStatusChartConfig = useMemo(() => {
    // Same record shape as proposal status: (time key, status, slot_count).
    const records = isDaily
      ? trimDailyRecords(
          [...(payloadStatusDailyQuery.data?.fct_block_payload_status_daily ?? [])].reverse(),
          dailyStartDate
        )
      : payloadStatusHourlyQuery.data?.fct_block_payload_status_hourly;
    if (!records?.length || !unifiedTimeKeys.length) return null;
    return buildBlockProposalStatusChartConfig(
      records as unknown as (FctBlockProposalStatusHourly | FctBlockProposalStatusDaily)[],
      unifiedTimeKeys,
      isDaily,
      themeColors
    );
  }, [
    payloadStatusDailyQuery.data,
    payloadStatusHourlyQuery.data,
    unifiedTimeKeys,
    isDaily,
    dailyStartDate,
    themeColors,
  ]);

  const inclusionDelayChartConfig = useMemo(() => {
    if (!inclusionDelayRecords?.length || !unifiedTimeKeys.length) return null;
    return buildAttestationInclusionDelayChartConfig(inclusionDelayRecords, unifiedTimeKeys, isDaily);
  }, [inclusionDelayRecords, unifiedTimeKeys, isDaily]);

  // --- Fork mark lines ---

  const chartLabels = useMemo(
    () =>
      blobChartConfig?.labels ??
      attnChartConfig?.labels ??
      hvChartConfig?.labels ??
      reorgChartConfig?.labels ??
      proposalStatusChartConfig?.labels ??
      [],
    [blobChartConfig, attnChartConfig, hvChartConfig, reorgChartConfig, proposalStatusChartConfig]
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
              { color: DATA_COLORS.emerald, label: 'Average', value: fmt(record[fields.avg]) },
              { color: DATA_COLORS.cyan, label: 'Moving Avg', value: fmt(record[fields.movingAvg]) },
              { color: DATA_COLORS.purple, label: 'Median', value: fmt(record[fields.median]), style: 'dotted' },
            ],
          },
          {
            title: 'BANDS',
            items: [
              {
                color: DATA_COLORS.amber,
                label: 'Bollinger',
                value: `${formatBand(record[fields.lowerBand] as number, record[fields.upperBand] as number)}${unit}`,
                style: 'area',
              },
              {
                color: DATA_COLORS.indigo,
                label: 'P5/P95',
                value: `${formatBand(record[fields.p05] as number, record[fields.p95] as number)}${unit}`,
                style: 'area',
              },
              {
                color: DATA_COLORS.slate,
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
      if (!reorgRecords || !unifiedTimeKeys.length) return '';

      const dataPoints = Array.isArray(params) ? params : [params];
      if (!dataPoints.length) return '';
      const firstPoint = dataPoints[0] as { dataIndex?: number };
      if (firstPoint.dataIndex === undefined) return '';
      const timeKey = unifiedTimeKeys[firstPoint.dataIndex];
      if (!timeKey || !isBucketCovered(timeKey, isDaily, reorgBounds.data)) return '';

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
            color: DEPTH_COLORS[i % DEPTH_COLORS.length] ?? '',
            label: `Depth ${depth}`,
            value: String(count),
            style: 'area' as const,
          })),
        },
      ];

      return buildTooltipHtml(dateStr, sections);
    },
    [reorgRecords, unifiedTimeKeys, isDaily, reorgBounds.data]
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
      const counts = proposalStatusCounts(proposalStatusRecords, isDaily).get(timeKey);
      if (!counts || counts.total === 0) return '';

      const dateValue = isDaily ? timeKey : Number(timeKey);
      const dateStr = formatTooltipDate(dateValue, isDaily);
      const item = (label: string, color: string, count: number): TooltipSection['items'][number] => ({
        color,
        label,
        value: `${((count / counts.total) * 100).toFixed(2)}% (${count})`,
      });
      const missedRate = missedSlotRecords?.find(r =>
        isDaily
          ? (r as FctMissedSlotRateDaily).day_start_date === timeKey
          : String((r as FctMissedSlotRateHourly).hour_start_date_time) === timeKey
      );

      const sections: TooltipSection[] = [
        {
          title: `PROPOSAL STATUS (${counts.total} slots)`,
          items: [
            item('Canonical', themeColors.success, counts.canonical),
            ...(orphansKnown(timeKey, isDaily, orphansKnownFrom)
              ? [
                  item('Missed', themeColors.danger, counts.missed),
                  item('Orphaned', themeColors.warning, counts.orphaned),
                ]
              : [item('Missed or orphaned', themeColors.muted, counts.missed + counts.orphaned)]),
          ],
        },
        ...(missedRate?.moving_avg_missed_rate != null
          ? [
              {
                title: 'WITHOUT A CANONICAL BLOCK',
                items: [
                  {
                    color: DATA_COLORS.cyan,
                    label: 'Moving Avg',
                    value: `${Math.max(0, missedRate.moving_avg_missed_rate).toFixed(2)}%`,
                  },
                ],
              },
            ]
          : []),
      ];

      return buildTooltipHtml(dateStr, sections);
    },
    [proposalStatusRecords, missedSlotRecords, unifiedTimeKeys, isDaily, orphansKnownFrom, themeColors]
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

  const bucket = isDaily ? 'UTC days' : 'UTC hours';
  const movingAvg = isDaily ? '7d moving average' : '6h moving average';

  return (
    <Container>
      <Header title="Consensus Overview" />

      {/* Time Period Selector */}
      <div className="mb-6 flex flex-wrap items-center gap-6">
        <SegmentedControl
          options={TIME_PERIOD_OPTIONS}
          value={timePeriod}
          onChange={value => navigate({ search: prev => ({ ...prev, t: value }), replace: true })}
          ariaLabel="Time window"
        />

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">Forks</span>
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
        <div className="flex flex-col gap-4">
          {/* Attestation Participation Rate */}
          {attnChartConfig && (
            <PopoutCard
              title="Attestation Participation Rate"
              subtitle={`Per slot, canonical chain, ${bucket}, ${movingAvg}`}
              anchorId="attestation-participation-chart"
              modalSize="full"
            >
              {({ inModal }) => (
                <MultiLineChart
                  series={attnChartConfig.series}
                  xAxis={{ type: 'category', labels: attnChartConfig.labels, name: 'Date' }}
                  yAxis={{ name: 'Participation Rate (%)', min: 'dataMin' }}
                  height={inModal ? 600 : 320}
                  showLegend
                  legendPosition="top"
                  enableDataZoom
                  showDataZoomSlider={inModal}
                  tooltipFormatter={attnTooltipFormatter}
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
              subtitle={`Share of slots without a canonical block, ${bucket}, ${movingAvg}`}
              anchorId="block-proposal-status-chart"
              modalSize="full"
            >
              {({ inModal }) => (
                <MultiLineChart
                  series={proposalStatusChartConfig.series}
                  xAxis={{ type: 'category', labels: proposalStatusChartConfig.labels, name: 'Date' }}
                  yAxis={{ name: 'Slots (%)', min: 0 }}
                  height={inModal ? 600 : 200}
                  showLegend
                  legendPosition="top"
                  enableDataZoom
                  showDataZoomSlider={inModal}
                  tooltipFormatter={proposalStatusTooltipFormatter}
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
              subtitle={`Per slot, canonical chain, ${bucket}, ${movingAvg}`}
              anchorId="head-vote-correctness-chart"
              modalSize="full"
            >
              {({ inModal }) => (
                <MultiLineChart
                  series={hvChartConfig.series}
                  xAxis={{ type: 'category', labels: hvChartConfig.labels, name: 'Date' }}
                  yAxis={{ name: 'Head Vote Rate (%)', min: 'dataMin' }}
                  height={inModal ? 600 : 200}
                  showLegend
                  legendPosition="top"
                  enableDataZoom
                  showDataZoomSlider={inModal}
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
              subtitle={`Runs of orphaned slots by depth, ${bucket}`}
              anchorId="reorg-chart"
              modalSize="full"
            >
              {({ inModal }) => (
                <MultiLineChart
                  series={reorgChartConfig.series}
                  xAxis={{ type: 'category', labels: reorgChartConfig.labels, name: 'Date' }}
                  yAxis={{ name: 'Reorg Count', min: 'dataMin' }}
                  height={inModal ? 600 : 200}
                  showLegend
                  legendPosition="top"
                  enableDataZoom
                  showDataZoomSlider={inModal}
                  tooltipFormatter={reorgTooltipFormatter}
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
              subtitle={`Per slot, mean over its validators, canonical chain, ${bucket}, ${movingAvg}`}
              anchorId="inclusion-delay-chart"
              modalSize="full"
            >
              {({ inModal }) => (
                <MultiLineChart
                  series={inclusionDelayChartConfig.series}
                  xAxis={{ type: 'category', labels: inclusionDelayChartConfig.labels, name: 'Date' }}
                  yAxis={{ name: 'Inclusion Delay (slots)', min: 'dataMin' }}
                  height={inModal ? 600 : 200}
                  showLegend
                  legendPosition="top"
                  enableDataZoom
                  showDataZoomSlider={inModal}
                  tooltipFormatter={inclusionDelayTooltipFormatter}
                  markLines={showAnnotations ? forkMarkLines : []}
                  syncGroup={inModal ? undefined : 'consensus-overview'}
                />
              )}
            </PopoutCard>
          )}

          {/* Blob Count */}
          {blobChartConfig && (
            <PopoutCard
              title="Blob Count"
              subtitle={`Per canonical block, ${bucket}, ${movingAvg}`}
              anchorId="blob-count-chart"
              modalSize="full"
            >
              {({ inModal }) => (
                <MultiLineChart
                  series={blobChartConfig.series}
                  xAxis={{ type: 'category', labels: blobChartConfig.labels, name: 'Date' }}
                  yAxis={{ name: 'Blobs', min: 'dataMin' }}
                  height={inModal ? 600 : 200}
                  showLegend
                  legendPosition="top"
                  enableDataZoom
                  showDataZoomSlider={inModal}
                  tooltipFormatter={blobTooltipFormatter}
                  markLines={showAnnotations ? forkMarkLines : []}
                  syncGroup={inModal ? undefined : 'consensus-overview'}
                />
              )}
            </PopoutCard>
          )}

          {/* Gloas (ePBS): payload delivery rate judged by the PTC */}
          {payloadStatusChartConfig && (
            <PopoutCard
              title="Payload Delivery (ePBS)"
              subtitle={`Share of blocks by PTC vote, ${bucket}`}
              anchorId="payload-delivery-chart"
              modalSize="full"
            >
              {({ inModal }) => (
                <MultiLineChart
                  series={payloadStatusChartConfig.series}
                  xAxis={{ type: 'category', labels: payloadStatusChartConfig.labels, name: 'Date' }}
                  yAxis={{ name: 'Rate (%)', min: 'dataMin' }}
                  height={inModal ? 600 : 200}
                  showLegend
                  legendPosition="top"
                  enableDataZoom
                  showDataZoomSlider={inModal}
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
