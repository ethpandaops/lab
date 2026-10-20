import type { JSX } from 'react';
import { Card } from '@/components/Layout/Card';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import { getClientColor } from '@/utils/ethereum';
import { formatClientName, shareOf, type VersionSummary } from '../../utils/partial-columns';

export interface VersionAdoptionProps {
  /** Consensus client versions with subscribing peers, grouped by client and newest first */
  versions: VersionSummary[];
  /** Whether the averages are per day instead of per hour */
  isDaily: boolean;
}

/** Peer client versions with the share of their subscribing peers that request partial messages */
export function VersionAdoption({ versions, isDaily }: VersionAdoptionProps): JSX.Element {
  return (
    <Card
      rounded
      header={
        <div className="flex flex-col gap-1">
          <h3 className="text-sm/6 font-semibold text-foreground">Client Versions</h3>
          <p className="text-xs/5 text-muted">
            Share of each consensus client version&apos;s subscribing peers that request partial messages, with the
            average number of peers seen per {isDaily ? 'day' : 'hour'}
          </p>
        </div>
      }
    >
      {versions.length === 0 ? (
        <p className="text-sm text-muted">No sentry reported peer subscription flags in this window.</p>
      ) : (
        <ul className="flex max-h-96 flex-col gap-1 overflow-y-auto">
          {versions.map((row, index) => {
            const share = shareOf(row.requestsPartial, row.subscribed) ?? 0;
            return (
              <li key={`${row.client}-${row.version}`} className="flex items-center gap-3 px-2 py-1">
                <ClientLogo client={row.client} size={18} />
                <span className="flex w-36 shrink-0 items-baseline gap-1.5 truncate">
                  <span className="truncate text-sm/6 font-medium text-foreground">{formatClientName(row.client)}</span>
                  <span className="truncate font-mono text-xs/6 text-muted">{row.version || '-'}</span>
                </span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-border/50">
                  <span
                    className="block h-full rounded-full"
                    style={{ width: `${share}%`, backgroundColor: getClientColor(row.client, index) }}
                  />
                </span>
                <span className="w-14 shrink-0 text-right text-sm/6 font-medium text-foreground tabular-nums">
                  {share.toFixed(0)}%
                </span>
                <span
                  className="hidden w-20 shrink-0 text-right text-xs/6 text-muted tabular-nums sm:block"
                  title="Average subscribing peers"
                >
                  {row.subscribed >= 10 ? Math.round(row.subscribed).toLocaleString() : row.subscribed.toFixed(1)} peers
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
