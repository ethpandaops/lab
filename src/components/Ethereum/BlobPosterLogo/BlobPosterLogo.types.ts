export interface BlobPosterLogoProps {
  /**
   * Blob poster name (L2 network name, e.g., "arbitrum", "base", "optimism")
   */
  poster: string;
  /**
   * Size of the logo in pixels (default: 20px)
   */
  size?: number;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * List of known blob poster (L2) networks
 */
export const BLOB_POSTERS = [
  'abstract',
  'aevo',
  'arbitrum',
  'arena-z',
  'aztec',
  'base',
  'binary',
  'blast',
  'bob',
  'boba',
  'codex',
  'debank',
  'ethernity',
  'forknet',
  'fuel',
  'hashkey',
  'hemi',
  'ink',
  'jovay',
  'katana',
  'kinto',
  'kroma',
  'lachain',
  'lambda',
  'lighter',
  'linea',
  'lisk',
  'lumio',
  'mantle',
  'metal',
  'metamail',
  'metis',
  'mint',
  'mode',
  'morph',
  'nanon',
  'optimism',
  'optopia',
  'pandasea',
  'paradex',
  'parallel',
  'phala',
  'polynomial',
  'r0ar',
  'race',
  'river',
  'scroll',
  'settlus',
  'shape',
  'snaxchain',
  'soneium',
  'spire',
  'starknet',
  'superseed',
  'swan',
  'swell',
  'swellchain',
  'symbiosis',
  'taiko',
  'unichain',
  'world',
  'xga',
  'xlayer',
  'zero',
  'zircuit',
  'zksync',
  'zksync-gateway',
  'zora',
] as const;

export type BlobPoster = (typeof BLOB_POSTERS)[number];
