import type { CreateClientConfig } from '@/api/client.gen';

export const BASE_URL = import.meta.env.VITE_API_URL || '';
export const PATH_PREFIX = '/api/v1';

const ROOT_PATHS = new Set([`${BASE_URL}${PATH_PREFIX}/config`, `${BASE_URL}${PATH_PREFIX}/bounds`]);

export const isRootPath = (path: string): boolean => ROOT_PATHS.has(path);

export const createClientConfig: CreateClientConfig = config => ({
  ...config,
  baseUrl: BASE_URL,
});
