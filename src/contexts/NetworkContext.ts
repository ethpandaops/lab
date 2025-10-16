import { createContext } from 'react';
import type { Network } from '@/types/config';

export interface NetworkContextValue {
  currentNetwork: Network | null;
  setCurrentNetwork: (network: Network) => void;
  networks: Network[];
  isLoading: boolean;
}

export const NetworkContext = createContext<NetworkContextValue | undefined>(undefined);
