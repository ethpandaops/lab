import { createBandSeries, createStatisticSeries, type SeriesData } from '@/components/Charts/MultiLine';
import type {
  FctExecutionTpsHourly,
  FctExecutionTpsDaily,
  FctExecutionGasLimitSignallingHourly,
  FctExecutionGasLimitSignallingDaily,
  FctOpcodeOpsHourly,
  FctOpcodeOpsDaily,
} from '@/api/types.gen';
import { GAS_BANDS } from './constants';
import { getDataVizColors } from '@/utils/dataVizColors';
import { clientLogoHtml } from '@/components/Charts/chartChrome';

const { DATA_COLORS } = getDataVizColors();

// ============================================================================
// Time
// ============================================================================

const DAY_SECONDS = 86_400;

/**
 * 2015-07-30 00:00 UTC, the day of the first Ethereum block. No network has a block before it, so a
 * rollup row dated earlier carries a bogus time (the mainnet genesis block's timestamp is 0) and is dropped
 * rather than stretching the time axis back to 1970.
 */
export const FIRST_BLOCK_DAY = Date.UTC(2015, 6, 30) / 1000;

/** A rollup row keyed by UTC hour (Unix seconds) or by UTC day ("2026-11-04") */
export type RollupRow = { hour_start_date_time?: number } | { day_start_date?: string };

/** Start of a rollup row's hour or day, in Unix seconds; null when it has none */
export function rowTime(row: RollupRow): number | null {
  if ('day_start_date' in row && row.day_start_date) {
    return Date.parse(`${row.day_start_date}T00:00:00Z`) / 1000;
  }
  if ('hour_start_date_time' in row && row.hour_start_date_time !== undefined) {
    return row.hour_start_date_time;
  }
  return null;
}

/** A chart's rows by bucket start, oldest first, with rows dated before the first Ethereum block dropped */
export interface TimedRows<T> {
  /** Bucket starts (Unix seconds), oldest first; a gap in the data has one entry with no row, so the line breaks */
  times: number[];
  /** Row of each bucket start */
  byTime: Map<number, T>;
}

/**
 * Orders rollup rows by time for a time axis. Missing buckets are not filled in one by one: a gap gets a
 * single empty point a bucket after its last row, which is enough to break the line there.
 */
export function timedRows<T extends RollupRow>(rows: T[] | undefined, bucketSeconds: number): TimedRows<T> {
  const byTime = new Map<number, T>();
  for (const row of rows ?? []) {
    const t = rowTime(row);
    if (t !== null && t >= FIRST_BLOCK_DAY) byTime.set(t, row);
  }
  const sorted = [...byTime.keys()].sort((a, b) => a - b);
  const times: number[] = [];
  sorted.forEach((t, i) => {
    if (i > 0 && t - sorted[i - 1] > bucketSeconds) times.push(sorted[i - 1] + bucketSeconds);
    times.push(t);
  });
  return { times, byTime };
}

/** Pairs each value with its bucket start, the point shape a time axis takes */
function withTimes(series: SeriesData[], times: number[]): SeriesData[] {
  return series.map(s => ({
    ...s,
    data: (s.data as (number | null)[]).map((v, i): [number, number | null] => [times[i], v]),
  }));
}

/** The bucket start a tooltip is for: the x of its first point */
export function tooltipTime(params: unknown): number | null {
  const first = (Array.isArray(params) ? params[0] : params) as { value?: unknown } | undefined;
  const x = Array.isArray(first?.value) ? first.value[0] : undefined;
  return typeof x === 'number' ? x : null;
}

/** Tooltip heading for a bucket start: the UTC day, or the UTC hour */
export function formatBucket(seconds: number, isDaily: boolean): string {
  const d = new Date(seconds * 1000);
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  if (isDaily) return date;
  return `${date} ${String(d.getUTCHours()).padStart(2, '0')}:00 UTC`;
}

/** Bucket length of daily or hourly rows */
export function bucketSeconds(isDaily: boolean): number {
  return isDaily ? DAY_SECONDS : 3600;
}

// ============================================================================
// Category-axis date helpers, used by other pages' daily and hourly charts
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

