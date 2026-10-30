import type { ThemeColors } from '@/hooks/useThemeColors';
import { getDataVizColors } from '@/utils/dataVizColors';
import type { CompletionPath, TimePeriod } from './IndexPage.types';

const { DATA_COLORS } = getDataVizColors();

/** Configuration for each time period: hourly data for short windows, daily for long ones */
export const TIME_RANGE_CONFIG = {
  '24h': { days: 1, dataType: 'hourly' as const },
  '7d': { days: 7, dataType: 'hourly' as const },
  '30d': { days: 30, dataType: 'daily' as const },
  '90d': { days: 90, dataType: 'daily' as const },
  all: { days: null, dataType: 'daily' as const },
} as const;

/** Time period selector options for UI rendering */
export const TIME_PERIOD_OPTIONS: ReadonlyArray<{ value: TimePeriod; label: string }> = [
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: 'all', label: 'All' },
];

/** Default time period */
export const DEFAULT_TIME_PERIOD: TimePeriod = '7d';

/** Page size for the aggregate queries */
export const PAGE_SIZE = 10_000;

/** Retries before a failed query shows its error, instead of the app default of retrying forever */
export const QUERY_RETRIES = 3;

/** Page size for the blocks table */
export const BLOCKS_PAGE_SIZE = 25;

/** Table whose bounds decide whether the network has partial message data */
export const COMPLETION_HOURLY_TABLE = 'fct_data_column_completion_by_path_hourly';

/** Completion paths in stacking order */
export const COMPLETION_PATHS: readonly CompletionPath[] = [
  'FULL_GOSSIP',
  'PARTIAL_GOSSIP',
  'EL',
  'RECONSTRUCTION',
  'UNKNOWN',
];

/** Display label per completion path */
export const PATH_LABELS: Record<CompletionPath, string> = {
  FULL_GOSSIP: 'Full gossip',
  PARTIAL_GOSSIP: 'Partial gossip',
  EL: 'Execution layer',
  RECONSTRUCTION: 'Reconstruction',
  UNKNOWN: 'Unreported',
};

/** Series color per completion path */
export const PATH_COLORS: Record<CompletionPath, string> = {
  FULL_GOSSIP: DATA_COLORS.sky,
  PARTIAL_GOSSIP: DATA_COLORS.violet,
  EL: DATA_COLORS.green,
  RECONSTRUCTION: DATA_COLORS.amber,
  UNKNOWN: DATA_COLORS.slate,
};

/** Series colors for cells by source */
export const CELL_SOURCE_COLORS = {
  gossip: DATA_COLORS.sky,
  el: DATA_COLORS.green,
  recovered: DATA_COLORS.amber,
};

/** Theme color per validation verdict */
export const VERDICT_COLORS = {
  accept: 'success',
  ignore: 'muted',
  reject: 'danger',
} as const satisfies Record<string, keyof ThemeColors>;

/** Preferred sentry client when the URL names none, the one that reports every completion path */
export const DEFAULT_SENTRY_CLIENT = 'lighthouse';
