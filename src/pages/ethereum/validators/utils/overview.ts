import type { OverviewDay } from '../mocks/overview';
import { formatDayLabel } from '../mocks/overview';

export type OverviewWindow = '30d' | '90d' | '1y' | '2y' | 'all';

export const OVERVIEW_WINDOW_OPTIONS = [
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: '1y', label: '1y' },
  { value: '2y', label: '2y' },
  { value: 'all', label: 'All' },
] as const;

const WINDOW_DAYS: Record<OverviewWindow, number | null> = {
  '30d': 30,
  '90d': 90,
  '1y': 365,
  '2y': 730,
  all: null,
};

/** Days inside the selected window, ending at the latest day */
export function sliceWindow(days: OverviewDay[], window: OverviewWindow): OverviewDay[] {
  const n = WINDOW_DAYS[window];
  return n === null ? days : days.slice(-n);
}

export interface Bucket {
  label: string;
  /** Last day in the bucket, for point-in-time values */
  last: OverviewDay;
  /** All days in the bucket, for summed values */
  days: OverviewDay[];
}

/** Groups days into weeks (Monday start) for long windows so bar charts stay legible */
export function bucketDays(days: OverviewDay[], weekly: boolean): Bucket[] {
  if (!weekly) return days.map(d => ({ label: formatDayLabel(d.day), last: d, days: [d] }));
  const buckets: Bucket[] = [];
  for (const d of days) {
    const date = new Date(`${d.day}T00:00:00Z`);
    const monday = new Date(date.getTime() - ((date.getUTCDay() + 6) % 7) * 86_400_000);
    const label = formatDayLabel(monday.toISOString().slice(0, 10));
    const current = buckets[buckets.length - 1];
    if (current && current.label === label) {
      current.days.push(d);
      current.last = d;
    } else {
      buckets.push({ label, last: d, days: [d] });
    }
  }
  return buckets;
}

export function sum(days: OverviewDay[], pick: (d: OverviewDay) => number): number {
  return days.reduce((acc, d) => acc + pick(d), 0);
}

/** "34.2M", "815,764" style compact numbers */
export function formatCompact(value: number, digits = 1): string {
  const abs = Math.abs(value);
  if (abs >= 1e6) return `${(value / 1e6).toFixed(digits)}M`;
  if (abs >= 1e4) return `${(value / 1e3).toFixed(digits)}K`;
  return Math.round(value).toLocaleString();
}

/**
 * The most recent earlier day whose value was at or below today's, i.e. today is the lowest since
 * the day after it. Returns null when today is not a low.
 */
export function lowestSince(days: OverviewDay[], pick: (d: OverviewDay) => number): string | null {
  if (days.length < 2) return null;
  const today = pick(days[days.length - 1]);
  for (let i = days.length - 2; i >= 0; i--) {
    if (pick(days[i]) <= today) return days.length - 1 - i > 30 ? days[i].day : null;
  }
  return days[0].day;
}
