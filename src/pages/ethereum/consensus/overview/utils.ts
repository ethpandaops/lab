import { createBandSeries, createStatisticSeries } from '@/components/Charts/MultiLine';
import type { SeriesData } from '@/components/Charts/MultiLine';
import type {
  FctBlobCountByHourly,
  FctBlobCountByDaily,
  FctAttestationParticipationRateHourly,
  FctAttestationParticipationRateDaily,
  FctHeadVoteCorrectnessRateHourly,
  FctHeadVoteCorrectnessRateDaily,
  FctReorgByHourly,
  FctReorgByDaily,
  FctMissedSlotRateHourly,
  FctMissedSlotRateDaily,
  FctBlockProposalStatusHourly,
  FctBlockProposalStatusDaily,
  FctAttestationInclusionDelayHourly,
  FctAttestationInclusionDelayDaily,
  FctProposerRewardHourly,
  FctProposerRewardDaily,
} from '@/api/types.gen';
import { formatDailyDate, formatHourlyDate } from '@/pages/ethereum/execution/overview/utils';
import type { ChartConfig } from './constants';

// Re-export shared utilities from execution overview
export {
  fillTimeKeys,
  formatHourlyDate,
  formatDailyDate,
  formatTooltipDate,
  buildTooltipHtml,
  type TooltipItem,
  type TooltipSection,
} from '@/pages/ethereum/execution/overview/utils';

/** Formats a band range */
export function formatBand(lower: number | undefined, upper: number | undefined): string {
  const l = lower ?? 0;
  const u = upper ?? 0;
  return `${l.toFixed(2)} – ${u.toFixed(2)}`;
}

/** @deprecated Use formatBand instead */
export const formatBlobBand = formatBand;

/** Builds chart series config from blob count records aligned to unified time keys */
export function buildBlobCountChartConfig(
  records: (FctBlobCountByHourly | FctBlobCountByDaily)[],
  unifiedKeys: string[],
  isDaily: boolean,
  maxBlobValues?: (number | null)[]
): ChartConfig {
  const byKey = new Map<string, FctBlobCountByHourly | FctBlobCountByDaily>();
  for (const r of records) {
    const key = isDaily
      ? ((r as FctBlobCountByDaily).day_start_date ?? '')
      : String((r as FctBlobCountByHourly).hour_start_date_time ?? '');
    byKey.set(key, r);
  }

  const labels = unifiedKeys.map(k => (isDaily ? formatDailyDate(k) : formatHourlyDate(Number(k))));

  const minValues = unifiedKeys.map(k => {
    const r = byKey.get(k);
    return r ? Math.max(0, r.min_blob_count ?? 0) : null;
  });
  const maxValues = unifiedKeys.map(k => {
    const r = byKey.get(k);
    return r ? Math.max(0, r.max_blob_count ?? 0) : null;
  });
  const p5Values = unifiedKeys.map(k => {
    const r = byKey.get(k);
    return r ? Math.max(0, r.p05_blob_count ?? 0) : null;
  });
  const p95Values = unifiedKeys.map(k => {
    const r = byKey.get(k);
    return r ? Math.max(0, r.p95_blob_count ?? 0) : null;
  });
  const lowerBandValues = unifiedKeys.map(k => {
    const r = byKey.get(k);
    return r ? Math.max(0, r.lower_band_blob_count ?? 0) : null;
  });
  const upperBandValues = unifiedKeys.map(k => {
    const r = byKey.get(k);
    return r ? Math.max(0, r.upper_band_blob_count ?? 0) : null;
  });
  const avgValues = unifiedKeys.map(k => {
    const r = byKey.get(k);
    return r ? Math.max(0, r.avg_blob_count ?? 0) : null;
  });
  const medianValues = unifiedKeys.map(k => {
    const r = byKey.get(k);
    return r ? Math.max(0, r.p50_blob_count ?? 0) : null;
  });
  const movingAvgValues = unifiedKeys.map(k => {
    const r = byKey.get(k);
    return r ? Math.max(0, r.moving_avg_blob_count ?? 0) : null;
  });

  const series: SeriesData[] = [
    createStatisticSeries('Average', avgValues, {
      color: '#10b981',
      lineWidth: 2.5,
      group: 'Statistics',
    }),
    createStatisticSeries('Moving Avg', movingAvgValues, {
      color: '#06b6d4',
      lineWidth: 2,
      group: 'Statistics',
    }),
    createStatisticSeries('Median', medianValues, {
      color: '#a855f7',
      lineWidth: 1.5,
      lineStyle: 'dotted',
      group: 'Statistics',
    }),
    ...createBandSeries('Bollinger', 'blob-bollinger', lowerBandValues, upperBandValues, {
      color: '#f59e0b',
      opacity: 0.15,
      group: 'Bands',
      initiallyVisible: false,
    }),
    ...createBandSeries('P5/P95', 'blob-percentile', p5Values, p95Values, {
      color: '#6366f1',
      opacity: 0.1,
      group: 'Bands',
    }),
    ...createBandSeries('Min/Max', 'blob-minmax', minValues, maxValues, {
      color: '#64748b',
      opacity: 0.06,
      group: 'Bands',
    }),
  ];

  if (maxBlobValues?.length) {
    series.push(
      createStatisticSeries('Max Blobs', maxBlobValues, {
        color: '#ef4444',
        lineWidth: 2,
        lineStyle: 'dashed',
        group: 'Statistics',
      })
    );
  }

  return { labels, series };
}

