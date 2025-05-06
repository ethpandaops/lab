import { createContext } from 'react';

interface NetworkContextType {
  selectedNetwork: string;
  setSelectedNetwork: (network: string) => void;
  availableNetworks: string[];
}

export default createContext<NetworkContextType>({
  selectedNetwork: 'mainnet',
  setSelectedNetwork: () => {},
  availableNetworks: ['mainnet'],
});
