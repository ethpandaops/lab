import type { JSX } from 'react';
import { Link } from '@tanstack/react-router';
import { ChevronRightIcon } from '@heroicons/react/20/solid';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import { ClientLabel } from '@/components/Ethereum/ClientLabel';
import type { DimClientRelease } from '@/api/types.gen';
import { CONSENSUS_CLIENTS, EXECUTION_CLIENTS, getClientColor } from '@/utils/ethereum';
import { formatClientName } from '@/utils/graffiti';
import { UNKNOWN_CLIENT } from '../../constants';
import type { ClientLayer, ClientSummary } from '../../utils/client-share';
import { crossedThreshold } from '../../utils/client-versions';
import { ShareBar } from '../ShareBar';

export interface ClientSummaryGridProps {
  layer: ClientLayer;
  /** Per-client totals for the layer over the selected window */
  summaries: ClientSummary[];
  latestReleases: Map<string, DimClientRelease>;
  /** Xatu nodes per client */
  nodeCounts: Map<string, number>;
}

/**
 * A card per client of a layer, linking to its page: share of identified blocks against the diversity
 * thresholds, newest release and Xatu node count. Clients with no blocks or nodes are listed underneath.
 */
export function ClientSummaryGrid({
  layer,
  summaries,
  latestReleases,
  nodeCounts,
}: ClientSummaryGridProps): JSX.Element {
  const known: readonly string[] = layer === 'consensus' ? CONSENSUS_CLIENTS : EXECUTION_CLIENTS;
  const active = summaries.filter(summary => summary.client !== UNKNOWN_CLIENT);
  const shown = new Set(active.map(summary => summary.client));
  const withNodes = known.filter(client => !shown.has(client) && (nodeCounts.get(client) ?? 0) > 0);
  const rest = known.filter(client => !shown.has(client) && !withNodes.includes(client));

  const cards = [
    ...active.map(summary => ({ client: summary.client, summary })),
    ...withNodes.map(client => ({ client, summary: undefined })),
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        {cards.map(({ client, summary }) => {
          const share = summary?.identifiedShare ?? 0;
          const crossed = crossedThreshold(share);
          const latest = latestReleases.get(client);
          return (
            <Link
              key={client}
              to="/ethereum/clients/$client"
              params={{ client }}
              className="group flex flex-col gap-3 rounded-sm border border-border bg-surface p-4 shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md focus-visible:outline-2 focus-visible:outline-primary"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <ClientLogo client={client} size={24} noLink />
                  <span className="text-sm/6 font-semibold text-foreground group-hover:text-primary">
                    {formatClientName(client)}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  {crossed && <span className="text-xs/5 font-semibold text-danger">Over {crossed}</span>}
                  <ChevronRightIcon
                    aria-hidden="true"
                    className="size-5 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                  />
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs/5 text-muted">Share of identified blocks</span>
                <span className="text-2xl/8 font-semibold text-foreground tabular-nums">
                  {summary ? `${share.toFixed(1)}%` : '-'}
                </span>
                <ShareBar share={share} color={getClientColor(client)} />
              </div>
              <dl className="grid grid-cols-3 gap-2 text-xs/5">
                <div>
                  <dt className="text-muted">Blocks</dt>
                  <dd className="font-medium text-foreground tabular-nums">
                    {summary ? summary.blocks.toLocaleString() : '0'}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Latest</dt>
                  <dd className="truncate font-mono font-medium text-foreground">{latest?.version ?? '-'}</dd>
                </div>
                {layer === 'consensus' && (
                  <div>
                    <dt className="text-muted">Xatu nodes</dt>
                    <dd className="font-medium text-foreground tabular-nums">{nodeCounts.get(client) ?? 0}</dd>
                  </div>
                )}
              </dl>
            </Link>
          );
        })}
      </div>
      {rest.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="text-xs/6 text-muted">No blocks in this window</span>
          {rest.map(client => (
            <ClientLabel key={client} client={client} />
          ))}
        </div>
      )}
    </div>
  );
}
