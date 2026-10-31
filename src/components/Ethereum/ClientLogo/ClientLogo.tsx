import { type JSX, useState } from 'react';
import { CubeIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { LIGHT_GLYPH_CLIENTS, getClientLogoUrl, normalizeClientName } from '@/utils/ethereum';
import type { ClientLogoProps } from './ClientLogo.types';

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
        LIGHT_GLYPH_CLIENTS.has(normalizeClientName(client)) && 'invert dark:invert-0 star:invert-0',
        className
      )}
      style={{ width: `${size}px`, height: `${size}px` }}
      title={client}
      onError={() => setHasError(true)}
    />
  );
}
