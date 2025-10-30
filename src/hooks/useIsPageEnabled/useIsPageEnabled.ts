import { useMemo } from 'react';
import { useConfig } from '@/hooks/useConfig';
import { useNetwork } from '@/hooks/useNetwork';

/**
 * Hook to check if a page/route is enabled for the current network.
 *
 * Uses the features config to determine if a page should be visible.
 * By default, all pages are enabled unless explicitly controlled via features config.
 *
 * A page is enabled if:
 * 1. It's not in the features config (defaults to enabled)
 * 2. OR it's in the config with enabled !== false AND current network is NOT in disabled_networks
 *
 * @param path - The route path to check (e.g., "/ethereum/live")
 * @returns boolean - true if page should be shown, false otherwise
 *
 * @example
 * Sparse config - only list pages you want to control:
 * ```json
 * {
 *   "features": [
 *     {
 *       "path": "/ethereum/data-availability/das-custody",
 *       "disabled_networks": ["mainnet"]
 *     }
 *   ]
 * }
 * ```
 *
 * @example
 * ```tsx
 * function MyLink() {
 *   const isEnabled = useIsPageEnabled('/ethereum/das-custody');
 *   if (!isEnabled) return null;
 *   return <Link to="/ethereum/das-custody">DAS Custody</Link>;
 * }
 * ```
 */
export function useIsPageEnabled(path: string): boolean {
  const { data: config } = useConfig();
  const { currentNetwork } = useNetwork();

  return useMemo(() => {
    // If no config or features, default to enabled
    if (!config?.features || !currentNetwork) {
      return true;
    }

    // Find the feature for this path
    const feature = config.features.find(f => f.path === path);

    // If not in features config, default to enabled
    if (!feature) {
      return true;
    }

    // Check if current network is in the disabled list
    if (feature.disabled_networks?.includes(currentNetwork.name)) {
      return false;
    }

    return true;
  }, [config, currentNetwork, path]);
}
