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
  baseUrl: string;
  setBaseUrl: (baseUrl: string) => void;
}

export interface ValueProps {
  client: LabApiClient;
  baseUrl: string;
}

export function useValue(props: ValueProps): State {
  const [client, setClient] = useState<LabApiClient>(props.client);
  const [baseUrl, setBaseUrl] = useState<string>(
    props.baseUrl.endsWith('/') ? props.baseUrl : `${props.baseUrl}/`,
  );

  return {
    client,
    setClient,
    baseUrl,
    setBaseUrl,
  };
}
