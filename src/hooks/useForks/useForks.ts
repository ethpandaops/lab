import { useMemo } from 'react';
import { useNetwork } from '@/hooks/useNetwork';
import { useBeaconClock } from '@/hooks/useBeaconClock';
import { getNetworkForks, getActiveFork, getNextFork } from '@/utils/forks';
import type { UseForksResult } from './useForks.types';

/**
 * Hook to access Ethereum consensus fork information for the current network.
 *
 * This hook:
 * - Gets all configured forks from the network config
 * - Determines the currently active fork based on the beacon clock
 * - Identifies the next upcoming fork
 * - Updates automatically as epochs progress
 *
 * @example
 * ```tsx
 * function ForksDisplay() {
 *   const { allForks, activeFork, nextFork, isLoading } = useForks();
 *
 *   if (isLoading) return <div>Loading...</div>;
 *
 *   return (
 *     <div>
 *       <p>Active Fork: {activeFork?.displayName}</p>
 *       <p>Next Fork: {nextFork?.displayName} at epoch {nextFork?.epoch}</p>
 *       <p>All Forks: {allForks.map(f => f.displayName).join(', ')}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useForks(): UseForksResult {
  const { currentNetwork } = useNetwork();
  const { epoch } = useBeaconClock();

  const allForks = useMemo(() => {
    if (!currentNetwork) return [];
    return getNetworkForks(currentNetwork, epoch);
  }, [currentNetwork, epoch]);

  const activeFork = useMemo(() => {
    if (!currentNetwork) return null;
    return getActiveFork(currentNetwork, epoch);
  }, [currentNetwork, epoch]);

  const nextFork = useMemo(() => {
    if (!currentNetwork) return null;
    return getNextFork(currentNetwork, epoch);
  }, [currentNetwork, epoch]);

  return {
    allForks,
    activeFork,
    nextFork,
    isLoading: !currentNetwork,
  };
}
