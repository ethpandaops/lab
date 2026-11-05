import type { MarkLineConfig, SeriesData } from './MultiLine.types';
import type { ForkInfo } from '@/utils/forks';
import type { ExecutionForks, BlobScheduleItem } from '@/hooks/useConfig';
import { epochToTimestamp } from '@/utils/beacon';
import { getDataVizColors } from '@/utils/dataVizColors';

export interface BandConfig {
  /** Band fill color (hex) */
  color: string;
  /** Area opacity (0-1) */
  opacity: number;
  /** Legend group name */
  group?: string;
  /** Whether the band starts enabled in the legend @default true */
  initiallyVisible?: boolean;
}

/**
 * Creates a stacked band series pair from lower/upper bounds.
 * Uses the ECharts stacking technique: invisible base + visible width.
 *
 * @param name - Display name for legend
 * @param stackId - Unique stack group identifier
 * @param lowerValues - Array of lower bound values
 * @param upperValues - Array of upper bound values
 * @param config - Band styling configuration
 * @returns Array of two SeriesData objects (base + width)
 *
 * @example
 * const series = [
 *   ...createBandSeries('Min/Max', 'minmax', minValues, maxValues, {
 *     color: DATA_COLORS.slate,
 *     opacity: 0.06,
 *     group: 'Bands',
 *   }),
 * ];
 */
export function createBandSeries(
  name: string,
  stackId: string,
  lowerValues: (number | null)[],
  upperValues: (number | null)[],
  config: BandConfig
): SeriesData[] {
  const widthValues = upperValues.map((u, i) => {
    const lower = lowerValues[i];
    if (u === null || lower === null) return null;
    return Math.max(0, u - lower);
  });

  return [
    {
      name: `_${stackId}_base`,
      data: lowerValues,
      stack: stackId,
      showArea: true,
      areaOpacity: 0,
      lineWidth: 0,
      color: config.color,
      visible: false,
    },
    {
      name,
      data: widthValues,
      stack: stackId,
      showArea: true,
      areaOpacity: config.opacity,
      lineWidth: 0,
      color: config.color,
      group: config.group,
      initiallyVisible: config.initiallyVisible,
    },
  ];
}

export interface StatisticConfig {
  /** Line color (hex) */
  color: string;
  /** Line width in pixels @default 2 */
  lineWidth?: number;
  /** Line style @default 'solid' */
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  /** Legend group name */
  group?: string;
  /** Whether the series starts enabled in the legend @default true */
  initiallyVisible?: boolean;
}

/**
 * Creates a line series for statistical measures (mean, median, moving average, etc).
 *
 * @param name - Display name for legend (e.g., "Mean", "Median", "7-day MA")
 * @param values - Array of statistical values
 * @param config - Line styling configuration
 * @returns SeriesData object for the statistic line
 *
 * @example
 * const series = [
 *   createStatisticSeries('Mean', meanValues, {
 *     color: DATA_COLORS.blue,
 *     lineWidth: 2,
 *     group: 'Statistics',
 *   }),
 *   createStatisticSeries('Median', medianValues, {
 *     color: DATA_COLORS.violet,
 *     lineStyle: 'dashed',
 *     group: 'Statistics',
 *   }),
 * ];
 */
export function createStatisticSeries(name: string, values: (number | null)[], config: StatisticConfig): SeriesData {
  return {
    name,
    data: values,
    color: config.color,
    lineWidth: config.lineWidth ?? 1.5,
    lineStyle: config.lineStyle ?? 'solid',
    group: config.group,
    initiallyVisible: config.initiallyVisible,
  };
}

/** "muir glacier" -> "Muir Glacier" */
function titleCase(name: string): string {
  return name.replace(/\b\w/g, c => c.toUpperCase());
}

export interface ForkMarkLinesOptions {
  /** All forks from useForks() */
  forks: ForkInfo[];
  /** Chart x-axis labels (formatted date strings), for a category axis */
  labels?: string[];
  /** Domain of a time axis, [min, max] in Unix seconds; marks then sit at their exact time */
  range?: [number, number];
  /** Network genesis time (seconds) */
  genesisTime: number;
  /** Whether chart uses daily (true) or hourly (false) format */
  isDaily?: boolean;
  /** Optional: filter to specific fork names */
  includeForks?: string[];
}

/**
 * Generates mark line configs for forks visible in the chart range.
 * Matches fork activation dates to x-axis labels and creates annotation lines.
 *
 * @example
 * const markLines = createForkMarkLines({
 *   forks: allForks,
 *   labels: chartConfig.labels,
 *   genesisTime: currentNetwork.genesis_time,
 *   isDaily: true,
 * });
 */
