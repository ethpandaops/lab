import { createBandSeries, createStatisticSeries, type SeriesData } from '@/components/Charts/MultiLine';
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
import { GAS_BANDS, type ChartConfig } from './constants';

// ============================================================================
// Time Formatting Utilities
// ============================================================================

/**
 * Fills gaps in time keys with all intermediate time points.
 * Ensures continuous x-axis rendering even when data has gaps.
 */
export function fillTimeKeys(keys: string[], isDaily: boolean): string[] {
  if (keys.length === 0) return [];

  if (isDaily) {
    // Keys are YYYY-MM-DD strings
    const minDate = new Date(keys[0] + 'T00:00:00Z');
    const maxDate = new Date(keys[keys.length - 1] + 'T00:00:00Z');
    const result: string[] = [];

    const current = new Date(minDate);
    while (current <= maxDate) {
      result.push(current.toISOString().slice(0, 10)); // YYYY-MM-DD
      current.setUTCDate(current.getUTCDate() + 1);
    }
    return result;
  } else {
    // Keys are Unix timestamps as strings
    const timestamps = keys.map(k => parseInt(k, 10)).filter(n => !isNaN(n));
    if (timestamps.length === 0) return [];

    const min = Math.min(...timestamps);
    const max = Math.max(...timestamps);
    const result: string[] = [];

    const HOUR_IN_SECONDS = 3600;
    for (let ts = min; ts <= max; ts += HOUR_IN_SECONDS) {
      result.push(String(ts));
    }
    return result;
  }
}

/** Formats a Unix timestamp to a short date string (e.g., "Jan 15 '24") */
export function formatHourlyDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const day = date.getDate();
  const year = date.getFullYear().toString().slice(-2);
  return `${month} ${day} '${year}`;
}

/** Formats a date string (YYYY-MM-DD) to a short date string (e.g., "Jan 15 '24") */
export function formatDailyDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const day = date.getDate();
  const year = date.getFullYear().toString().slice(-2);
  return `${month} ${day} '${year}`;
}

/** Formats a date for tooltip display with more detail */
export function formatTooltipDate(value: number | string, isDaily: boolean): string {
  if (isDaily) {
    const date = new Date((value as string) + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
  const date = new Date((value as number) * 1000);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
  });
}

// ============================================================================
// Gas Band Utilities
// ============================================================================

/** Gets the chunk index for a gas limit band */
export function getChunkIndex(gasLimitBand: number): number {
  for (let i = 0; i < GAS_BANDS.length; i++) {
    if (gasLimitBand <= GAS_BANDS[i].max) {
      return i;
    }
  }
  return GAS_BANDS.length - 1;
}

/** Gets the display label for a chunk index */
export function getChunkLabel(chunkIndex: number): string {
  return GAS_BANDS[chunkIndex]?.label ?? 'Unknown';
}

// ============================================================================
// Tooltip Builder Utilities
// ============================================================================

/** Item configuration for tooltip rows */
export interface TooltipItem {
  color: string;
  label: string;
  value: string;
  /** Visual style indicator: 'line' (default), 'dashed', 'dotted', 'area' */
  style?: 'line' | 'dashed' | 'dotted' | 'area';
}

/** Section configuration for tooltip */
export interface TooltipSection {
  title: string;
  items: TooltipItem[];
}

/** Builds a single tooltip row HTML */
function buildTooltipRow(item: TooltipItem, fontSize: number = 12): string {
  let indicator: string;
  switch (item.style) {
    case 'dashed':
      indicator = `<span style="width: 10px; height: 0; border-top: 2px dashed ${item.color};"></span>`;
      break;
    case 'dotted':
      indicator = `<span style="width: 10px; height: 3px; border-radius: 1px; border-top: 2px dotted ${item.color};"></span>`;
      break;
    case 'area':
      indicator = `<span style="width: 10px; height: 6px; border-radius: 1px; background: ${item.color}; opacity: 0.5;"></span>`;
      break;
    default:
      indicator = `<span style="width: 10px; height: 3px; border-radius: 1px; background: ${item.color};"></span>`;
  }

  return `<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px; font-size: ${fontSize}px;">
    ${indicator}
    <span>${item.label}</span>
    <span style="margin-left: auto; font-weight: 600;">${item.value}</span>
  </div>`;
}

