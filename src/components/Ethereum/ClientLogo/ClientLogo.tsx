import { type JSX } from 'react';
import type { ClientLogoProps } from './ClientLogo.types';

function getClientLogoUrl(clientName: string): string {
  return `/images/external/clients/${clientName.toLowerCase()}.png`;
}

export function ClientLogo({ client, size = 20, className = '' }: ClientLogoProps): JSX.Element {
  return (
    <img
      src={getClientLogoUrl(client)}
      alt={client}
      className={`rounded-sm ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
      title={client}
    />
  );
}
