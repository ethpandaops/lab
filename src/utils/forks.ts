import type { Network, BlobScheduleItem } from '@/hooks/useConfig';
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

/**
 * Map of fork versions to their display names.
 */
export const FORK_DISPLAY_NAMES: Record<ForkVersion, string> = {
  phase0: 'Phase 0',
  altair: 'Altair',
  bellatrix: 'Bellatrix',
  capella: 'Capella',
  deneb: 'Deneb',
  electra: 'Electra',
  fulu: 'Fulu',
  glaos: 'Glaos',
};

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

  // Handle case where network.forks or network.forks.consensus is missing
  if (!network?.forks?.consensus) {
    return forks;
  }

  for (const forkName of FORK_ORDER) {
    const fork = network.forks.consensus[forkName];
    const metadata = FORK_METADATA[forkName];

    // Always include phase0 as the genesis fork at epoch 0, even if not in config
    if (forkName === 'phase0' && !fork && metadata) {
      forks.push({
        name: forkName,
        displayName: metadata.name,
        emoji: metadata.emoji,
        color: metadata.color,
        description: metadata.description,
        epoch: 0,
        isActive: currentEpoch !== undefined ? currentEpoch >= 0 : false,
        executionName: metadata.executionName,
        combinedName: metadata.combinedName,
      });
    } else if (fork && metadata) {
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

/**
 * Valid URL slugs for fork pages.
 * Includes both consensus fork names (phase0, altair, etc.)
 * and combined upgrade names (merge, shapella, dencun, pectra, fusaka).
 */
export const VALID_FORK_SLUGS = [
  // Consensus fork names
  'phase0',
  'altair',
  'bellatrix',
  'capella',
  'deneb',
  'electra',
  'fulu',
  'glaos',
  // Combined upgrade names
  'merge',
  'shapella',
  'dencun',
  'pectra',
  'fusaka',
] as const;

export type ForkSlug = (typeof VALID_FORK_SLUGS)[number];

/**
 * Check if a string is a valid fork slug.
 *
 * @param slug - String to validate
 * @returns True if the slug is a valid fork identifier
 */
export function isValidForkSlug(slug: string): slug is ForkSlug {
  return VALID_FORK_SLUGS.includes(slug as ForkSlug);
}

/**
 * Find a fork by its URL slug.
 * Accepts both consensus fork names (e.g., "deneb") and combined upgrade names (e.g., "dencun").
 *
 * @param network - Network configuration
 * @param slug - Fork URL slug (consensus name or combined name)
 * @param currentEpoch - Current epoch for isActive calculation
 * @returns Fork info, or null if not found or not configured on this network
 *
 * @example
 * ```tsx
 * // Find by consensus name
 * const fork = getForkBySlug(network, 'deneb', currentEpoch);
 *
 * // Find by combined name
 * const fork = getForkBySlug(network, 'dencun', currentEpoch);
 * ```
 */
export function getForkBySlug(network: Network, slug: string, currentEpoch?: number): ForkInfo | null {
  if (!isValidForkSlug(slug)) {
    return null;
  }

  const forks = getNetworkForks(network, currentEpoch);

  // First, try to find by exact consensus fork name
  const byName = forks.find(f => f.name === slug);
  if (byName) {
    return byName;
  }

  // Then, try to find by combined name
  const byCombinedName = forks.find(f => f.combinedName === slug);
  if (byCombinedName) {
    return byCombinedName;
  }

  return null;
}

/**
 * Get the canonical URL slug for a fork.
 * Prefers the combined name if available (e.g., "dencun" instead of "deneb").
 *
 * @param fork - Fork info object
 * @returns URL-safe slug for the fork
 */
export function getForkSlug(fork: ForkInfo): string {
  return fork.combinedName ?? fork.name;
}

/**
 * Information about a Blob Parameter-Only (BPO) fork.
 * BPO forks are blob schedule changes that happen independently of consensus forks.
 */
export interface BPOInfo {
  /** BPO identifier (e.g., "bpo1", "bpo2") */
  slug: string;
  /** Display name (e.g., "BPO1", "BPO2") */
  displayName: string;
  /** Emoji for the BPO fork */
  emoji: string;
  /** Description of the BPO fork */
  description: string;
  /** Activation epoch */
  epoch: number;
  /** Max blobs per block after this BPO */
  maxBlobsPerBlock: number;
  /** Whether this BPO is currently active */
  isActive: boolean;
  /** The parent consensus fork this BPO is associated with */
  parentFork: ForkInfo;
  /** BPO sequence number (1, 2, 3, etc.) */
  sequenceNumber: number;
}

/**
 * Get all BPO (Blob Parameter-Only) forks for a network.
 * BPOs are blob schedule changes that occur at epochs different from their parent consensus fork.
 *
 * @param network - Network configuration
 * @param currentEpoch - Current epoch for isActive calculation
 * @returns Array of BPO information, sorted by epoch (ascending)
 */
export function getNetworkBPOs(network: Network, currentEpoch?: number): BPOInfo[] {
  if (!network.blob_schedule || network.blob_schedule.length === 0) {
    return [];
  }

  const forks = getNetworkForks(network, currentEpoch);
  const bpos: BPOInfo[] = [];
  let bpoCount = 0;

  // Sort blob schedule by epoch
  const sortedBlobSchedule = [...network.blob_schedule].sort((a, b) => a.epoch - b.epoch);

  for (const blobItem of sortedBlobSchedule) {
    // Find the parent fork for this blob schedule item
    // The parent fork is the most recent fork that activated at or before this epoch
    const parentFork = forks.filter(f => f.epoch <= blobItem.epoch).pop();
    if (!parentFork) continue;

    // Check if this blob schedule item activates at the same epoch as the parent fork
    // If so, it's part of the fork itself, not a BPO
    if (blobItem.epoch === parentFork.epoch) {
      continue;
    }

    // This is a BPO - a blob schedule change independent of a consensus fork
    bpoCount++;
    const slug = `bpo${bpoCount}`;

    bpos.push({
      slug,
      displayName: `BPO${bpoCount}`,
      emoji: '📦',
      description: `Blob Parameter-Only Fork ${bpoCount} - Increases max blobs per block to ${blobItem.max_blobs_per_block}`,
      epoch: blobItem.epoch,
      maxBlobsPerBlock: blobItem.max_blobs_per_block,
      isActive: currentEpoch !== undefined ? currentEpoch >= blobItem.epoch : false,
      parentFork,
      sequenceNumber: bpoCount,
    });
  }

  return bpos;
}

/**
 * Find a BPO by its slug (e.g., "bpo1", "bpo2").
 *
 * @param network - Network configuration
 * @param slug - BPO slug (e.g., "bpo1")
 * @param currentEpoch - Current epoch for isActive calculation
 * @returns BPO info, or null if not found
 */
export function getBPOBySlug(network: Network, slug: string, currentEpoch?: number): BPOInfo | null {
  const bpos = getNetworkBPOs(network, currentEpoch);
  return bpos.find(bpo => bpo.slug === slug) ?? null;
}

/**
 * Check if a slug is a valid BPO slug (bpo1, bpo2, etc.).
 *
 * @param slug - String to check
 * @returns True if this is a BPO slug pattern
 */
export function isBPOSlug(slug: string): boolean {
  return /^bpo\d+$/i.test(slug);
}

/**
 * Get the slug for a BPO based on its blob schedule item.
 *
 * @param network - Network configuration
 * @param blobItem - Blob schedule item
 * @param currentEpoch - Current epoch for isActive calculation
 * @returns BPO slug, or null if this blob item is not a BPO
 */
export function getBPOSlugForBlobItem(
  network: Network,
  blobItem: BlobScheduleItem,
  currentEpoch?: number
): string | null {
  const bpos = getNetworkBPOs(network, currentEpoch);
  const bpo = bpos.find(b => b.epoch === blobItem.epoch);
  return bpo?.slug ?? null;
}
