/**
 * Context for filtering probe events based on drill-down level
 */
export type ProbeFilterContext =
  | { type: 'window' }
  | { type: 'day'; date: string }
  | { type: 'hour'; date: string; hourStartDateTime: number }
  | { type: 'epoch'; date: string; hourStartDateTime: number; epoch: number }
  | { type: 'slot'; date: string; hourStartDateTime: number; epoch: number; slot: number };

export type LiveProbeEventsProps = {
  /** Current drill-down context for filtering */
  context: ProbeFilterContext;
  /** Maximum number of events to display */
  maxEvents?: number;
  /** Polling interval in milliseconds */
  pollInterval?: number;
  /** Optional params for the "View All Probes" link */
  probesLinkParams?: {
    slot?: number;
    timeStart?: number;
    timeEnd?: number;
  };
};
