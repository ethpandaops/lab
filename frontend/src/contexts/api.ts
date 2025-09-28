import { useContext as reactUseContext, createContext, useState, useEffect } from 'react';
import { LabApiClient } from '@/api/client.ts';
import { RestApiClient } from '@/api/rest/client';

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
  restClient: RestApiClient | null;
  setRestClient: (client: RestApiClient | null) => void;
  baseUrl: string;
  setBaseUrl: (baseUrl: string) => void;
  restApiUrl?: string;
  setRestApiUrl: (url: string | undefined) => void;
  isLoading: boolean;
  error: Error | null;
}

export interface ValueProps {
  client: LabApiClient;
  baseUrl: string;
  restApiUrl?: string;
}

export function useValue(props: ValueProps): State {
  const [client, setClient] = useState<LabApiClient>(props.client);
  const [restClient, setRestClient] = useState<RestApiClient | null>(null);
  const [baseUrl, setBaseUrl] = useState<string>(props.baseUrl.endsWith('/') ? props.baseUrl : `${props.baseUrl}/`);
  const [restApiUrl, setRestApiUrl] = useState<string | undefined>(props.restApiUrl);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // Initialize REST client when URLs are available
  useEffect(() => {
    const urlToUse = restApiUrl || baseUrl; // Use dedicated REST API URL if available

    if (urlToUse && !restClient) {
      try {
        setIsLoading(true);
        // Use the appropriate URL for REST API
        const newRestClient = new RestApiClient(urlToUse.replace(/\/$/, ''));
        setRestClient(newRestClient);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to initialize REST client'));
      } finally {
        setIsLoading(false);
      }
    }
  }, [baseUrl, restApiUrl, restClient]);

  return {
    client,
    setClient,
    restClient,
    setRestClient,
    baseUrl,
    setBaseUrl,
    restApiUrl,
    setRestApiUrl,
    isLoading,
    error,
  };
}