/** Builds complete tooltip HTML from sections */
export function buildTooltipHtml(dateStr: string, sections: TooltipSection[]): string {
  let html = `<div style="margin-bottom: 10px; font-weight: 600; font-size: 13px;">${dateStr}</div>`;

  sections.forEach((section, idx) => {
    if (idx > 0) {
      html += `<div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(128,128,128,0.3);">`;
    }
    html += `<div style="margin-bottom: 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #9ca3af;">${section.title}</div>`;

    section.items.forEach(item => {
      const fontSize = section.title === 'BANDS' || section.title === 'Gas Limits' ? 12 : 12;
      const itemHtml = buildTooltipRow(item, fontSize);
      // For band items, use muted text color
      if (section.title === 'BANDS') {
        html += itemHtml
          .replace(/<span>([^<]+)<\/span>/, '<span style="color: #d1d5db;">$1</span>')
          .replace(
            /<span style="margin-left: auto; font-weight: 600;">/,
            '<span style="margin-left: auto; color: #d1d5db;">'
          );
      } else {
        html += itemHtml;
      }
    });

    if (idx > 0) {
      html += `</div>`;
    }
  });

  return html;
}

// ============================================================================
// Number Formatting Utilities
// ============================================================================

/** Formats a number with K/M suffix */
export function formatCompact(val: number): string {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(0)}K`;
  return val.toFixed(0);
}

/** Formats large gas numbers with M suffix */
export function formatGas(val: number): string {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(0)}K`;
  return val.toFixed(0);
}

/** Formats cumulative gas with E/P/T/B/M suffixes */
export function formatCumulativeGas(val: number): string {
  if (val >= 1e18) return `${(val / 1e18).toFixed(2)}E`;
  if (val >= 1e15) return `${(val / 1e15).toFixed(2)}P`;
  if (val >= 1e12) return `${(val / 1e12).toFixed(2)}T`;
  if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(2)}B`;
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M`;
  return val.toLocaleString();
}

/** Formats a gas band range (handles negative values) */
export function formatGasBand(lower: number | undefined, upper: number | undefined): string {
  const l = lower ?? 0;
  const u = upper ?? 0;
  const formatSignedGas = (val: number): string => {
    const absVal = Math.abs(val);
    const sign = val < 0 ? '-' : '';
    if (absVal >= 1_000_000) return `${sign}${(absVal / 1_000_000).toFixed(1)}M`;
    if (absVal >= 1_000) return `${sign}${(absVal / 1_000).toFixed(0)}K`;
    return val.toFixed(0);
  };
  return `${formatSignedGas(l)} – ${formatSignedGas(u)}`;
}

/** Formats a TPS band range */
export function formatTpsBand(lower: number | undefined, upper: number | undefined): string {
  const l = lower ?? 0;
  const u = upper ?? 0;
  return `${l.toFixed(4)} – ${u.toFixed(4)}`;
}

/** Formats big numbers (billions) */
export function formatBigNum(n: number | bigint | undefined): string {
  const num = Number(n ?? 0);
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  return num.toLocaleString();
}

// ============================================================================
// Chart Config Builders
// ============================================================================

