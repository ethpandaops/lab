import { BASE_URL, PATH_PREFIX } from './api-config';

/** Serialization formats the lab download proxy can serve a beacon block in. */
export type BlockDownloadFormat = 'json' | 'ssz';

/**
 * Builds the lab download-proxy URL for a beacon block. The backend streams the
 * block from the block archive as an attachment, so it downloads cleanly with no
 * CORS or inline-rendering issues.
 */
export function getBlockDownloadUrl(
  network: string,
  slot: number,
  blockRoot: string,
  format: BlockDownloadFormat
): string {
  const params = new URLSearchParams({ slot: String(slot), block_root: blockRoot, format });

  return `${BASE_URL}${PATH_PREFIX}/download/${encodeURIComponent(network)}/block?${params.toString()}`;
}

/**
 * Builds the lab download-proxy URL for a single blob sidecar, keyed by its
 * versioned hash. The backend fetches it from the per-network blob archive,
 * decodes the stored payload back to the raw blob bytes, and serves it as an
 * attachment.
 */
export function getBlobDownloadUrl(network: string, versionedHash: string): string {
  const params = new URLSearchParams({ versioned_hash: versionedHash });

  return `${BASE_URL}${PATH_PREFIX}/download/${encodeURIComponent(network)}/blob?${params.toString()}`;
}
