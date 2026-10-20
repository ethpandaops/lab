import type { JSX } from 'react';
import clsx from 'clsx';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import { UNKNOWN_CLIENT, formatClientName } from '@/utils/graffiti';

export interface ClientLabelProps {
  /** Client name as stored by the models, e.g. lighthouse or unknown */
  client: string;
  /** Optional version or commit shown after the name */
  detail?: string;
}

/**
 * Client logo and display name, with an optional version or commit in monospace.
 */
export function ClientLabel({ client, detail }: ClientLabelProps): JSX.Element {
  const isUnknown = client === UNKNOWN_CLIENT;
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <ClientLogo client={client} size={16} />
      <span className={clsx('text-sm/6', isUnknown ? 'text-muted' : 'font-medium text-foreground')}>
        {formatClientName(client)}
      </span>
      {detail && <span className="font-mono text-xs/6 text-muted">{detail}</span>}
    </span>
  );
}
