import { createContext } from 'react';

interface NetworkContextType {
  selectedNetwork: string;
  setSelectedNetwork: (network: string, source?: 'ui' | 'url') => void;
  availableNetworks: string[];
}

export default createContext<NetworkContextType>({
  selectedNetwork: 'mainnet',
  setSelectedNetwork: () => {},
  availableNetworks: ['mainnet'],
});
