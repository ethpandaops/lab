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
  slot: { bg: 'bg-slate-600', border: 'border-slate-700', text: 'text-slate-400' },
  propagation: { bg: 'bg-blue-500', border: 'border-blue-600', text: 'text-blue-500' },
  country: { bg: 'bg-blue-300', border: 'border-blue-400', text: 'text-blue-300' },
  // Classification colors for block propagation nodes
  internal: { bg: 'bg-teal-400', border: 'border-teal-500', text: 'text-teal-400' },
  individual: { bg: 'bg-violet-400', border: 'border-violet-500', text: 'text-violet-400' },
  mev: { bg: 'bg-pink-500', border: 'border-pink-600', text: 'text-pink-500' },
  'mev-builder': { bg: 'bg-pink-400', border: 'border-pink-500', text: 'text-pink-400' },
  execution: { bg: 'bg-amber-500', border: 'border-amber-600', text: 'text-amber-500' },
  'execution-client': { bg: 'bg-amber-400', border: 'border-amber-500', text: 'text-amber-400' },
  'execution-node': { bg: 'bg-amber-300', border: 'border-amber-400', text: 'text-amber-300' },
  'data-availability': { bg: 'bg-purple-500', border: 'border-purple-600', text: 'text-purple-500' },
  column: { bg: 'bg-purple-400', border: 'border-purple-500', text: 'text-purple-400' },
  attestation: { bg: 'bg-emerald-500', border: 'border-emerald-600', text: 'text-emerald-500' },
};
