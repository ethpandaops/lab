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
