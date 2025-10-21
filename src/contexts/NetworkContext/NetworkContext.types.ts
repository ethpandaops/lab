import type { Network } from '@/hooks/useNetwork';

export interface NetworkContextValue {
  currentNetwork: Network | null;
  setCurrentNetwork: (network: Network) => void;
  networks: Network[];
  isLoading: boolean;
}
