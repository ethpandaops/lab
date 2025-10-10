import type { CreateClientConfig } from '@api/client.gen';

export const createClientConfig: CreateClientConfig = config => ({
  ...config,
  baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:8080',
});
