import type { ForkVersion } from './beacon';

/**
 * Chronological fork order. Lives in its own module (rather than beacon.ts or
 * forks.ts, which import each other) so both can use it at module scope
 * without a circular-initialization hazard.
 */
export const CANONICAL_FORK_ORDER: readonly ForkVersion[] = [
  'phase0',
  'altair',
  'bellatrix',
  'capella',
  'deneb',
  'electra',
  'fulu',
  'gloas',
] as const;

/**
 * True when fork is the target fork or a later one. Prefer this over
 * string-equality checks so future forks inherit behaviour automatically.
 */
export function isForkAtOrAfter(fork: ForkVersion, target: ForkVersion): boolean {
  const forkIndex = CANONICAL_FORK_ORDER.indexOf(fork);
  const targetIndex = CANONICAL_FORK_ORDER.indexOf(target);

  return forkIndex >= 0 && targetIndex >= 0 && forkIndex >= targetIndex;
}