/** Builds chart series config from TPS records aligned to unified time keys */
export function buildTpsChartConfig(
  records: (FctExecutionTpsHourly | FctExecutionTpsDaily)[],
  unifiedKeys: string[],
  isDaily: boolean
): ChartConfig {
  const byKey = new Map<string, FctExecutionTpsHourly | FctExecutionTpsDaily>();
  for (const r of records) {
    const key = isDaily
      ? ((r as FctExecutionTpsDaily).day_start_date ?? '')
      : String((r as FctExecutionTpsHourly).hour_start_date_time ?? '');
    byKey.set(key, r);
  }

  const labels = unifiedKeys.map(k => (isDaily ? formatDailyDate(k) : formatHourlyDate(Number(k))));

  const minValues = unifiedKeys.map(k => {
    const r = byKey.get(k);
    return r ? Math.max(0, r.min_tps ?? 0) : null;
  });
  const maxValues = unifiedKeys.map(k => {
    const r = byKey.get(k);
    return r ? Math.max(0, r.max_tps ?? 0) : null;
  });
  const p5Values = unifiedKeys.map(k => {
    const r = byKey.get(k);
    return r ? Math.max(0, r.p05_tps ?? 0) : null;
  });
  const p95Values = unifiedKeys.map(k => {
    const r = byKey.get(k);
    return r ? Math.max(0, r.p95_tps ?? 0) : null;
  });
  const lowerBandValues = unifiedKeys.map(k => {
    const r = byKey.get(k);
    return r ? Math.max(0, r.lower_band_tps ?? 0) : null;
  });
  const upperBandValues = unifiedKeys.map(k => {
    const r = byKey.get(k);
    return r ? Math.max(0, r.upper_band_tps ?? 0) : null;
  });
  const avgValues = unifiedKeys.map(k => {
    const r = byKey.get(k);
    return r ? Math.max(0, r.avg_tps ?? 0) : null;
  });
  const medianValues = unifiedKeys.map(k => {
    const r = byKey.get(k);
    return r ? Math.max(0, r.p50_tps ?? 0) : null;
  });
  const movingAvgValues = unifiedKeys.map(k => {
    const r = byKey.get(k);
    return r ? Math.max(0, r.moving_avg_tps ?? 0) : null;
  });

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
      ...createBandSeries('Bollinger', 'bollinger', lowerBandValues, upperBandValues, {
        color: '#f59e0b',
        opacity: 0.15,
        group: 'Bands',
        initiallyVisible: false,
      }),
      ...createBandSeries('P5/P95', 'percentile', p5Values, p95Values, {
        color: '#6366f1',
        opacity: 0.1,
        group: 'Bands',
      }),
      ...createBandSeries('Min/Max', 'minmax', minValues, maxValues, {
        color: '#64748b',
        opacity: 0.06,
        group: 'Bands',
      }),
    ],
  };
}

