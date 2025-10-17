import type { CreateClientConfig } from '@/api/client.gen';

export const BASE_URL = import.meta.env.VITE_API_URL || '';
export const PATH_PREFIX = '/api/v1';

// Refetch intervals for background polling (in milliseconds)
export const REFETCH_INTERVALS = {
  CONFIG: 60_000, // 60 seconds - config changes infrequently
  BOUNDS: 5_000, // 5 seconds - bounds update frequently with new data
} as const;

const ROOT_PATHS = new Set([`${BASE_URL}${PATH_PREFIX}/config`]);

export const isRootPath = (path: string): boolean => ROOT_PATHS.has(path);

export const createClientConfig: CreateClientConfig = config => ({
  ...config,
  baseUrl: BASE_URL,
});
