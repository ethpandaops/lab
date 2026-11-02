import type { JSX } from 'react';
import { Link } from '@tanstack/react-router';
import clsx from 'clsx';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import { isKnownClient, normalizeClientName } from '@/utils/ethereum';
import { UNKNOWN_CLIENT, formatClientName } from '@/utils/graffiti';

export interface ClientLabelProps {
  /** Client name as stored by the models, e.g. lighthouse or unknown */
  client: string;
  /** Optional version or commit shown after the name */
  detail?: string;
  /** Release version shown after the name, linked to its version page */
  version?: string;
  /** Render without links, e.g. inside buttons, selects or other links */
  noLink?: boolean;
}

/**
 * Client logo and display name, linked to the client's page, with an optional version or commit in monospace.
 */
export function ClientLabel({ client, detail, version, noLink = false }: ClientLabelProps): JSX.Element {
  const isUnknown = client === UNKNOWN_CLIENT;
  const linked = !noLink && isKnownClient(client);
  const name = (
    <>
      <ClientLogo client={client} size={16} noLink />
      <span className={clsx('text-sm/6', isUnknown ? 'text-muted' : 'font-medium text-foreground')}>
        {formatClientName(client)}
      </span>
    </>
  );

  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      {linked ? (
        <Link
          to="/ethereum/clients/$client"
          params={{ client: normalizeClientName(client) }}
          className="inline-flex items-center gap-2 hover:underline"
          onClick={event => event.stopPropagation()}
        >
          {name}
        </Link>
      ) : (
        name
      )}
      {version &&
        (linked ? (
          <Link
            to="/ethereum/clients/$client/$version"
            params={{ client: normalizeClientName(client), version }}
            className="font-mono text-xs/6 text-muted hover:text-foreground hover:underline"
            onClick={event => event.stopPropagation()}
          >
            {version}
          </Link>
        ) : (
          <span className="font-mono text-xs/6 text-muted">{version}</span>
        ))}
      {detail && <span className="font-mono text-xs/6 text-muted">{detail}</span>}
    </span>
  );
}
