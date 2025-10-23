import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useConfig } from '@/hooks/useConfig';
import { useNetwork } from '@/hooks/useNetwork';
import { fctNodeActiveLast24hServiceListOptions } from '@/api/@tanstack/react-query.gen';
import { processForkReadiness } from '../../utils/fork-data-processor';
import { getTimeToEpoch, formatTimeRemaining } from '../../utils/time-utils';
import type { UseForkReadinessReturn } from './useForkReadiness.types';
import type { ForkReadinessStats } from '../../utils/fork-data-processor.types';
import type { Network } from '@/hooks/useConfig/useConfig.types';

/**
 * Get all forks from config (consensus forks) for the current network
 * Returns array of { name, epoch, min_client_versions }
 */
function getAllForks(network: Network): Array<{
  name: string;
  epoch: number;
  min_client_versions: Record<string, string>;
}> {
  const consensusForks = network.forks.consensus;
  const forks: Array<{
    name: string;
    epoch: number;
    min_client_versions: Record<string, string>;
  }> = [];

  // Iterate through all consensus forks
  for (const [name, fork] of Object.entries(consensusForks)) {
    if (fork) {
      // Convert MinClientVersions to Record<string, string>
      const minVersions: Record<string, string> = {};
      for (const [client, version] of Object.entries(fork.min_client_versions)) {
        if (typeof version === 'string') {
          minVersions[client] = version;
        }
      }

      forks.push({
        name,
        epoch: fork.epoch,
        min_client_versions: minVersions as Record<string, string>,
      });
    }
  }

  return forks;
}

export function useForkReadiness(): UseForkReadinessReturn {
  // 1. Get current network and config
  const { currentNetwork } = useNetwork();
  const { data: config, isLoading: configLoading, error: configError } = useConfig();

  // 2. Fetch node data (3 parallel queries like Contributoors)
  const { data: pubData, isLoading: pubLoading } = useQuery({
    ...fctNodeActiveLast24hServiceListOptions({
      query: { meta_client_name_starts_with: 'pub-', page_size: 1000 },
    }),
  });

  const { data: corpData, isLoading: corpLoading } = useQuery({
    ...fctNodeActiveLast24hServiceListOptions({
      query: { meta_client_name_starts_with: 'corp-', page_size: 1000 },
    }),
  });

  const { data: ethpandaopsData, isLoading: ethpandaopsLoading } = useQuery({
    ...fctNodeActiveLast24hServiceListOptions({
      query: { meta_client_name_starts_with: 'ethpandaops', page_size: 1000 },
    }),
  });

  // 3. Combine loading states
  const isLoading = configLoading || pubLoading || corpLoading || ethpandaopsLoading;

  // 4. Combine all node data
  const allNodes = useMemo(
    () => [
      ...(pubData?.fct_node_active_last_24h ?? []),
      ...(corpData?.fct_node_active_last_24h ?? []),
      ...(ethpandaopsData?.fct_node_active_last_24h ?? []),
    ],
    [pubData, corpData, ethpandaopsData]
  );

  // 5. Process all forks
  const { upcomingForks, pastForks } = useMemo(() => {
    if (!config || !currentNetwork || allNodes.length === 0) {
      return { upcomingForks: [], pastForks: [] };
    }

    const allForks = getAllForks(currentNetwork);
    const upcoming: ForkReadinessStats[] = [];
    const past: ForkReadinessStats[] = [];

    for (const fork of allForks) {
      const timeData = getTimeToEpoch(fork.epoch, currentNetwork.genesis_time);
      const isPast = timeData.isPast;
      const timeRemaining = formatTimeRemaining(timeData);

      const stats = processForkReadiness(
        {
          allNodes,
          minClientVersions: fork.min_client_versions,
        },
        fork.name,
        fork.epoch,
        isPast
      );

      const fullStats: ForkReadinessStats = {
        ...stats,
        forkName: fork.name,
        forkEpoch: fork.epoch,
        timeRemaining,
        isPast,
      };

      if (isPast) {
        past.push(fullStats);
      } else {
        upcoming.push(fullStats);
      }
    }

    // Sort upcoming by epoch (soonest first)
    upcoming.sort((a, b) => a.forkEpoch - b.forkEpoch);
    // Sort past by epoch (most recent first)
    past.sort((a, b) => b.forkEpoch - a.forkEpoch);

    return { upcomingForks: upcoming, pastForks: past };
  }, [config, currentNetwork, allNodes]);

  return {
    upcomingForks,
    pastForks,
    isLoading,
    error: configError ?? null,
  };
}
