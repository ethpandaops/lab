import type { CreateClientConfig } from '@/api/client.gen';

export const BASE_URL = import.meta.env.VITE_API_URL || '';
export const PATH_PREFIX = '/api/v1';

// Refetch intervals for background polling (in milliseconds)
export const REFETCH_INTERVALS = {
  CONFIG: 60_000, // 60 seconds - config changes infrequently
  BOUNDS: 5_000, // 5 seconds - bounds update frequently with new data
} as const;

/**
 * Int64 fields that hold values past Number.MAX_SAFE_INTEGER. JSON.parse would round them (6292022559433348801
 * becomes 6292022559433349000), so they are quoted before parsing and reach callers as decimal strings, despite the
 * generated `number` type. Pass them back to the API as strings, e.g. with `peer_id_unique_key_in_values`.
 */
const LOSSLESS_INT64 = /"(peer_id_unique_key)":(-?\d+)/g;

/** Only these tables carry the fields above, so other responses skip the extra body read */
const LOSSLESS_INT64_TABLES = /\/int_custody_probe(_order_by_slot)?(\/|\?|$)/;

/** fetch that keeps the Int64 fields above lossless */
const losslessFetch: typeof fetch = async (input, init) => {
  const response = await fetch(input, init);
  const url = input instanceof Request ? input.url : String(input);
  if (response.status !== 200 || !LOSSLESS_INT64_TABLES.test(url)) return response;
  const body = (await response.text()).replace(LOSSLESS_INT64, '"$1":"$2"');
  return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers });
};

export const createClientConfig: CreateClientConfig = config => ({
  ...config,
  baseUrl: BASE_URL,
  fetch: losslessFetch,
});
