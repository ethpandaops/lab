import { formatCompact } from '@/pages/ethereum/validators/utils/overview';

const DAY_MS = 86_400_000;

const toMs = (day: string): number => Date.parse(`${day}T00:00:00Z`);
const toDay = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

/** UTC date (YYYY-MM-DD) of a Unix timestamp in seconds */
export function dayOf(seconds: number): string {
  return toDay(seconds * 1000);
}

/** The day `days` before `day` */
export function addDays(day: string, days: number): string {
  return toDay(toMs(day) + days * DAY_MS);
}

/**
 * Days from `first` to `latest`, `step` days apart and counted back from `latest`, oldest first.
 * `latest` is always included; `first` only when it falls on the step.
 */
export function daysBack(first: string, latest: string, step: number): string[] {
  const days: string[] = [];
  for (let ms = toMs(latest); ms >= toMs(first); ms -= step * DAY_MS) days.unshift(toDay(ms));
  return days;
}

/**
 * Up to `count` evenly spaced days from `first` to `latest`, oldest first, both ends included.
 * Shorter spans return each day once.
 */
export function sampleDays(first: string, latest: string, count: number): string[] {
  const start = toMs(first);
  const span = Math.max(0, Math.round((toMs(latest) - start) / DAY_MS));
  const days = new Set<string>();
  for (let i = 0; i < count; i++) days.add(toDay(start + Math.round((span * i) / (count - 1)) * DAY_MS));
  return [...days];
}

/**
 * The fewest of the largest stakes that together reach `fraction` of `total`, and the share of `total`
 * they hold. Null when all of them together fall short.
 */
export function entitiesToReach(
  stakes: number[],
  total: number,
  fraction: number
): { count: number; share: number } | null {
  if (total <= 0) return null;
  const sorted = [...stakes].sort((a, b) => b - a);
  let sum = 0;
  for (const [i, stake] of sorted.entries()) {
    sum += stake;
    if (sum >= total * fraction) return { count: i + 1, share: sum / total };
  }
  return null;
}

/** Signed ETH amount, such as "+412.3K ETH" */
export function formatEthChange(eth: number): string {
  const rounded = Math.round(eth);
  return `${rounded > 0 ? '+' : ''}${formatCompact(rounded)} ETH`;
}
