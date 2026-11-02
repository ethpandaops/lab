import type { TimeRangeContext } from '../CellProbeDialog';

export type LiveProbeEventsProps = {
  /** Slot start time window of the current drill-down level */
  range: TimeRangeContext;
  /** Names the window, e.g. "Epoch 1234" */
  scopeLabel: string;
  /** Maximum number of events to display */
  maxEvents?: number;
  /** Polling interval in milliseconds */
  pollInterval?: number;
};
