import type { Network } from '@/hooks/useConfig/useConfig.types';

/** A fork's minimum version for one client, from the network config */
export interface ForkRequirement {
  fork: string;
  epoch: number;
  minVersion: string;
}

/**
 * Forks that set a minimum version for the client, newest first.
 */
export function forkRequirements(network: Network | null | undefined, client: string): ForkRequirement[] {
  if (!network) return [];
  return Object.entries(network.forks.consensus ?? {})
    .flatMap(([fork, config]) => {
      const minVersion = (config?.min_client_versions as Record<string, string | undefined> | undefined)?.[client];
      return config && minVersion ? [{ fork, epoch: config.epoch, minVersion }] : [];
    })
    .sort((a, b) => b.epoch - a.epoch);
}
