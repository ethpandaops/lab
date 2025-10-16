import { type JSX, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useConfig } from '@/hooks/useConfig';
import type { Network } from '@/hooks/useNetwork';
import { NetworkContext, type NetworkContextValue } from '@/contexts/NetworkContext';
import { client } from '@/api/client.gen';
import { BASE_URL, PATH_PREFIX, isRootPath } from '@/utils/api-config';

interface NetworkProviderProps {
  children: ReactNode;
}

/**
 * Provider component that manages network state across the application.
 *
 * This provider:
 * - Fetches available networks from the config
 * - Defaults to "mainnet" if available, otherwise the first network
 * - Persists network selection in localStorage
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

  // Initialize current network from localStorage or default
  useEffect(() => {
    if (!networks.length || currentNetwork) return;

    const storedNetworkName = localStorage.getItem('lab-selected-network');
    let initialNetwork: Network | undefined;

    if (storedNetworkName) {
      initialNetwork = networks.find(n => n.name === storedNetworkName);
    }

    if (!initialNetwork) {
      // Default to mainnet if it exists, otherwise first network
      initialNetwork = networks.find(n => n.name === 'mainnet') ?? networks[0];
    }

    if (initialNetwork) {
      setCurrentNetworkState(initialNetwork);
    }
  }, [networks, currentNetwork]);

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

  const setCurrentNetwork = (network: Network): void => {
    setCurrentNetworkState(network);
    localStorage.setItem('lab-selected-network', network.name);
  };

  const value: NetworkContextValue = useMemo(
    () => ({
      currentNetwork,
      setCurrentNetwork,
      networks,
      isLoading,
    }),
    [currentNetwork, networks, isLoading]
  );

  // Block rendering until network is initialized to prevent race condition
  if (!currentNetwork) {
    return null;
  }

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}
