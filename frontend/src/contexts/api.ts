import { useContext as reactUseContext, createContext, useState } from 'react';
import { LabApiClient } from '@/api/client.ts';

export const Context = createContext<State | undefined>(undefined);

export default function useContext() {
  const context = reactUseContext(Context);
  if (context === undefined) {
    throw new Error('API context must be used within a API provider');
  }
  return context;
}

export interface State {
  client: LabApiClient;
  setClient: (client: LabApiClient) => void;
}

export interface ValueProps {
  client: LabApiClient;
}

export function useValue(props: ValueProps): State {
  const [client, setClient] = useState<LabApiClient>(props.client);

  return {
    client,
    setClient,
  };
}