/** Builds chart series config from attestation participation rate records aligned to unified time keys */
export function buildAttestationParticipationChartConfig(
  records: (FctAttestationParticipationRateHourly | FctAttestationParticipationRateDaily)[],
  unifiedKeys: string[],
  isDaily: boolean
): ChartConfig {
  const byKey = new Map<string, FctAttestationParticipationRateHourly | FctAttestationParticipationRateDaily>();
  for (const r of records) {
    const key = isDaily
      ? ((r as FctAttestationParticipationRateDaily).day_start_date ?? '')
      : String((r as FctAttestationParticipationRateHourly).hour_start_date_time ?? '');
    byKey.set(key, r);
  }

  const labels = unifiedKeys.map(k => (isDaily ? formatDailyDate(k) : formatHourlyDate(Number(k))));

  const getValue = (
    k: string,
    field: keyof FctAttestationParticipationRateHourly & keyof FctAttestationParticipationRateDaily
  ) => {
    const r = byKey.get(k);
    return r ? Math.max(0, (r as Record<string, number>)[field] ?? 0) : null;
  };

  const avgValues = unifiedKeys.map(k => getValue(k, 'avg_participation_rate'));
  const movingAvgValues = unifiedKeys.map(k => getValue(k, 'moving_avg_participation_rate'));
  const medianValues = unifiedKeys.map(k => getValue(k, 'p50_participation_rate'));
  const lowerBandValues = unifiedKeys.map(k => getValue(k, 'lower_band_participation_rate'));
  const upperBandValues = unifiedKeys.map(k => getValue(k, 'upper_band_participation_rate'));
  const p5Values = unifiedKeys.map(k => getValue(k, 'p05_participation_rate'));
  const p95Values = unifiedKeys.map(k => getValue(k, 'p95_participation_rate'));
  const minValues = unifiedKeys.map(k => getValue(k, 'min_participation_rate'));
  const maxValues = unifiedKeys.map(k => getValue(k, 'max_participation_rate'));

  return {
    labels,
    series: [
      createStatisticSeries('Average', avgValues, {
        color: '#10b981',
        lineWidth: 2.5,
        group: 'Statistics',
      }),
      createStatisticSeries('Moving Avg', movingAvgValues, {
        color: '#06b6d4',
        lineWidth: 2,
        group: 'Statistics',
      }),
      createStatisticSeries('Median', medianValues, {
        color: '#a855f7',
        lineWidth: 1.5,
        lineStyle: 'dotted',
        group: 'Statistics',
      }),
      ...createBandSeries('Bollinger', 'attn-bollinger', lowerBandValues, upperBandValues, {
        color: '#f59e0b',
        opacity: 0.15,
        group: 'Bands',
        initiallyVisible: false,
      }),
      ...createBandSeries('P5/P95', 'attn-percentile', p5Values, p95Values, {
        color: '#6366f1',
        opacity: 0.1,
        group: 'Bands',
      }),
      ...createBandSeries('Min/Max', 'attn-minmax', minValues, maxValues, {
        color: '#64748b',
        opacity: 0.06,
        group: 'Bands',
      }),
    ],
  };
}

