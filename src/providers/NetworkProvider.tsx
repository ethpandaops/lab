import { type JSX, type ReactNode, useEffect, useMemo, useState } from 'react';
import { useConfig } from '@/hooks/useConfig';
import type { Network } from '@/types/config';
import { NetworkContext, type NetworkContextValue } from '@contexts/NetworkContext';

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
export function NetworkProvider({ children }: NetworkProviderProps): JSX.Element {
  const { data: config, isLoading } = useConfig();
  const networks = useMemo(() => config?.networks ?? [], [config?.networks]);

  const [currentNetwork, setCurrentNetworkState] = useState<Network | null>(null);

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

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}
