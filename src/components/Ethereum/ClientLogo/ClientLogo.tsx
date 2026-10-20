import { type JSX, useState } from 'react';
import { CubeIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import type { ClientLogoProps } from './ClientLogo.types';

/** Map client name aliases to canonical names */
const CLIENT_ALIASES: Record<string, string> = {
  'go-ethereum': 'geth',
  'nimbus-el': 'nimbusel',
};

function normalizeClientName(clientName: string): string {
  const lower = clientName.toLowerCase();
  return CLIENT_ALIASES[lower] ?? lower;
}

/** Logos drawn in white on transparent, inverted on light themes so they stay visible */
const LIGHT_GLYPH_LOGOS = new Set(['lighthouse']);

function getClientLogoUrl(clientName: string): string {
  return `/images/external/clients/${normalizeClientName(clientName)}.png`;
}

export function ClientLogo({ client, size = 20, className = '' }: ClientLogoProps): JSX.Element {
  const [hasError, setHasError] = useState(false);

  if (hasError || client.toLowerCase() === 'unknown') {
    return (
      <div
        className={`flex items-center justify-center rounded-sm bg-muted/50 text-muted ${className}`}
        style={{ width: `${size}px`, height: `${size}px` }}
        title={client}
      >
        <CubeIcon style={{ width: `${size * 0.6}px`, height: `${size * 0.6}px` }} />
      </div>
    );
  }

  return (
    <img
      src={getClientLogoUrl(client)}
      alt={client}
      className={clsx(
        'rounded-sm',
        LIGHT_GLYPH_LOGOS.has(normalizeClientName(client)) && 'invert dark:invert-0 star:invert-0',
        className
      )}
      style={{ width: `${size}px`, height: `${size}px` }}
      title={client}
      onError={() => setHasError(true)}
    />
  );
}