/** Builds chart series config from Gas Used records aligned to unified time keys */
export function buildGasChartConfig(
  records: (FctExecutionGasUsedHourly | FctExecutionGasUsedDaily)[],
  unifiedKeys: string[],
  isDaily: boolean,
  gasLimitRecords: (FctExecutionGasLimitHourly | FctExecutionGasLimitDaily)[] | undefined
): ChartConfig {
  const byKey = new Map<string, FctExecutionGasUsedHourly | FctExecutionGasUsedDaily>();
  for (const r of records) {
    const key = isDaily
      ? ((r as FctExecutionGasUsedDaily).day_start_date ?? '')
      : String((r as FctExecutionGasUsedHourly).hour_start_date_time ?? '');
    byKey.set(key, r);
  }

  const labels = unifiedKeys.map(k => (isDaily ? formatDailyDate(k) : formatHourlyDate(Number(k))));

  const minValues = unifiedKeys.map(k => {
    const r = byKey.get(k);
    return r ? Math.max(0, r.min_gas_used ?? 0) : null;
  });
  const maxValues = unifiedKeys.map(k => {
    const r = byKey.get(k);
    return r ? Math.max(0, r.max_gas_used ?? 0) : null;
  });
  const p5Values = unifiedKeys.map(k => {
    const r = byKey.get(k);
    return r ? Math.max(0, r.p05_gas_used ?? 0) : null;
  });
  const p95Values = unifiedKeys.map(k => {
    const r = byKey.get(k);
    return r ? Math.max(0, r.p95_gas_used ?? 0) : null;
  });
  const lowerBandValues = unifiedKeys.map(k => {
    const r = byKey.get(k);
    return r ? Math.max(0, r.lower_band_gas_used ?? 0) : null;
  });
  const upperBandValues = unifiedKeys.map(k => {
    const r = byKey.get(k);
    return r ? Math.max(0, r.upper_band_gas_used ?? 0) : null;
  });
  const avgValues = unifiedKeys.map(k => {
    const r = byKey.get(k);
    return r ? Math.max(0, r.avg_gas_used ?? 0) : null;
  });
  const medianValues = unifiedKeys.map(k => {
    const r = byKey.get(k);
    return r ? Math.max(0, r.p50_gas_used ?? 0) : null;
  });
  const movingAvgValues = unifiedKeys.map(k => {
    const r = byKey.get(k);
    return r ? Math.max(0, r.moving_avg_gas_used ?? 0) : null;
  });
  const cumulativeValues = unifiedKeys.map(k => {
    const r = byKey.get(k);
    return r ? Number(r.cumulative_gas_used ?? 0) : null;
  });

  const gasLimitByKey = new Map<string, number>();
  if (gasLimitRecords) {
    for (const r of gasLimitRecords) {
      const key = isDaily
        ? ((r as FctExecutionGasLimitDaily).day_start_date ?? '')
        : String((r as FctExecutionGasLimitHourly).hour_start_date_time ?? '');
      gasLimitByKey.set(key, r.max_gas_limit ?? 0);
    }
  }
  const gasLimitValues = unifiedKeys.map(k => gasLimitByKey.get(k) ?? null);

  const series: ChartConfig['series'] = [
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
    {
      name: 'Cumulative',
      data: cumulativeValues,
      color: 'rgba(156, 163, 175, 0.6)',
      lineWidth: 1.5,
      yAxisIndex: 1,
      group: 'Statistics',
    },
  ];

  if (gasLimitRecords?.length) {
    series.push(
      createStatisticSeries('Gas Limit', gasLimitValues as number[], {
        color: '#ef4444',
        lineWidth: 2,
        lineStyle: 'dashed',
        group: 'Statistics',
      })
    );
  }

  series.push(
    ...createBandSeries('Bollinger', 'gas-bollinger', lowerBandValues, upperBandValues, {
      color: '#f59e0b',
      opacity: 0.15,
      group: 'Bands',
      initiallyVisible: false,
    }),
    ...createBandSeries('P5/P95', 'gas-percentile', p5Values, p95Values, {
      color: '#6366f1',
      opacity: 0.1,
      group: 'Bands',
    }),
    ...createBandSeries('Min/Max', 'gas-minmax', minValues, maxValues, {
      color: '#64748b',
      opacity: 0.06,
      group: 'Bands',
    })
  );

  return { labels, series };
}

/** Builds chart series config from Gas Limit Signalling records */
export function buildSignallingChartConfig(
  records: (FctExecutionGasLimitSignallingHourly | FctExecutionGasLimitSignallingDaily)[],
  unifiedKeys: string[],
  isDaily: boolean
): ChartConfig {
  const byKey = new Map<string, Map<number, number>>();
  for (const r of records) {
    const key = isDaily
      ? ((r as FctExecutionGasLimitSignallingDaily).day_start_date ?? '')
      : String((r as FctExecutionGasLimitSignallingHourly).hour_start_date_time ?? '');

    const chunkCounts = new Map<number, number>();
    const bandCounts = r.gas_limit_band_counts ?? {};

    for (const [bandStr, count] of Object.entries(bandCounts)) {
      const band = Number(bandStr);
      const chunkIndex = getChunkIndex(band);
      chunkCounts.set(chunkIndex, (chunkCounts.get(chunkIndex) ?? 0) + count);
    }

    byKey.set(key, chunkCounts);
  }

  const labels = unifiedKeys.map(k => (isDaily ? formatDailyDate(k) : formatHourlyDate(Number(k))));
  const allBandIndices = GAS_BANDS.map((_, i) => i);

  const totalCounts = unifiedKeys.map(k => {
    const chunkCounts = byKey.get(k);
    if (!chunkCounts) return null;
    return [...chunkCounts.values()].reduce((a, b) => a + b, 0);
  });

  const percentageSeries = allBandIndices.map(chunkIndex => {
    const data = unifiedKeys.map(k => {
      const chunkCounts = byKey.get(k);
      if (!chunkCounts) return null;
      const total = [...chunkCounts.values()].reduce((a, b) => a + b, 0);
      const count = chunkCounts.get(chunkIndex) ?? 0;
      return total > 0 ? (count / total) * 100 : 0;
    });

    return {
      name: getChunkLabel(chunkIndex),
      data,
      stack: 'gas-signalling',
      showArea: true,
      areaOpacity: 1,
      lineWidth: 0,
      color: GAS_BANDS[chunkIndex].color,
      group: 'Gas Limits',
    } as SeriesData;
  });

  const totalSeries: SeriesData = {
    name: 'Relay Registered Validators',
    data: totalCounts,
    yAxisIndex: 1,
    showArea: true,
    areaOpacity: 0.08,
    lineWidth: 1.5,
    color: '#a855f7',
    group: 'Total',
  };

  return { labels, series: [...percentageSeries, totalSeries] };
}

