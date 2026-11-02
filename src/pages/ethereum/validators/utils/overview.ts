import type { OverviewPeriod } from '../hooks/useOverviewData';

export type CredentialType = '0x00' | '0x01' | '0x02';
export const CREDENTIAL_TYPES: CredentialType[] = ['0x00', '0x01', '0x02'];

/** "Jan 15 '24", the date label format the core charts tick on */
export function formatDayLabel(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  const month = d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
  return `${month} ${d.getUTCDate()} '${String(d.getUTCFullYear()).slice(-2)}`;
}

export type OverviewWindow = '30d' | '90d' | '1y' | '2y' | 'all';

export const OVERVIEW_WINDOW_OPTIONS = [
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: '1y', label: '1y' },
  { value: '2y', label: '2y' },
  { value: 'all', label: 'All' },
] as const;

/** "34.2M", "815,764" style compact numbers */
export function formatCompact(value: number, digits = 1): string {
  const abs = Math.abs(value);
  if (abs >= 1e6) return `${(value / 1e6).toFixed(digits)}M`;
  if (abs >= 1e4) return `${(value / 1e3).toFixed(digits)}K`;
  return Math.round(value).toLocaleString();
}

/**
 * The most recent earlier period whose value was at or below the latest one, i.e. the latest is the
 * lowest since the period after it. Returns null when the latest is not a low.
 */
export function lowestSince(periods: OverviewPeriod[], pick: (p: OverviewPeriod) => number): string | null {
  if (periods.length < 2) return null;
  const latest = pick(periods[periods.length - 1]);
  for (let i = periods.length - 2; i >= 0; i--) {
    if (pick(periods[i]) <= latest) return i < periods.length - 2 ? periods[i].day : null;
  }
  // Lower than everything loaded: the data doesn't say since when
  return null;
}
