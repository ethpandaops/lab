import type { JSX } from 'react';
import { Link } from '@tanstack/react-router';
import clsx from 'clsx';
import { Card } from '@/components/Layout/Card';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import { getClientColor } from '@/utils/ethereum';
import { formatClientName } from '@/utils/graffiti';
import { ShareBar } from '@/pages/ethereum/clients/components/ShareBar';
import { ANGLE_COLORS } from '@/pages/ethereum/clients/utils/angle-colors';
import { OTHER_VERSION_COLOR } from '@/pages/ethereum/clients/utils/client-versions';
import type { ClientLayer } from '@/pages/ethereum/clients/utils/client-share';
import { layerCounts, shareDelta } from '../../utils/network-census';

export interface ClientSharesProps<T extends { client?: string }> {
  layer: ClientLayer;
  /** Peer or node rows of the range's last day */
  end: T[];
  /** The same rows on the range's first day, null without one */
  start: T[] | null;
  /** Peers or nodes in a row */
  count: (row: T) => number | undefined;
  /** Proposed blocks per client on the latest day */
  blocks: Array<{ client?: string; layer?: string; block_count?: number }>;
}

/** A share as a bar and a percentage, or a dash */
function ShareCell({ share, color }: { share: number | null; color: string }): JSX.Element {
  if (share === null) return <span className="block text-right text-sm/6 text-muted">-</span>;
  return (
    <div className="flex items-center gap-3">
      <div className="hidden min-w-16 flex-1 sm:block">
        <ShareBar share={share} color={color} />
      </div>
      <span className="w-12 shrink-0 text-right text-sm/6 font-medium text-foreground tabular-nums">
        {share > 0 && share < 0.05 ? '<0.1%' : `${share.toFixed(1)}%`}
      </span>
    </div>
  );
}

/** A column header: what it counts, after its angle's swatch, with what it is weighted by underneath */
function HeaderCell({
  title,
  note,
  color,
  className,
}: {
  title: string;
  note?: string;
  color?: string;
  className?: string;
}): JSX.Element {
  return (
    <th scope="col" className={clsx('px-3 py-2 text-left align-bottom font-normal first:pl-0 last:pr-0', className)}>
      <span className="inline-flex items-center gap-1.5 text-xs/5 font-medium text-foreground sm:whitespace-nowrap">
        {color && <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />}
        {title}
      </span>
      {note && <span className="block text-xs/4 text-muted sm:whitespace-nowrap">{note}</span>}
    </th>
  );
}

/**
 * A layer's clients by share of P2P peers on the range's last day, with the change since its first day, beside
 * their share of the blocks proposed that day. Rows link to each client's Network tab.
 */
export function ClientShares<T extends { client?: string }>({
  layer,
  end,
  start,
  count,
  blocks,
}: ClientSharesProps<T>): JSX.Element {
  const now = layerCounts(end, layer, count);
  const then = start ? layerCounts(start, layer, count) : null;
  const proposed = layerCounts(
    blocks.filter(row => row.layer === layer),
    layer,
    row => row.block_count
  );
  const blockShare = (client: string): number | null => {
    if (proposed.whole <= 0) return null;
    const blocksOf = proposed.clients.find(row => row.client === client)?.count ?? 0;
    return (blocksOf / proposed.whole) * 100;
  };
  const change = (client: string, value: number): string => {
    if (!then) return '-';
    const before = then.clients.find(row => row.client === client)?.count ?? 0;
    return shareDelta({ part: before, whole: then.whole }, { part: value, whole: now.whole })?.value ?? '-';
  };
  const label = layer === 'consensus' ? 'Consensus' : 'Execution';

  return (
    <Card rounded title={label} allowContentOverflow>
      {now.whole === 0 ? (
        <p className="text-sm text-muted">No {label.toLowerCase()} client was counted.</p>
      ) : (
        <div className="-mx-(--card-inset) overflow-x-auto px-(--card-inset)">
          <table className="w-full border-collapse">
            <thead className="border-b border-border">
              <tr>
                <HeaderCell title="Client" className="sm:w-44" />
                <HeaderCell
                  title={layer === 'consensus' ? 'P2P peers' : 'Nodes'}
                  note="Peer-weighted"
                  color={ANGLE_COLORS.peers}
                  className="w-[34%]"
                />
                <HeaderCell title="Change" className="text-right" />
                <HeaderCell
                  title="Proposed blocks"
                  note="Stake-weighted"
                  color={ANGLE_COLORS.blocks}
                  className="w-[34%]"
                />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {now.clients.map(row => (
                <tr key={row.client} className="group relative transition-colors hover:bg-primary/5">
                  <td className="py-2 pr-3">
                    <Link
                      to="/ethereum/clients/$client"
                      params={{ client: row.client }}
                      search={{ tab: 'network' }}
                      className="inline-flex items-center gap-2 text-sm/6 font-medium whitespace-nowrap text-foreground group-hover:text-primary after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-primary"
                    >
                      <ClientLogo client={row.client} size={20} noLink decorative />
                      {formatClientName(row.client)}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <ShareCell share={(row.count / now.whole) * 100} color={getClientColor(row.client)} />
                  </td>
                  <td className="px-3 py-2 text-right text-sm/6 whitespace-nowrap text-muted tabular-nums">
                    {change(row.client, row.count)}
                  </td>
                  <td className="py-2 pl-3">
                    <ShareCell share={blockShare(row.client)} color={getClientColor(row.client)} />
                  </td>
                </tr>
              ))}
              {now.other > 0 && (
                <tr className="text-muted">
                  <td className="py-2 pr-3 pl-7 text-sm/6">Other</td>
                  <td className="px-3 py-2">
                    <ShareCell share={(now.other / now.whole) * 100} color={OTHER_VERSION_COLOR} />
                  </td>
                  <td className="px-3 py-2 text-right text-sm/6 tabular-nums">
                    {then
                      ? (shareDelta({ part: then.other, whole: then.whole }, { part: now.other, whole: now.whole })
                          ?.value ?? '-')
                      : '-'}
                  </td>
                  <td className="py-2 pl-3">
                    <span className="block text-right text-sm/6">-</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