/** Builds chart series config from transactions records */
export function buildTransactionsChartConfig(
  records: (FctExecutionTransactionsHourly | FctExecutionTransactionsDaily)[],
  unifiedKeys: string[],
  isDaily: boolean
): ChartConfig {
  const byKey = new Map<string, FctExecutionTransactionsHourly | FctExecutionTransactionsDaily>();
  for (const r of records) {
    const key = isDaily
      ? ((r as FctExecutionTransactionsDaily).day_start_date ?? '')
      : String((r as FctExecutionTransactionsHourly).hour_start_date_time ?? '');
    byKey.set(key, r);
  }

  const labels = unifiedKeys.map(k => (isDaily ? formatDailyDate(k) : formatHourlyDate(Number(k))));

  const minValues = unifiedKeys.map(k => {
    const r = byKey.get(k);
    return r ? Math.max(0, r.min_txn_per_block ?? 0) : null;
  });
  const maxValues = unifiedKeys.map(k => {
    const r = byKey.get(k);
    return r ? Math.max(0, r.max_txn_per_block ?? 0) : null;
  });
  const p5Values = unifiedKeys.map(k => {
    const r = byKey.get(k);
    return r ? Math.max(0, r.p05_txn_per_block ?? 0) : null;
  });
  const p95Values = unifiedKeys.map(k => {
    const r = byKey.get(k);
    return r ? Math.max(0, r.p95_txn_per_block ?? 0) : null;
  });
  const lowerBandValues = unifiedKeys.map(k => {
    const r = byKey.get(k);
    return r ? Math.max(0, r.lower_band_txn_per_block ?? 0) : null;
  });
  const upperBandValues = unifiedKeys.map(k => {
    const r = byKey.get(k);
    return r ? Math.max(0, r.upper_band_txn_per_block ?? 0) : null;
  });
  const avgValues = unifiedKeys.map(k => {
    const r = byKey.get(k);
    return r ? Math.max(0, r.avg_txn_per_block ?? 0) : null;
  });
  const medianValues = unifiedKeys.map(k => {
    const r = byKey.get(k);
    return r ? Math.max(0, r.p50_txn_per_block ?? 0) : null;
  });
  const movingAvgValues = unifiedKeys.map(k => {
    const r = byKey.get(k);
    return r ? Math.max(0, r.moving_avg_txn_per_block ?? 0) : null;
  });
  const cumulativeValues = unifiedKeys.map(k => {
    const r = byKey.get(k);
    return r ? Number(r.cumulative_transactions ?? 0) : null;
  });

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
      {
        name: 'Cumulative',
        data: cumulativeValues,
        color: 'rgba(156, 163, 175, 0.6)',
        lineWidth: 1.5,
        yAxisIndex: 1,
        group: 'Statistics',
      },
      ...createBandSeries('Bollinger', 'txn-bollinger', lowerBandValues, upperBandValues, {
        color: '#f59e0b',
        opacity: 0.15,
        group: 'Bands',
        initiallyVisible: false,
      }),
      ...createBandSeries('P5/P95', 'txn-percentile', p5Values, p95Values, {
        color: '#6366f1',
        opacity: 0.1,
        group: 'Bands',
      }),
      ...createBandSeries('Min/Max', 'txn-minmax', minValues, maxValues, {
        color: '#64748b',
        opacity: 0.06,
        group: 'Bands',
      }),
    ],
  };
}