/**
 * Formats a date to match chart label format: "Jan 15 '24"
 */
function formatDateLabel(date: Date): string {
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const day = date.getDate();
  const year = date.getFullYear().toString().slice(-2);
  return `${month} ${day} '${year}`;
}

/**
 * Where a mark at `timestamp` (seconds) goes: its exact time on a time axis whose range holds it, or
 * its date label on a category axis that has that label; null when the chart doesn't cover it
 */
function markX(
  timestamp: number,
  labels: string[] | undefined,
  range: [number, number] | undefined
): number | string | null {
  if (range) return timestamp >= range[0] && timestamp <= range[1] ? timestamp : null;
  const label = formatDateLabel(new Date(timestamp * 1000));
  return labels?.includes(label) ? label : null;
}

export function createForkMarkLines(options: ForkMarkLinesOptions): MarkLineConfig[] {
  const { forks, labels, range, genesisTime, includeForks } = options;

  if (!forks.length || (!labels?.length && !range)) return [];

  const markLines: MarkLineConfig[] = [];

  for (const fork of forks) {
    // Skip if filtering and fork not included
    if (includeForks && !includeForks.includes(fork.name)) continue;

    // Skip phase0 (genesis, not interesting)
    if (fork.name === 'phase0') continue;

    // Convert fork epoch to timestamp
    const forkTimestamp = epochToTimestamp(fork.epoch, genesisTime);
    const xValue = markX(forkTimestamp, labels, range);

    if (xValue !== null) {
      markLines.push({
        xValue,
        label: fork.combinedName ? titleCase(fork.combinedName) : fork.displayName,
        labelPosition: 'end',
        color: getDataVizColors().DATA_COLORS.violet, // Violet for consensus forks
        lineStyle: 'dashed',
        lineWidth: 1,
      });
    }
  }

  return markLines;
}

export interface ExecutionForkMarkLinesOptions {
  /** Execution forks from network.forks.execution */
  executionForks: ExecutionForks;
  /** Chart x-axis labels (formatted date strings), for a category axis */
  labels?: string[];
  /** Domain of a time axis, [min, max] in Unix seconds; marks then sit at their exact time */
  range?: [number, number];
}

/**
 * Generates mark line configs for execution forks (pre-merge) visible in the chart range.
 * Matches fork activation dates to x-axis labels and creates annotation lines.
 *
 * @example
 * const markLines = createExecutionForkMarkLines({
 *   executionForks: currentNetwork.forks.execution,
 *   labels: chartConfig.labels,
 *   isDaily: true,
 * });
 */
export function createExecutionForkMarkLines(options: ExecutionForkMarkLinesOptions): MarkLineConfig[] {
  const { executionForks, labels, range } = options;

  if (!executionForks || (!labels?.length && !range)) return [];

  const markLines: MarkLineConfig[] = [];

  // Skip paris since it's covered by the MERGE consensus fork markline
  const skipForks = new Set(['paris']);

  for (const [forkName, forkData] of Object.entries(executionForks)) {
    if (!forkData || skipForks.has(forkName)) continue;

    const xValue = markX(forkData.timestamp, labels, range);

    if (xValue !== null) {
      // snake_case to Title Case (e.g., "tangerine_whistle" -> "Tangerine Whistle")
      const displayName = forkName === 'dao' ? 'DAO' : titleCase(forkName.replace(/_/g, ' '));

      markLines.push({
        xValue,
        label: displayName,
        labelPosition: 'end',
        color: getDataVizColors().DATA_COLORS.amber, // Amber for execution forks
        lineStyle: 'dashed',
        lineWidth: 1,
      });
    }
  }

  return markLines;
}

export interface BlobScheduleMarkLinesOptions {
  /** Blob schedule items from network.blob_schedule */
  blobSchedule: BlobScheduleItem[];
  /** Chart x-axis labels (formatted date strings), for a category axis */
  labels?: string[];
  /** Domain of a time axis, [min, max] in Unix seconds; marks then sit at their exact time */
  range?: [number, number];
  /** Network genesis time (seconds) */
  genesisTime: number;
}

/**
 * Generates mark line configs for blob schedule changes (BPOs) visible in the chart range.
 * Matches blob schedule activation dates to x-axis labels and creates annotation lines.
 *
 * @example
 * const markLines = createBlobScheduleMarkLines({
 *   blobSchedule: currentNetwork.blob_schedule,
 *   labels: chartConfig.labels,
 *   genesisTime: currentNetwork.genesis_time,
 *   isDaily: true,
 * });
 */
