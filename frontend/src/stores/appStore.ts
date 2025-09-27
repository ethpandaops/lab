import { create } from 'zustand';
import { Config } from '@/api/client.ts';

interface NetworkState {
  selectedNetwork: string;
  availableNetworks: string[];
  setSelectedNetwork: (network: string) => void;
  setAvailableNetworks: (networks: string[]) => void;
}

interface ConfigState {
  config: Config | null;
  setConfig: (config: Config) => void;
}

interface AppState extends NetworkState, ConfigState {}

export const useAppStore = create<AppState>(set => ({
  selectedNetwork: 'mainnet',
  availableNetworks: [],
  setSelectedNetwork: (network: string) => set(() => ({ selectedNetwork: network })),
  setAvailableNetworks: (networks: string[]) => set(() => ({ availableNetworks: networks })),

  config: null,
  setConfig: (config: Config) => set(() => ({ config })),
}));

export const useNetwork = () => {
  const selectedNetwork = useAppStore(state => state.selectedNetwork);
  const availableNetworks = useAppStore(state => state.availableNetworks);
  const setSelectedNetwork = useAppStore(state => state.setSelectedNetwork);
  const setAvailableNetworks = useAppStore(state => state.setAvailableNetworks);

  return {
    selectedNetwork,
    availableNetworks,
    setSelectedNetwork,
    setAvailableNetworks,
  };
};

export const useConfig = () => {
  const config = useAppStore(state => state.config);
  const setConfig = useAppStore(state => state.setConfig);

  return {
    config,
    setConfig,
  };
};

export default useAppStore;
