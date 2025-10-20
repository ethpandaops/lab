import { type JSX } from 'react';
import type { ClientLogoProps } from './ClientLogo.types';

function getClientLogoUrl(clientName: string): string {
  return `https://ethpandaops.io/img/clients/${clientName.toLowerCase()}.jpg`;
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
