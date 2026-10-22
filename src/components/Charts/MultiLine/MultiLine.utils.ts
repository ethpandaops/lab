import type { MarkLineConfig, SeriesData } from './MultiLine.types';
import type { ForkInfo } from '@/utils/forks';
import type { ExecutionForks, BlobScheduleItem } from '@/hooks/useConfig';
import { epochToTimestamp } from '@/utils/beacon';

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
 *     color: '#64748b',
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
 *     color: '#3b82f6',
 *     lineWidth: 2,
 *     group: 'Statistics',
 *   }),
 *   createStatisticSeries('Median', medianValues, {
 *     color: '#8b5cf6',
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
  /** Chart x-axis labels (formatted date strings) */
  labels: string[];
  /** Network genesis time (seconds) */
  genesisTime: number;
  /** Whether chart uses daily (true) or hourly (false) format */
  isDaily: boolean;
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

export function createForkMarkLines(options: ForkMarkLinesOptions): MarkLineConfig[] {
  const { forks, labels, genesisTime, includeForks } = options;

  if (!forks.length || !labels.length) return [];

  const markLines: MarkLineConfig[] = [];

  for (const fork of forks) {
    // Skip if filtering and fork not included
    if (includeForks && !includeForks.includes(fork.name)) continue;

    // Skip phase0 (genesis, not interesting)
    if (fork.name === 'phase0') continue;

    // Convert fork epoch to timestamp
    const forkTimestamp = epochToTimestamp(fork.epoch, genesisTime);
    const forkDate = new Date(forkTimestamp * 1000);

    // Format to match chart label format: "Jan 15 '24"
    const forkLabel = formatDateLabel(forkDate);

    // Check if this label exists in chart range
    if (labels.includes(forkLabel)) {
      markLines.push({
        xValue: forkLabel,
        label: fork.combinedName ? titleCase(fork.combinedName) : fork.displayName,
        labelPosition: 'end',
        color: '#8b5cf6', // Purple for consensus forks
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
  /** Chart x-axis labels (formatted date strings) */
  labels: string[];
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
  const { executionForks, labels } = options;

  if (!executionForks || !labels.length) return [];

  const markLines: MarkLineConfig[] = [];

  // Skip paris since it's covered by the MERGE consensus fork markline
  const skipForks = new Set(['paris']);

  for (const [forkName, forkData] of Object.entries(executionForks)) {
    if (!forkData || skipForks.has(forkName)) continue;

    const forkDate = new Date(forkData.timestamp * 1000);

    // Format to match chart label format: "Jan 15 '24"
    const forkLabel = formatDateLabel(forkDate);

    // Check if this label exists in chart range
    if (labels.includes(forkLabel)) {
      // snake_case to Title Case (e.g., "tangerine_whistle" -> "Tangerine Whistle")
      const displayName = forkName === 'dao' ? 'DAO' : titleCase(forkName.replace(/_/g, ' '));

      markLines.push({
        xValue: forkLabel,
        label: displayName,
        labelPosition: 'end',
        color: '#f59e0b', // Amber for execution forks
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
  /** Chart x-axis labels (formatted date strings) */
  labels: string[];
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
  const { blobSchedule, labels, genesisTime } = options;

  if (!blobSchedule?.length || !labels.length) return [];

  const markLines: MarkLineConfig[] = [];

  // Sort by epoch to ensure consistent BPO numbering
  const sortedSchedule = [...blobSchedule].sort((a, b) => a.epoch - b.epoch);

  sortedSchedule.forEach((item, index) => {
    // Convert epoch to timestamp
    const timestamp = epochToTimestamp(item.epoch, genesisTime);
    const blobDate = new Date(timestamp * 1000);

    // Format to match chart label format: "Jan 15 '24"
    const blobLabel = formatDateLabel(blobDate);

    // Check if this label exists in chart range
    if (labels.includes(blobLabel)) {
      markLines.push({
        xValue: blobLabel,
        label: `BPO${index + 1}`,
        labelPosition: 'end',
        color: '#10b981', // Green for blob schedule
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
