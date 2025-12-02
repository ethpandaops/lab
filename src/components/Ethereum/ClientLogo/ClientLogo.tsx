import { type JSX, useState } from 'react';
import { CubeIcon } from '@heroicons/react/24/outline';
import type { ClientLogoProps } from './ClientLogo.types';

function getClientLogoUrl(clientName: string): string {
  return `/images/external/clients/${clientName.toLowerCase()}.png`;
}

export function ClientLogo({ client, size = 20, className = '' }: ClientLogoProps): JSX.Element {
  const [hasError, setHasError] = useState(false);

  if (hasError || client === 'Unknown') {
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
      className={`rounded-sm ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
      title={client}
      onError={() => setHasError(true)}
    />
  );
}
