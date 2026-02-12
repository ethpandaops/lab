export type AnnotationType = 'block' | 'head' | 'execution' | 'data_columns';

export interface AnnotationEvent {
  type: AnnotationType;
  /** Time in milliseconds from slot start */
  timeMs: number;
  /** Optional end time for range annotations */
  endMs?: number;
  /** Optional label suffix */
  label?: string;
  /** Node name this event belongs to (for filtering) */
  nodeName?: string;
}

export const ANNOTATION_OPTIONS: { value: AnnotationType; label: string; description: string }[] = [
  { value: 'block', label: 'Block Arrival', description: 'When block gossip was received' },
  { value: 'head', label: 'Head Update', description: 'When chain head was updated' },
  { value: 'execution', label: 'Execution', description: 'Engine newPayload call duration' },
  { value: 'data_columns', label: 'Data Columns', description: 'First to last data column received' },
];