export function createBlobScheduleMarkLines(options: BlobScheduleMarkLinesOptions): MarkLineConfig[] {
  const { blobSchedule, labels, range, genesisTime } = options;

  if (!blobSchedule?.length || (!labels?.length && !range)) return [];

  const markLines: MarkLineConfig[] = [];

  // Sort by epoch to ensure consistent BPO numbering
  const sortedSchedule = [...blobSchedule].sort((a, b) => a.epoch - b.epoch);

  sortedSchedule.forEach((item, index) => {
    // Convert epoch to timestamp
    const timestamp = epochToTimestamp(item.epoch, genesisTime);
    const xValue = markX(timestamp, labels, range);

    if (xValue !== null) {
      markLines.push({
        xValue,
        label: `BPO${index + 1}`,
        labelPosition: 'end',
        color: getDataVizColors().DATA_COLORS.emerald, // Emerald for blob schedule
        lineStyle: 'dashed',
        lineWidth: 1,
      });
    }
  });

  return markLines;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DATE_LABEL = /^([A-Z][a-z]{2}) (\d{1,2}) '(\d{2})$/;

/** Calendar steps for date ticks, coarsest last; `months` steps align to January, `days` to the 1st and 15th */
const DATE_TICK_STEPS: Array<{ months?: number; days?: number }> = [
  { days: 1 },
  { days: 2 },
  { days: 7 },
  { days: 14 },
  { months: 1 },
  { months: 3 },
  { months: 6 },
  { months: 12 },
  { months: 24 },
];

/**
 * Picks x-axis ticks for a category axis of date labels ("Jan 15 '24", the format the overview
 * pages and fork mark lines share) so ticks land on calendar boundaries — the first of a year,
 * quarter, month or week — instead of every Nth point. Returns tick index → tick text, or null
 * when the labels are not dates. Repeated labels (hourly points of one day) tick once.
 */
export function dateCategoryTicks(labels: string[], maxTicks: number): Map<number, string> | null {
  if (labels.length < 2) return null;
  const dates: Date[] = [];
  for (const label of labels) {
    const m = DATE_LABEL.exec(label);
    const month = m ? MONTHS.indexOf(m[1]) : -1;
    if (!m || month < 0) return null;
    dates.push(new Date(2000 + Number(m[3]), month, Number(m[2])));
  }

  const spanDays = (dates[dates.length - 1].getTime() - dates[0].getTime()) / 86_400_000;
  const step =
    DATE_TICK_STEPS.find(s => spanDays / (s.days ?? (s.months ?? 1) * 30.4) <= Math.max(2, maxTicks)) ??
    DATE_TICK_STEPS[DATE_TICK_STEPS.length - 1];

  /** Bucket a date falls in for the chosen step; a tick goes on the first label of each bucket */
  const bucket = (d: Date): number => {
    if (step.months) return Math.floor((d.getFullYear() * 12 + d.getMonth()) / step.months);
    if (step.days === 1 || step.days === 2) return Math.floor(Math.round(d.getTime() / 86_400_000) / step.days);
    if (step.days === 14) return d.getFullYear() * 24 + d.getMonth() * 2 + (d.getDate() >= 15 ? 1 : 0);
    // Weeks start on Monday
    return Math.floor((d.getTime() / 86_400_000 + 3) / 7);
  };

  const years = step.months !== undefined && step.months >= 12;
  const ticks = new Map<number, string>();
  let previous = bucket(dates[0]);
  let previousYear = -1;
  dates.forEach((d, i) => {
    const b = bucket(d);
    if (i > 0 && b === previous) return;
    previous = b;
    // The first point only ticks when it starts its bucket, so a range opening mid-period
    // does not get a tick crowding the next one
    const startsBucket = step.months
      ? d.getDate() === 1 && d.getMonth() % step.months === 0
      : step.days === 7
        ? d.getDay() === 1
        : step.days === 14
          ? d.getDate() === 1 || d.getDate() === 15
          : step.days === 2
            ? Math.round(d.getTime() / 86_400_000) % 2 === 0
            : true;
    if (i === 0 && !startsBucket) return;
    const showYear = d.getFullYear() !== previousYear;
    previousYear = d.getFullYear();
    ticks.set(
      i,
      years
        ? String(d.getFullYear())
        : step.months
          ? showYear
            ? `${MONTHS[d.getMonth()]} ${d.getFullYear()}`
            : MONTHS[d.getMonth()]
          : `${MONTHS[d.getMonth()]} ${d.getDate()}`
    );
  });
  return ticks;
}

const DAY_SECONDS = 86_400;
/** Unix day number of Monday 1970-01-05, the first Monday after the epoch */
const FIRST_MONDAY = 4;

/** Calendar unit for time-axis ticks, with the multiples it may step by when labels don't fit */
const TIME_TICK_UNITS = [
  { unit: 'day', maxSpanDays: 14, steps: [1, 2, 3] },
  { unit: 'week', maxSpanDays: 120, steps: [1, 2, 4] },
  { unit: 'month', maxSpanDays: 1_000, steps: [1, 2, 3, 6] },
  { unit: 'year', maxSpanDays: Infinity, steps: [1, 2, 5, 10] },
] as const;

/** A tick on a time axis: Unix seconds and its label */
export interface TimeAxisTick {
  value: number;
  label: string;
}

/**
 * Calendar ticks, in UTC, for a time axis of Unix seconds from `min` to `max`. The unit follows the
 * span: days up to two weeks, Monday-start weeks up to about four months, months up to about
 * three years, years beyond. When the labels would not fit `plotWidth` pixels, ticks step by a
 * multiple of the unit (2 weeks, a quarter, 5 years), aligned to the calendar so every chart with the
 * same domain ticks at the same places. Labels carry the year only when the window spans more than
 * one calendar year: on the first tick and the first tick of each new year ("Dec 29 2025",
 * "Jan 5 2026"), and as the label of each January on a month axis ("2026").
 */
export function timeAxisTicks(min: number, max: number, plotWidth: number): TimeAxisTick[] {
  if (!(max > min)) return [];
  const spanDays = (max - min) / DAY_SECONDS;
  const { unit, steps } = TIME_TICK_UNITS.find(u => spanDays <= u.maxSpanDays)!;
  const spansYears = new Date(min * 1000).getUTCFullYear() !== new Date(max * 1000).getUTCFullYear();

  /** Tick times for a step of `step` units */
  const tickTimes = (step: number): number[] => {
    const times: number[] = [];
    if (unit === 'day' || unit === 'week') {
      const stepDays = unit === 'day' ? step : step * 7;
      const anchor = unit === 'day' ? 0 : FIRST_MONDAY;
      let day = Math.ceil(min / DAY_SECONDS);
      day += (((anchor - day) % stepDays) + stepDays) % stepDays;
      for (; day * DAY_SECONDS <= max; day += stepDays) times.push(day * DAY_SECONDS);
      return times;
    }
    const start = new Date(min * 1000);
    if (unit === 'month') {
      let month = start.getUTCFullYear() * 12 + start.getUTCMonth();
      if (Date.UTC(Math.floor(month / 12), month % 12, 1) / 1000 < min) month++;
      month += (step - (month % step)) % step;
      for (; ; month += step) {
        const t = Date.UTC(Math.floor(month / 12), month % 12, 1) / 1000;
        if (t > max) break;
        times.push(t);
      }
      return times;
    }
    let year = start.getUTCFullYear();
    if (Date.UTC(year, 0, 1) / 1000 < min) year++;
    year += (step - (year % step)) % step;
    for (; Date.UTC(year, 0, 1) / 1000 <= max; year += step) times.push(Date.UTC(year, 0, 1) / 1000);
    return times;
  };

  const label = (t: number, index: number, previous: number | undefined): string => {
    const d = new Date(t * 1000);
    const year = d.getUTCFullYear();
    const month = MONTHS[d.getUTCMonth()];
    if (unit === 'year') return String(year);
    const newYear =
      spansYears && (index === 0 || previous === undefined || new Date(previous * 1000).getUTCFullYear() !== year);
    if (unit === 'month') {
      if (d.getUTCMonth() === 0) return String(year);
      return newYear ? `${month} ${year}` : month;
    }
    return newYear ? `${month} ${d.getUTCDate()} ${year}` : `${month} ${d.getUTCDate()}`;
  };

  let ticks: TimeAxisTick[] = [];
  for (const step of steps) {
    const times = tickTimes(step);
    ticks = times.map((t, i) => ({ value: t, label: label(t, i, times[i - 1]) }));
    // About 6.6px per character at 11px, plus a gap between neighbours
    const width = ticks.reduce((sum, t) => sum + t.label.length * 6.6 + 16, 0);
    if (width <= plotWidth) break;
  }
  return ticks;
}

/** A Unix-seconds time as a UTC date, with the hour when it is not midnight: "Nov 4, 2026" or "Nov 4, 2026 13:00 UTC" */
export function formatUtcTime(seconds: number): string {
  const d = new Date(seconds * 1000);
  const date = `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
  if (seconds % DAY_SECONDS === 0) return date;
  return `${date} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')} UTC`;
}