/** Builds chart series config from head vote correctness rate records */
export function buildHeadVoteCorrectnessChartConfig(
  records: (FctHeadVoteCorrectnessRateHourly | FctHeadVoteCorrectnessRateDaily)[],
  unifiedKeys: string[],
  isDaily: boolean
): ChartConfig {
  const byKey = new Map<string, FctHeadVoteCorrectnessRateHourly | FctHeadVoteCorrectnessRateDaily>();
  for (const r of records) {
    const key = isDaily
      ? ((r as FctHeadVoteCorrectnessRateDaily).day_start_date ?? '')
      : String((r as FctHeadVoteCorrectnessRateHourly).hour_start_date_time ?? '');
    byKey.set(key, r);
  }

  const labels = unifiedKeys.map(k => (isDaily ? formatDailyDate(k) : formatHourlyDate(Number(k))));

  const getValue = (k: string, field: string) => {
    const r = byKey.get(k);
    return r ? Math.max(0, (r as Record<string, number>)[field] ?? 0) : null;
  };

  return {
    labels,
    series: [
      createStatisticSeries(
        'Average',
        unifiedKeys.map(k => getValue(k, 'avg_head_vote_rate')),
        {
          color: '#10b981',
          lineWidth: 2.5,
          group: 'Statistics',
        }
      ),
      createStatisticSeries(
        'Moving Avg',
        unifiedKeys.map(k => getValue(k, 'moving_avg_head_vote_rate')),
        {
          color: '#06b6d4',
          lineWidth: 2,
          group: 'Statistics',
        }
      ),
      createStatisticSeries(
        'Median',
        unifiedKeys.map(k => getValue(k, 'p50_head_vote_rate')),
        {
          color: '#a855f7',
          lineWidth: 1.5,
          lineStyle: 'dotted',
          group: 'Statistics',
        }
      ),
      ...createBandSeries(
        'Bollinger',
        'hv-bollinger',
        unifiedKeys.map(k => getValue(k, 'lower_band_head_vote_rate')),
        unifiedKeys.map(k => getValue(k, 'upper_band_head_vote_rate')),
        { color: '#f59e0b', opacity: 0.15, group: 'Bands', initiallyVisible: false }
      ),
      ...createBandSeries(
        'P5/P95',
        'hv-percentile',
        unifiedKeys.map(k => getValue(k, 'p05_head_vote_rate')),
        unifiedKeys.map(k => getValue(k, 'p95_head_vote_rate')),
        { color: '#6366f1', opacity: 0.1, group: 'Bands' }
      ),
      ...createBandSeries(
        'Min/Max',
        'hv-minmax',
        unifiedKeys.map(k => getValue(k, 'min_head_vote_rate')),
        unifiedKeys.map(k => getValue(k, 'max_head_vote_rate')),
        { color: '#64748b', opacity: 0.06, group: 'Bands' }
      ),
    ],
  };
}

const DEPTH_COLORS = ['#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#8b5cf6', '#ec4899'];

/** Builds stacked area chart config from reorg records grouped by depth */
export function buildReorgChartConfig(
  records: (FctReorgByHourly | FctReorgByDaily)[],
  unifiedKeys: string[],
  isDaily: boolean
): ChartConfig {
  const labels = unifiedKeys.map(k => (isDaily ? formatDailyDate(k) : formatHourlyDate(Number(k))));

  // Group records by time key, then by depth
  const byKeyAndDepth = new Map<string, Map<number, number>>();
  const allDepths = new Set<number>();

  for (const r of records) {
    const key = isDaily
      ? ((r as FctReorgByDaily).day_start_date ?? '')
      : String((r as FctReorgByHourly).hour_start_date_time ?? '');
    const depth = r.depth ?? 1;
    const count = r.reorg_count ?? 0;

    allDepths.add(depth);
    if (!byKeyAndDepth.has(key)) byKeyAndDepth.set(key, new Map());
    byKeyAndDepth.get(key)!.set(depth, count);
  }

  const sortedDepths = [...allDepths].sort((a, b) => a - b);

  const series: SeriesData[] = sortedDepths.map((depth, i) => ({
    name: `Depth ${depth}`,
    data: unifiedKeys.map(k => byKeyAndDepth.get(k)?.get(depth) ?? 0),
    color: DEPTH_COLORS[i % DEPTH_COLORS.length],
    showArea: true,
    stack: 'reorgs',
    group: 'Depth',
  }));

  return { labels, series };
}

