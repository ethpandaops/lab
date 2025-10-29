import { type JSX, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useConfig } from '@/hooks/useConfig';
import { useBounds } from '@/hooks/useBounds';
import type { Network } from '@/hooks/useNetwork';
import { NetworkContext, type NetworkContextValue } from '@/contexts/NetworkContext';
import { client } from '@/api/client.gen';
import { BASE_URL, PATH_PREFIX, isRootPath } from '@/utils/api-config';

interface NetworkProviderProps {
  children: ReactNode;
}

/**
 * Internal component that fetches bounds data for the current network.
 * This runs at the app-wide level to keep bounds fresh in the cache.
 */
function BoundsLoader(): null {
  useBounds(); // Fetch and cache bounds, don't use the data here
  return null;
}

/**
 * Provider component that manages network state across the application.
 *
 * This provider:
 * - Fetches available networks from the config
 * - Defaults to "mainnet" if available, otherwise the first network
 * - Persists network selection in URL query parameters (for shareable links)
 * - Provides network context to all child components
 *
 * @example
 * ```tsx
 * <NetworkProvider>
 *   <App />
 * </NetworkProvider>
 * ```
 */
export function NetworkProvider({ children }: NetworkProviderProps): JSX.Element | null {
  const queryClient = useQueryClient();
  const { data: config, isLoading } = useConfig();
  const networks = useMemo(() => config?.networks ?? [], [config?.networks]);

  // Router hooks - will be called but may not work in Storybook
  // The warnings in Storybook are expected and don't break functionality
  const navigate = useNavigate();
  const search = useSearch({ strict: false });
  const hasRouter = navigate !== undefined && search !== undefined;

  const [currentNetwork, setCurrentNetworkState] = useState<Network | null>(null);

  // Use ref to avoid stale closures in the interceptor
  const currentNetworkRef = useRef<Network | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    currentNetworkRef.current = currentNetwork;
  }, [currentNetwork]);

  // Set up request interceptor to rewrite URLs (only once)
  useEffect(() => {
    const unsubscribe = client.interceptors.request.use(async request => {
      const url = new URL(request.url);

      if (!isRootPath(url.pathname)) {
        if (!currentNetworkRef.current) {
          return request;
        }

        // Only rewrite if network is not already in the path
        const expectedPath = `${BASE_URL}${PATH_PREFIX}/${currentNetworkRef.current.name}/`;
        if (!url.pathname.startsWith(expectedPath)) {
          url.pathname = url.pathname.replace(`${BASE_URL}${PATH_PREFIX}/`, expectedPath);

          // Create new request with rewritten URL
          request = new Request(url.toString(), request);
        }
      }

      return request;
    });

    return () => {
      // unsubscribe is the index, not a function - remove from array manually
      const index = client.interceptors.request.fns.indexOf(unsubscribe as never);
      if (index > -1) {
        client.interceptors.request.fns.splice(index, 1);
      }
    };
  }, []); // Only run once on mount - ref will always have latest value

  // Initialize current network from URL params or default
  useEffect(() => {
    if (!networks.length || currentNetwork) return;

    const urlNetworkName = search.network;
    let initialNetwork: Network | undefined;

    if (urlNetworkName) {
      initialNetwork = networks.find(n => n.name === urlNetworkName);
    }

    if (!initialNetwork) {
      // Default to mainnet if it exists, otherwise first network
      initialNetwork = networks.find(n => n.name === 'mainnet') ?? networks[0];
    }

    if (initialNetwork) {
      setCurrentNetworkState(initialNetwork);

      // Update URL to match the network selection (only if router is available)
      // Remove network param for mainnet (it's the default)
      // Add/update network param for non-mainnet networks
      if (hasRouter) {
        const shouldHaveParam = initialNetwork.name !== 'mainnet';
        const hasParam = search.network !== undefined;

        if (shouldHaveParam && search.network !== initialNetwork.name) {
          // Non-mainnet network: add/update the param
          navigate({
            to: '.',
            search: { network: initialNetwork.name },
            replace: true,
          });
        } else if (!shouldHaveParam && hasParam) {
          // Mainnet: remove the param by setting to undefined
          navigate({
            to: '.',
            search: { network: undefined },
            replace: true,
          });
        }
      }
    }
  }, [networks, currentNetwork, search.network, navigate, hasRouter]);

  // Invalidate queries when network changes (URL rewriting happens in interceptor)
  useEffect(() => {
    if (currentNetwork) {
      // Invalidate all network-specific queries to refetch with new network
      // Don't invalidate admin queries (config, etc)
      queryClient.invalidateQueries({
        predicate: query => {
          const queryKey = query.queryKey[0];
          if (typeof queryKey === 'string') {
            return !['config', 'bounds'].includes(queryKey);
          }
          return true;
        },
      });
    }
  }, [currentNetwork, queryClient]);

  const setCurrentNetwork = useCallback(
    (network: Network): void => {
      setCurrentNetworkState(network);

      // Only add network param for non-mainnet networks (if router is available)
      if (hasRouter) {
        if (network.name === 'mainnet') {
          // Remove the network param for mainnet (it's the default)
          // Use undefined to explicitly remove the param
          navigate({
            to: '.',
            search: { network: undefined },
          });
        } else {
          // Add/update network param for non-mainnet networks
          navigate({
            to: '.',
            search: { network: network.name },
          });
        }
      }
    },
    [navigate, hasRouter]
  );

  const value: NetworkContextValue = useMemo(
    () => ({
      currentNetwork,
      setCurrentNetwork,
      networks,
      isLoading,
    }),
    [currentNetwork, setCurrentNetwork, networks, isLoading]
  );

  // Block rendering until network is initialized to prevent race condition
  if (!currentNetwork) {
    return null;
  }

  return (
    <NetworkContext.Provider value={value}>
      <BoundsLoader />
      {children}
    </NetworkContext.Provider>
  );
}
