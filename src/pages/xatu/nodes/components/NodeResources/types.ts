import { getDataVizColors } from '@/utils/dataVizColors';

export type CpuMetric = 'mean' | 'min' | 'max';

export type MemoryMetric = 'vm_rss' | 'rss_anon' | 'rss_file' | 'vm_swap';

export type AnnotationType = 'block' | 'head' | 'execution' | 'data_columns' | 'slot_phases';

export interface AnnotationEvent {
  type: Exclude<AnnotationType, 'slot_phases'>;
  /** Time in milliseconds from slot start */
  timeMs: number;
  /** Optional end time for range annotations */
  endMs?: number;
  /** Optional label suffix */
  label?: string;
  /** Node name this event belongs to (for filtering) */
  nodeName?: string;
}

const { DATA_COLORS } = getDataVizColors();

export const ANNOTATION_COLORS: Record<AnnotationType, string> = {
  block: DATA_COLORS.amber,
  head: DATA_COLORS.violet,
  execution: DATA_COLORS.red,
  data_columns: DATA_COLORS.emerald,
  slot_phases: DATA_COLORS.slate,
};

export interface HighlightRange {
  startFrac: number;
  widthFrac: number;
  color: string;
}

export const ANNOTATION_OPTIONS: { value: AnnotationType; label: string; description: string }[] = [
  { value: 'slot_phases', label: 'Slot Phases', description: 'Block / Attestation / Aggregation phase boundaries' },
  { value: 'block', label: 'Block Arrival', description: 'When block gossip was received' },
  { value: 'head', label: 'Head Update', description: 'When chain head was updated' },
  { value: 'execution', label: 'Execution', description: 'Engine newPayload call duration' },
  { value: 'data_columns', label: 'Data Columns', description: 'First to last data column received' },
];
