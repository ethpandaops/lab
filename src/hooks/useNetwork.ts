import { useContext } from 'react';
import { NetworkContext, type NetworkContextValue } from '@contexts/NetworkContext';

/**
 * Hook to access the current network and switch between networks.
 *
 * This hook provides access to the network context, which includes:
 * - currentNetwork: The currently selected network
 * - setCurrentNetwork: Function to switch to a different network
 * - networks: All available networks from the config
 * - isLoading: Whether the config is still loading
 *
 * The network defaults to "mainnet" if available, otherwise the first network in the list.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { currentNetwork, setCurrentNetwork, networks } = useNetwork();
 *
 *   if (!currentNetwork) return <div>Loading...</div>;
 *
 *   return (
 *     <div>
 *       <p>Current: {currentNetwork.display_name}</p>
 *       <select onChange={(e) => {
 *         const network = networks.find(n => n.name === e.target.value);
 *         if (network) setCurrentNetwork(network);
 *       }}>
 *         {networks.map(n => <option key={n.name} value={n.name}>{n.display_name}</option>)}
 *       </select>
 *     </div>
 *   );
 * }
 * ```
 *
 * @throws {Error} If used outside of NetworkProvider
 */
export function useNetwork(): NetworkContextValue {
  const context = useContext(NetworkContext);

  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }

  return context;
}
