import { type JSX, useState } from 'react';
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import type { BlobPosterLogoProps } from './BlobPosterLogo.types';

/**
 * Normalizes a blob poster name to a consistent filename format.
 * Handles various input formats like "OP Mainnet" -> "optimism", "BOB Network" -> "bob"
 */
function normalizePosterName(posterName: string): string {
  const normalized = posterName.toLowerCase().trim();

  // Handle common name variations
  const nameMap: Record<string, string> = {
    'op mainnet': 'optimism',
    'arbitrum one': 'arbitrum',
    'bob network': 'bob',
    'boba network': 'boba',
    'debank chain': 'debank',
    'nanon network': 'nanon',
    'phala network': 'phala',
    'r0ar chain': 'r0ar',
    'swan chain': 'swan',
    'world chain': 'world',
    'zksync era': 'zksync',
    'zksync gateway': 'zksync-gateway',
    'zerϴ network': 'zero',
    'zero network': 'zero',
    'spire da builder': 'spire',
  };

  return nameMap[normalized] ?? normalized.replace(/\s+/g, '-');
}

/**
 * Check if the poster name is considered unknown
 */
function isUnknownPoster(posterName: string): boolean {
  return posterName.toLowerCase().trim() === 'unknown';
}

/**
 * Short abbreviations for blob poster names (2-4 characters)
 */
const SHORT_NAME_MAP: Record<string, string> = {
  abstract: 'ABS',
  aevo: 'AEVO',
  arbitrum: 'ARB',
  'arbitrum one': 'ARB',
  'arena-z': 'ARNZ',
  aztec: 'AZT',
  base: 'BASE',
  binary: 'BIN',
  blast: 'BLST',
  bob: 'BOB',
  'bob network': 'BOB',
  boba: 'BOBA',
  'boba network': 'BOBA',
  codex: 'CDX',
  debank: 'DBK',
  'debank chain': 'DBK',
  ethernity: 'ERN',
  forknet: 'FORK',
  fuel: 'FUEL',
  hashkey: 'HKEY',
  hemi: 'HEMI',
  ink: 'INK',
  jovay: 'JVY',
  katana: 'KTN',
  kinto: 'KTO',
  kroma: 'KROM',
  lachain: 'LA',
  lambda: 'LMDA',
  lighter: 'LGHT',
  linea: 'LNA',
  lisk: 'LSK',
  lumio: 'LUM',
  mantle: 'MNT',
  metal: 'MTL',
  metis: 'MTS',
  mint: 'MINT',
  mode: 'MODE',
  morph: 'MRPH',
  nanon: 'NAN',
  'nanon network': 'NAN',
  'op mainnet': 'OP',
  optimism: 'OP',
  opbnb: 'OPNB',
  optopia: 'OPTA',
  orderly: 'ORDR',
  phala: 'PHA',
  'phala network': 'PHA',
  polynomial: 'POLY',
  r0ar: 'R0AR',
  'r0ar chain': 'R0AR',
  race: 'RACE',
  redstone: 'RSTM',
  scroll: 'SCRL',
  shape: 'SHPE',
  snaxchain: 'SNAX',
  soneium: 'SONM',
  soon: 'SOON',
  spire: 'SPIR',
  'spire da builder': 'SPIR',
  superseed: 'SSED',
  swan: 'SWAN',
  'swan chain': 'SWAN',
  swell: 'SWEL',
  taiko: 'TAKO',
  unichain: 'UNI',
  world: 'WRLD',
  'world chain': 'WRLD',
  xterio: 'XTER',
  zero: 'ZERO',
  'zero network': 'ZERO',
  'zerϴ network': 'ZERO',
  zircuit: 'ZIRC',
  zksync: 'ZKS',
  'zksync era': 'ZKS',
  'zksync gateway': 'ZKGW',
  zora: 'ZORA',
  unknown: '?',
};

/**
 * Get short abbreviation for a blob poster name
 */
export function getBlobPosterShortName(posterName: string): string {
  const normalized = posterName.toLowerCase().trim();
  return SHORT_NAME_MAP[normalized] ?? posterName.slice(0, 4).toUpperCase();
}

/**
 * Gets the URL for a blob poster logo image
 */
function getBlobPosterLogoUrl(posterName: string): string {
  return `/images/external/blob-posters/${normalizePosterName(posterName)}.png`;
}

/**
 * Displays a logo for an L2 blob poster network.
 * Similar to ClientLogo but for Layer 2 networks that post blobs to Ethereum.
 * Shows a fallback icon for unknown posters or when the image fails to load.
 */
export function BlobPosterLogo({ poster, size = 20, className = '' }: BlobPosterLogoProps): JSX.Element {
  const [hasError, setHasError] = useState(false);

  // Show fallback for unknown posters or failed image loads
  if (isUnknownPoster(poster) || hasError) {
    return (
      <QuestionMarkCircleIcon
        className={`text-muted ${className}`}
        style={{ width: `${size}px`, height: `${size}px` }}
        title={poster}
      />
    );
  }

  return (
    <img
      src={getBlobPosterLogoUrl(poster)}
      alt={poster}
      className={`rounded-xs ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
      title={poster}
      onError={() => setHasError(true)}
    />
  );
}
