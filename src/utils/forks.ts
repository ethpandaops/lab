import type { Network } from '@/hooks/useConfig';
import { FORK_METADATA, type ForkVersion } from './beacon';

/**
 * Fork names in chronological order.
 * This order is critical for determining fork activation and precedence.
 */
export const FORK_ORDER: readonly ForkVersion[] = [
  'phase0',
  'altair',
  'bellatrix',
  'capella',
  'deneb',
  'electra',
  'fulu',
  'glaos',
] as const;

export type ForkName = ForkVersion;

export interface ForkInfo {
  name: ForkName;
  displayName: string;
  emoji: string;
  color: string;
  description: string;
  epoch: number;
  isActive: boolean;
  executionName?: string;
  combinedName?: string;
}

/**
 * Get all configured forks for a network, sorted by activation epoch.
 *
 * @param network - Network configuration
 * @returns Array of fork information, sorted by epoch (ascending)
 *
 * @example
 * ```tsx
 * const forks = getNetworkForks(network);
 * // [{ name: 'phase0', displayName: 'Phase 0', epoch: 0, isActive: true }, ...]
 * ```
 */
export function getNetworkForks(network: Network, currentEpoch?: number): ForkInfo[] {
  const forks: ForkInfo[] = [];

  for (const forkName of FORK_ORDER) {
    const fork = network.forks.consensus[forkName];
    const metadata = FORK_METADATA[forkName];
    if (fork && metadata) {
      forks.push({
        name: forkName,
        displayName: metadata.name,
        emoji: metadata.emoji,
        color: metadata.color,
        description: metadata.description,
        epoch: fork.epoch,
        isActive: currentEpoch !== undefined ? currentEpoch >= fork.epoch : false,
        executionName: metadata.executionName,
        combinedName: metadata.combinedName,
      });
    }
  }

  // Sort by epoch (ascending)
  return forks.sort((a, b) => a.epoch - b.epoch);
}

/**
 * Get the active fork for a given epoch.
 * Returns the most recent fork that has been activated at or before the given epoch.
 *
 * @param network - Network configuration
 * @param epoch - Epoch number to check
 * @returns Active fork info, or null if no fork is active (shouldn't happen in practice)
 *
 * @example
 * ```tsx
 * const activeFork = getActiveFork(network, 100000);
 * // { name: 'deneb', displayName: 'Deneb', epoch: 132608, isActive: true }
 * ```
 */
export function getActiveFork(network: Network, epoch: number): ForkInfo | null {
  const forks = getNetworkForks(network);

  // Filter to only forks that are active at this epoch
  const activeForks = forks.filter(f => epoch >= f.epoch);

  // Return the most recent one (last in the filtered list, since they're sorted by epoch)
  if (activeForks.length === 0) {
    return null;
  }

  const fork = activeForks[activeForks.length - 1];
  return {
    ...fork,
    isActive: true,
  };
}

/**
 * Get the next upcoming fork after a given epoch.
 * Returns null if there are no upcoming forks.
 *
 * @param network - Network configuration
 * @param epoch - Current epoch number
 * @returns Next fork info, or null if no upcoming fork
 *
 * @example
 * ```tsx
 * const nextFork = getNextFork(network, 100000);
 * // { name: 'electra', displayName: 'Electra', epoch: 222464, isActive: false }
 * ```
 */
export function getNextFork(network: Network, epoch: number): ForkInfo | null {
  const forks = getNetworkForks(network);

  // Filter to only forks that haven't activated yet
  const upcomingForks = forks.filter(f => epoch < f.epoch);

  // Return the first one (earliest upcoming fork)
  if (upcomingForks.length === 0) {
    return null;
  }

  return {
    ...upcomingForks[0],
    isActive: false,
  };
}

/**
 * Check if a specific fork is active at a given epoch.
 * A fork is "active" if its activation epoch has been reached or passed.
 *
 * @param network - Network configuration
 * @param forkName - Name of the fork to check
 * @param epoch - Epoch number to check (optional, uses current epoch if not provided)
 * @returns True if the fork is active, false otherwise
 *
 * @example
 * ```tsx
 * const isDenebActive = isForkActive(network, 'deneb', 150000);
 * // true (if deneb activated at epoch < 150000)
 * ```
 */
export function isForkActive(network: Network, forkName: ForkName, epoch?: number): boolean {
  const fork = network.forks.consensus[forkName];
  if (!fork) {
    return false;
  }

  if (epoch === undefined) {
    // If no epoch provided, we can't determine if it's active
    return false;
  }

  return epoch >= fork.epoch;
}

/**
 * Get the epoch when a fork activates.
 *
 * @param network - Network configuration
 * @param forkName - Name of the fork
 * @returns Fork activation epoch, or null if fork not configured
 *
 * @example
 * ```tsx
 * const denebEpoch = getForkEpoch(network, 'deneb');
 * // 132608
 * ```
 */
export function getForkEpoch(network: Network, forkName: ForkName): number | null {
  const fork = network.forks.consensus[forkName];
  return fork?.epoch ?? null;
}

/**
 * Get all forks that activate at a specific epoch.
 * Multiple forks can activate simultaneously (e.g., at genesis).
 *
 * @param network - Network configuration
 * @param epoch - Epoch number
 * @returns Array of fork info for forks activating at this epoch
 *
 * @example
 * ```tsx
 * const genesisActivations = getForksAtEpoch(network, 0);
 * // [{ name: 'phase0', displayName: 'Phase 0', epoch: 0, isActive: true }]
 * ```
 */
export function getForksAtEpoch(network: Network, epoch: number): ForkInfo[] {
  const forks = getNetworkForks(network);
  return forks.filter(f => f.epoch === epoch).map(f => ({ ...f, isActive: true }));
}
