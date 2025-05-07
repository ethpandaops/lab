import { useContext as reactUseContext, createContext, useState } from 'react';

export const Context = createContext<State | undefined>(undefined);

export default function useContext() {
  const context = reactUseContext(Context);
  if (context === undefined) {
    throw new Error('Network context must be used within a Network provider');
  }
  return context;
}

export interface State {
  selectedNetwork: string;
  setSelectedNetwork: (network: string) => void;
  availableNetworks: string[];
  setAvailableNetworks: (networks: string[]) => void;
}

export interface ValueProps {
  selectedNetwork: string;
  availableNetworks: string[];
}

export function useValue(props: ValueProps): State {
  const [selectedNetwork, setSelectedNetwork] = useState<string>(props.selectedNetwork);
  const [availableNetworks, setAvailableNetworks] = useState<string[]>(props.availableNetworks);

  return {
    selectedNetwork,
    setSelectedNetwork,
    availableNetworks,
    setAvailableNetworks,
  };
}
