import type { JSX, ReactNode } from 'react';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import { Badge } from '@/components/Elements/Badge';
import type { ClientLayer } from '@/pages/ethereum/clients/utils/client-share';

export interface ClientHeaderProps {
  client: string;
  layer: ClientLayer;
  title: ReactNode;
  /** Badges after the title, e.g. Latest or Prerelease */
  badges?: ReactNode;
  /** Labelled facts under the title */
  details?: Array<{ label: string; value: ReactNode }>;
  /** Controls on the right, e.g. version navigation */
  actions?: ReactNode;
}

/**
 * Client logo, name and layer, with labelled facts underneath.
 */
export function ClientHeader({ client, layer, title, badges, details, actions }: ClientHeaderProps): JSX.Element {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-4">
        <ClientLogo client={client} size={56} noLink />
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl/8 font-semibold text-foreground">{title}</h1>
            <Badge color={layer === 'consensus' ? 'blue' : 'orange'} size="small" variant="flat">
              {layer === 'consensus' ? 'Consensus' : 'Execution'}
            </Badge>
            {badges}
          </div>
          {details && details.length > 0 && (
            <dl className="flex flex-wrap gap-x-8 gap-y-2">
              {details.map(detail => (
                <div key={detail.label} className="flex flex-col">
                  <dt className="text-xs/5 text-muted">{detail.label}</dt>
                  <dd className="text-sm/6 font-medium text-foreground">{detail.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
