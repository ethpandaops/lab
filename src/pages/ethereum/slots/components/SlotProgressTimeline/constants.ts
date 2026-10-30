/**
 * Constants and color configuration for the SlotProgressTimeline component.
 */

import type { TraceSpan } from './SlotProgressTimeline.types';

/** Slot duration in milliseconds (12 seconds) */
export const SLOT_DURATION_MS = 12_000;

/** Maximum reasonable seen_slot_start_diff value (60 seconds - anything beyond is likely bad data) */
export const MAX_REASONABLE_SEEN_TIME_MS = 60_000;

/**
 * Color configuration for span categories.
 */
export const SPAN_COLORS: Record<TraceSpan['category'], { bg: string; border: string; text: string }> = {
  slot: { bg: 'bg-data-slate', border: 'border-data-slate', text: 'text-muted' },
  propagation: { bg: 'bg-data-blue', border: 'border-data-blue', text: 'text-data-blue' },
  country: { bg: 'bg-data-blue/60', border: 'border-data-blue/80', text: 'text-data-blue' },
  // Classification colors for block propagation nodes
  internal: { bg: 'bg-data-teal', border: 'border-data-teal', text: 'text-data-teal' },
  individual: { bg: 'bg-data-violet', border: 'border-data-violet', text: 'text-data-violet' },
  mev: { bg: 'bg-data-pink', border: 'border-data-pink', text: 'text-data-pink' },
  'mev-builder': { bg: 'bg-data-pink/80', border: 'border-data-pink', text: 'text-data-pink' },
  execution: { bg: 'bg-data-indigo', border: 'border-data-indigo', text: 'text-data-indigo' },
  'execution-client': { bg: 'bg-data-indigo/80', border: 'border-data-indigo', text: 'text-data-indigo' },
  'execution-node': { bg: 'bg-data-indigo/60', border: 'border-data-indigo/80', text: 'text-data-indigo' },
  'data-availability': { bg: 'bg-data-purple', border: 'border-data-purple', text: 'text-data-purple' },
  column: { bg: 'bg-data-purple/80', border: 'border-data-purple', text: 'text-data-purple' },
  attestation: { bg: 'bg-data-emerald', border: 'border-data-emerald', text: 'text-data-emerald' },
};
