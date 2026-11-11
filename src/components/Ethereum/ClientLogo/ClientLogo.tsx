import { type JSX, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { CubeIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { LIGHT_GLYPH_CLIENTS, getClientLogoUrl, isKnownClient, normalizeClientName } from '@/utils/ethereum';
import type { ClientLogoProps } from './ClientLogo.types';

/**
 * A client's logo, linked to the client's page unless `noLink` is set or the client is not known.
 */
export function ClientLogo({
  client,
  size = 20,
  className = '',
  noLink = false,
  decorative = false,
}: ClientLogoProps): JSX.Element {
  const [hasError, setHasError] = useState(false);

  if (hasError || client.toLowerCase() === 'unknown') {
    return (
      <div
        className={`flex items-center justify-center rounded-sm bg-muted-50 text-muted ${className}`}
        style={{ width: `${size}px`, height: `${size}px` }}
        title={client}
      >
        <CubeIcon style={{ width: `${size * 0.6}px`, height: `${size * 0.6}px` }} />
      </div>
    );
  }

  const linked = !noLink && isKnownClient(client);
  const image = (
    <img
      src={getClientLogoUrl(client)}
      alt={decorative ? '' : client}
      className={clsx(
        'rounded-sm',
        LIGHT_GLYPH_CLIENTS.has(normalizeClientName(client)) && 'invert on-dark:invert-0',
        !linked && className
      )}
      style={{ width: `${size}px`, height: `${size}px` }}
      title={decorative ? undefined : client}
      onError={() => setHasError(true)}
    />
  );

  if (!linked) return image;

  return (
    <Link
      to="/ethereum/clients/$client"
      params={{ client: normalizeClientName(client) }}
      className={clsx('inline-flex shrink-0', className)}
      onClick={event => event.stopPropagation()}
    >
      {image}
    </Link>
  );
}