/** Builds chart config for missed slot rate (simple: rate + moving avg) */
export function buildMissedSlotRateChartConfig(
  records: (FctMissedSlotRateHourly | FctMissedSlotRateDaily)[],
  unifiedKeys: string[],
  isDaily: boolean
): ChartConfig {
  const byKey = new Map<string, FctMissedSlotRateHourly | FctMissedSlotRateDaily>();
  for (const r of records) {
    const key = isDaily
      ? ((r as FctMissedSlotRateDaily).day_start_date ?? '')
      : String((r as FctMissedSlotRateHourly).hour_start_date_time ?? '');
    byKey.set(key, r);
  }

  const labels = unifiedKeys.map(k => (isDaily ? formatDailyDate(k) : formatHourlyDate(Number(k))));

  const rateValues = unifiedKeys.map(k => {
    const r = byKey.get(k);
    return r?.missed_rate != null ? Math.max(0, r.missed_rate) : null;
  });
  const movingAvgValues = unifiedKeys.map(k => {
    const r = byKey.get(k);
    return r?.moving_avg_missed_rate != null ? Math.max(0, r.moving_avg_missed_rate) : null;
  });

  return {
    labels,
    series: [
      createStatisticSeries('Missed Rate', rateValues, {
        color: '#f43f5e',
        lineWidth: 2.5,
        group: 'Statistics',
      }),
      createStatisticSeries('Moving Avg', movingAvgValues, {
        color: '#06b6d4',
        lineWidth: 2,
        group: 'Statistics',
      }),
    ],
  };
}

const STATUS_COLORS: Record<string, string> = {
  canonical: '#22c55e',
  orphaned: '#f59e0b',
  missed: '#f43f5e',
};

/** Builds stacked area chart config from block proposal status records grouped by status */
export function buildBlockProposalStatusChartConfig(
  records: (FctBlockProposalStatusHourly | FctBlockProposalStatusDaily)[],
  unifiedKeys: string[],
  isDaily: boolean
): ChartConfig {
  const labels = unifiedKeys.map(k => (isDaily ? formatDailyDate(k) : formatHourlyDate(Number(k))));

  const byKeyAndStatus = new Map<string, Map<string, number>>();
  const allStatuses = new Set<string>();

  for (const r of records) {
    const key = isDaily
      ? ((r as FctBlockProposalStatusDaily).day_start_date ?? '')
      : String((r as FctBlockProposalStatusHourly).hour_start_date_time ?? '');
    const status = r.status ?? 'unknown';
    const count = r.slot_count ?? 0;

    allStatuses.add(status);
    if (!byKeyAndStatus.has(key)) byKeyAndStatus.set(key, new Map());
    byKeyAndStatus.get(key)!.set(status, count);
  }

  const sortedStatuses = [...allStatuses].sort();

  const series: SeriesData[] = sortedStatuses.map(status => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    data: unifiedKeys.map(k => byKeyAndStatus.get(k)?.get(status) ?? 0),
    color: STATUS_COLORS[status] ?? '#94a3b8',
    showArea: true,
    stack: 'proposal-status',
    group: 'Status',
  }));

  return { labels, series };
}