/** Gets the chunk index for a gas limit band. Bands are half-open: each covers [previous max, max). */
export function getChunkIndex(gasLimitBand: number): number {
  for (let i = 0; i < GAS_BANDS.length; i++) {
    if (gasLimitBand < GAS_BANDS[i].max) {
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
  /** Client the row stands for, shown with its logo */
  client?: string;
}

/** Section configuration for tooltip */
export interface TooltipSection {
  title: string;
  items: TooltipItem[];
}

/** Builds a single tooltip row HTML */
function buildTooltipRow(item: TooltipItem, muted: boolean): string {
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

  return `<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px; font-size: 12px;">
    ${indicator}
    ${item.client ? clientLogoHtml(item.client) : ''}
    <span${muted ? ' style="color: #d1d5db;"' : ''}>${item.label}</span>
    <span style="margin-left: auto;${muted ? ' color: #d1d5db;' : ' font-weight: 600;'}">${item.value}</span>
  </div>`;
}

/** Builds complete tooltip HTML from sections */
export function buildTooltipHtml(dateStr: string, sections: TooltipSection[]): string {
  let html = `<div style="margin-bottom: 10px; font-weight: 600; font-size: 13px;">${dateStr}</div>`;

  sections.forEach((section, idx) => {
    if (idx > 0) {
      html += `<div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(128,128,128,0.3);">`;
    }
    html += `<div style="margin-bottom: 8px; font-size: 11px; text-transform: none; color: #9ca3af;">${section.title}</div>`;
    section.items.forEach(item => {
      html += buildTooltipRow(item, section.title === 'BANDS');
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

/** Formats a number with K/M/B suffix; a lower Bollinger band can be negative */
export function formatCompact(val: number): string {
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(0)}K`;
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

/** Formats big numbers (billions) */
export function formatBigNum(n: number | bigint | undefined): string {
  const num = Number(n ?? 0);
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  return num.toLocaleString();
}

/**
 * Byte counts in decimal units, so a y-axis's round steps read as round numbers: "300 kB", "1.2 MB".
 * `digits` sets the decimals shown for kB and MB.
 */
export function formatBytesDecimal(bytes: number, digits = 0): string {
  if (bytes < 1000) return `${Math.round(bytes)} B`;
  if (bytes < 1_000_000) return `${(bytes / 1000).toFixed(digits)} kB`;
  return `${(bytes / 1_000_000).toFixed(Math.max(digits, 1))} MB`;
}

// ============================================================================
// Chart Series Builders
// ============================================================================

/**
 * Transactions per second over the whole period: total transactions ÷ total seconds.
 * `avg_tps` is the unweighted mean of per-block ratios, which overstates TPS when block times vary.
 */
export function periodTps(r: FctExecutionTpsHourly | FctExecutionTpsDaily): number | null {
  const seconds = r.total_seconds ?? 0;
  if (seconds <= 0) return null;
  return (r.total_transactions ?? 0) / seconds;
}

/**
 * Opcodes executed per second over the whole period: total opcodes ÷ total seconds.
 * `avg_ops` is the unweighted mean of per-block ratios, like `avg_tps`.
 */
export function periodOps(r: FctOpcodeOpsHourly | FctOpcodeOpsDaily): number | null {
  const seconds = r.total_seconds ?? 0;
  if (seconds <= 0) return null;
  return (r.total_opcode_count ?? 0) / seconds;
}

/** One period's statistics over its blocks, as the per-block rollups store them */
export interface PeriodStats {
  avg: number | null;
  movingAvg?: number;
  median?: number;
  p05?: number;
  p95?: number;
  lowerBand?: number;
  upperBand?: number;
  min?: number;
  max?: number;
}

/** Extra line drawn on a statistics chart, from the same rows or another table keyed by the same times */
export interface ExtraLine {
  series: Omit<SeriesData, 'data'>;
  value: (t: number) => number | null;
}

/**
 * Series for a chart of per-block statistics: average, moving average and median lines, then the
 * Bollinger, P5/P95 and min/max bands, with values below zero clamped to zero
 */
export function buildStatSeries<T>(
  rows: TimedRows<T>,
  stats: (row: T) => PeriodStats,
  stackPrefix: string,
  extraLines: ExtraLine[] = []
): SeriesData[] {
  const { times, byTime } = rows;
  const values = (pick: (s: PeriodStats) => number | null | undefined, clamp = true): (number | null)[] =>
    times.map(t => {
      const row = byTime.get(t);
      if (!row) return null;
      const v = pick(stats(row));
      if (v === null || v === undefined) return null;
      return clamp ? Math.max(0, v) : v;
    });

  const series: SeriesData[] = [
    createStatisticSeries(
      'Average',
      values(s => s.avg),
      {
        color: DATA_COLORS.emerald,
        lineWidth: 2.5,
        group: 'Statistics',
      }
    ),
    createStatisticSeries(
      'Moving Avg',
      values(s => s.movingAvg ?? 0),
      {
        color: DATA_COLORS.cyan,
        lineWidth: 2,
        group: 'Statistics',
      }
    ),
    createStatisticSeries(
      'Median',
      values(s => s.median ?? 0),
      {
        color: DATA_COLORS.purple,
        lineWidth: 1.5,
        lineStyle: 'dotted',
        group: 'Statistics',
      }
    ),
    ...extraLines.map(({ series: s, value }) => ({ ...s, data: times.map(t => (byTime.has(t) ? value(t) : null)) })),
    ...createBandSeries(
      'Bollinger',
      `${stackPrefix}-bollinger`,
      values(s => s.lowerBand ?? 0),
      values(s => s.upperBand ?? 0),
      { color: DATA_COLORS.amber, opacity: 0.15, group: 'Bands', initiallyVisible: false }
    ),
    ...createBandSeries(
      'P5/P95',
      `${stackPrefix}-percentile`,
      values(s => s.p05 ?? 0),
      values(s => s.p95 ?? 0),
      { color: DATA_COLORS.indigo, opacity: 0.1, group: 'Bands' }
    ),
    ...createBandSeries(
      'Min/Max',
      `${stackPrefix}-minmax`,
      values(s => s.min ?? 0),
      values(s => s.max ?? 0),
      { color: DATA_COLORS.slate, opacity: 0.06, group: 'Bands', initiallyVisible: false }
    ),
  ];
  return withTimes(series, times);
}

/** Tooltip sections for one period of a statistics chart, with values formatted by `format` */
export function statTooltipSections(
  stats: PeriodStats,
  format: (v: number) => string,
  extraItems: TooltipItem[] = []
): TooltipSection[] {
  const band = (lower: number | undefined, upper: number | undefined): string =>
    `${format(lower ?? 0)} – ${format(upper ?? 0)}`;
  return [
    {
      title: 'STATISTICS',
      items: [
        { color: DATA_COLORS.emerald, label: 'Average', value: stats.avg === null ? '-' : format(stats.avg) },
        { color: DATA_COLORS.cyan, label: 'Moving Avg', value: format(stats.movingAvg ?? 0) },
        { color: DATA_COLORS.purple, label: 'Median', value: format(stats.median ?? 0), style: 'dotted' },
        ...extraItems,
      ],
    },
    {
      title: 'BANDS',
      items: [
        { color: DATA_COLORS.amber, label: 'Bollinger', value: band(stats.lowerBand, stats.upperBand), style: 'area' },
        { color: DATA_COLORS.indigo, label: 'P5/P95', value: band(stats.p05, stats.p95), style: 'area' },
        { color: DATA_COLORS.slate, label: 'Min/Max', value: band(stats.min, stats.max), style: 'area' },
      ],
    },
  ];
}

/** Builds the gas limit signalling series: each band's share of validators, and the validator total */
export function buildSignallingSeries(
  rows: TimedRows<FctExecutionGasLimitSignallingHourly | FctExecutionGasLimitSignallingDaily>
): SeriesData[] {
  const { times, byTime } = rows;
  const chunkCounts = new Map<number, Map<number, number>>();
  for (const [t, r] of byTime) {
    const counts = new Map<number, number>();
    for (const [bandStr, count] of Object.entries(r.gas_limit_band_counts ?? {})) {
      const chunkIndex = getChunkIndex(Number(bandStr));
      counts.set(chunkIndex, (counts.get(chunkIndex) ?? 0) + count);
    }
    chunkCounts.set(t, counts);
  }
  const total = (t: number): number | null => {
    const counts = chunkCounts.get(t);
    return counts ? [...counts.values()].reduce((a, b) => a + b, 0) : null;
  };

  const shares: SeriesData[] = GAS_BANDS.map((band, chunkIndex) => ({
    name: band.label,
    data: times.map(t => {
      const sum = total(t);
      if (sum === null) return null;
      return sum > 0 ? ((chunkCounts.get(t)?.get(chunkIndex) ?? 0) / sum) * 100 : 0;
    }),
    stack: 'gas-signalling',
    showArea: true,
    areaOpacity: 1,
    lineWidth: 0,
    color: band.color,
    group: 'Gas Limits',
  }));

  const totalSeries: SeriesData = {
    name: 'Relay Registered Validators',
    data: times.map(total),
    yAxisIndex: 1,
    showArea: true,
    areaOpacity: 0.08,
    lineWidth: 1.5,
    color: DATA_COLORS.purple,
    group: 'Total',
  };

  return withTimes([...shares, totalSeries], times);
}
