import type { Network } from '@/hooks/useConfig';

/** Canonical ordering of well-known persistent networks (mainnet + testnets). */
export const NETWORK_ORDER: readonly string[] = ['mainnet', 'holesky', 'sepolia', 'hoodi'];

/** Short-lived network name split into its family and its label within that family. */
export interface ParsedNetworkName {
  /** Family the network belongs to, e.g. "Glamsterdam" */
  family: string;
  /** Label within the family, e.g. "Devnet 8" */
  label: string;
}

/** Networks shown together under one heading. */
export interface NetworkGroup {
  /** Stable key, e.g. "public", "family:Glamsterdam", "other" */
  id: string;
  /** Heading, e.g. "Public" or "Glamsterdam" */
  label: string;
  networks: Network[];
}

const EPHEMERAL_NETWORK_PATTERN = /^([a-z0-9-]+)-(devnet|shadowfork)-(\d+)$/;

function titleCase(value: string): string {
  return value
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function newestFirst(a: Network, b: Network): number {
  return b.genesis_time - a.genesis_time || a.name.localeCompare(b.name);
}

/**
 * Parses ethPandaOps devnet and shadowfork names such as `glamsterdam-devnet-8`
 * or `fusaka-mainnet-shadowfork-0`. Returns null for any other name.
 */
export function parseNetworkName(name: string): ParsedNetworkName | null {
  const match = EPHEMERAL_NETWORK_PATTERN.exec(name);
  if (!match) {
    return null;
  }

  const [, family, kind, index] = match;
  return { family: titleCase(family), label: `${titleCase(kind)} ${index}` };
}

/** Label for a network within its group: "Devnet 8" for `glamsterdam-devnet-8`, otherwise its display name. */
export function getNetworkShortLabel(network: Network): string {
  return parseNetworkName(network.name)?.label ?? network.display_name;
}

/** Standalone label for a network: "Glamsterdam Devnet 8" for `glamsterdam-devnet-8`, otherwise its display name. */
export function getNetworkFullLabel(network: Network): string {
  const parsed = parseNetworkName(network.name);
  return parsed ? `${parsed.family} ${parsed.label}` : network.display_name;
}

/**
 * Groups networks for display: public networks in canonical order, then one group per
 * devnet family (newest family first, newest network first), then anything unrecognised.
 * Empty groups are omitted.
 */
export function groupNetworks(networks: Network[]): NetworkGroup[] {
  const publicNetworks = networks
    .filter(network => NETWORK_ORDER.includes(network.name))
    .sort((a, b) => NETWORK_ORDER.indexOf(a.name) - NETWORK_ORDER.indexOf(b.name));

  const families = new Map<string, Network[]>();
  const other: Network[] = [];

  for (const network of networks) {
    if (NETWORK_ORDER.includes(network.name)) {
      continue;
    }

    const parsed = parseNetworkName(network.name);
    if (!parsed) {
      other.push(network);
      continue;
    }

    families.set(parsed.family, [...(families.get(parsed.family) ?? []), network]);
  }

  const familyGroups: NetworkGroup[] = [...families]
    .map(([family, members]) => ({ id: `family:${family}`, label: family, networks: members.sort(newestFirst) }))
    .sort((a, b) => newestFirst(a.networks[0], b.networks[0]));

  return [
    { id: 'public', label: 'Public', networks: publicNetworks },
    ...familyGroups,
    { id: 'other', label: 'Other', networks: other.sort((a, b) => a.name.localeCompare(b.name)) },
  ].filter(group => group.networks.length > 0);
}
