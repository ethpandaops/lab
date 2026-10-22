import type { JSX } from 'react';
import clsx from 'clsx';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import { formatClientName } from '../../utils/partial-columns';

export interface SentryFilterProps {
  /** Sentry consensus clients with data in the window */
  clients: string[];
  /** Selected sentry client */
  value: string | undefined;
  onChange: (client: string) => void;
}

/** Pills choosing which sentry client's completions and partial messages the page shows */
export function SentryFilter({ clients, value, onChange }: SentryFilterProps): JSX.Element | null {
  if (clients.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-sm text-muted">Sentries</span>
      {clients.map(client => (
        <button
          key={client}
          type="button"
          onClick={() => onChange(client)}
          aria-pressed={value === client}
          className={clsx(
            'inline-flex items-center gap-1.5 rounded-sm border px-3 py-1.5 text-xs font-medium transition-colors',
            value === client
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border bg-surface text-muted hover:border-primary/40'
          )}
        >
          <ClientLogo client={client} size={14} />
          {formatClientName(client)}
        </button>
      ))}
    </div>
  );
}