/** Builds chart config for attestation inclusion delay (full statistical) */
export function buildAttestationInclusionDelayChartConfig(
  records: (FctAttestationInclusionDelayHourly | FctAttestationInclusionDelayDaily)[],
  unifiedKeys: string[],
  isDaily: boolean
): ChartConfig {
  const byKey = new Map<string, FctAttestationInclusionDelayHourly | FctAttestationInclusionDelayDaily>();
  for (const r of records) {
    const key = isDaily
      ? ((r as FctAttestationInclusionDelayDaily).day_start_date ?? '')
      : String((r as FctAttestationInclusionDelayHourly).hour_start_date_time ?? '');
    byKey.set(key, r);
  }

  const labels = unifiedKeys.map(k => (isDaily ? formatDailyDate(k) : formatHourlyDate(Number(k))));

  const getValue = (k: string, field: string) => {
    const r = byKey.get(k);
    return r ? Math.max(0, (r as Record<string, number>)[field] ?? 0) : null;
  };

  return {
    labels,
    series: [
      createStatisticSeries(
        'Average',
        unifiedKeys.map(k => getValue(k, 'avg_inclusion_delay')),
        {
          color: '#10b981',
          lineWidth: 2.5,
          group: 'Statistics',
        }
      ),
      createStatisticSeries(
        'Moving Avg',
        unifiedKeys.map(k => getValue(k, 'moving_avg_inclusion_delay')),
        {
          color: '#06b6d4',
          lineWidth: 2,
          group: 'Statistics',
        }
      ),
      createStatisticSeries(
        'Median',
        unifiedKeys.map(k => getValue(k, 'p50_inclusion_delay')),
        {
          color: '#a855f7',
          lineWidth: 1.5,
          lineStyle: 'dotted',
          group: 'Statistics',
        }
      ),
      ...createBandSeries(
        'Bollinger',
        'id-bollinger',
        unifiedKeys.map(k => getValue(k, 'lower_band_inclusion_delay')),
        unifiedKeys.map(k => getValue(k, 'upper_band_inclusion_delay')),
        { color: '#f59e0b', opacity: 0.15, group: 'Bands', initiallyVisible: false }
      ),
      ...createBandSeries(
        'P5/P95',
        'id-percentile',
        unifiedKeys.map(k => getValue(k, 'p05_inclusion_delay')),
        unifiedKeys.map(k => getValue(k, 'p95_inclusion_delay')),
        { color: '#6366f1', opacity: 0.1, group: 'Bands' }
      ),
      ...createBandSeries(
        'Min/Max',
        'id-minmax',
        unifiedKeys.map(k => getValue(k, 'min_inclusion_delay')),
        unifiedKeys.map(k => getValue(k, 'max_inclusion_delay')),
        { color: '#64748b', opacity: 0.06, group: 'Bands' }
      ),
    ],
  };
}

/** Builds chart config for proposer reward / MEV (full statistical) */
export function buildProposerRewardChartConfig(
  records: (FctProposerRewardHourly | FctProposerRewardDaily)[],
  unifiedKeys: string[],
  isDaily: boolean
): ChartConfig {
  const byKey = new Map<string, FctProposerRewardHourly | FctProposerRewardDaily>();
  for (const r of records) {
    const key = isDaily
      ? ((r as FctProposerRewardDaily).day_start_date ?? '')
      : String((r as FctProposerRewardHourly).hour_start_date_time ?? '');
    byKey.set(key, r);
  }

  const labels = unifiedKeys.map(k => (isDaily ? formatDailyDate(k) : formatHourlyDate(Number(k))));

  const getValue = (k: string, field: string) => {
    const r = byKey.get(k);
    return r ? Math.max(0, (r as Record<string, number>)[field] ?? 0) : null;
  };

  return {
    labels,
    series: [
      createStatisticSeries(
        'Average',
        unifiedKeys.map(k => getValue(k, 'avg_reward_eth')),
        {
          color: '#10b981',
          lineWidth: 2.5,
          group: 'Statistics',
        }
      ),
      createStatisticSeries(
        'Moving Avg',
        unifiedKeys.map(k => getValue(k, 'moving_avg_reward_eth')),
        {
          color: '#06b6d4',
          lineWidth: 2,
          group: 'Statistics',
        }
      ),
      createStatisticSeries(
        'Median',
        unifiedKeys.map(k => getValue(k, 'p50_reward_eth')),
        {
          color: '#a855f7',
          lineWidth: 1.5,
          lineStyle: 'dotted',
          group: 'Statistics',
        }
      ),
      ...createBandSeries(
        'Bollinger',
        'pr-bollinger',
        unifiedKeys.map(k => getValue(k, 'lower_band_reward_eth')),
        unifiedKeys.map(k => getValue(k, 'upper_band_reward_eth')),
        { color: '#f59e0b', opacity: 0.15, group: 'Bands', initiallyVisible: false }
      ),
      ...createBandSeries(
        'P5/P95',
        'pr-percentile',
        unifiedKeys.map(k => getValue(k, 'p05_reward_eth')),
        unifiedKeys.map(k => getValue(k, 'p95_reward_eth')),
        { color: '#6366f1', opacity: 0.1, group: 'Bands' }
      ),
      ...createBandSeries(
        'Min/Max',
        'pr-minmax',
        unifiedKeys.map(k => getValue(k, 'min_reward_eth')),
        unifiedKeys.map(k => getValue(k, 'max_reward_eth')),
        { color: '#64748b', opacity: 0.06, group: 'Bands' }
      ),
    ],
  };
}
