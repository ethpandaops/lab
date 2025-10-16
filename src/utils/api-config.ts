import type { CreateClientConfig } from '@api/client.gen';

export const baseUrl = import.meta.env.VITE_API_URL || '/api/v1';

export const createClientConfig: CreateClientConfig = config => ({
  ...config,
  baseUrl,
});
