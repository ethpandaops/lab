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
    lineWidth: config.lineWidth ?? 2,
    lineStyle: config.lineStyle ?? 'solid',
    group: config.group,
    initiallyVisible: config.initiallyVisible,
  };
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
        label: (fork.combinedName ?? fork.displayName).toUpperCase(),
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
      // Convert snake_case to UPPER CASE with spaces (e.g., "tangerine_whistle" -> "TANGERINE WHISTLE")
      const displayName = forkName.toUpperCase().replace(/_/g, ' ');

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
