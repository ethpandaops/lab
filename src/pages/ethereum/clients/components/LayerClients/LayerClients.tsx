import { type JSX, type ReactNode, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { ChevronRightIcon } from '@heroicons/react/20/solid';
import clsx from 'clsx';
import { Card } from '@/components/Layout/Card';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { MultiLineChart, type SeriesData } from '@/components/Charts/MultiLine';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import type { DimClientRelease } from '@/api/types.gen';
import { getClientColor } from '@/utils/ethereum';
import { formatClientName } from '@/utils/graffiti';
import { OTHER_VERSION_COLOR } from '../../utils/client-versions';
import { peerShareChart, unifiedClientRows } from '../../utils/census';
import type { ClientLayer, ClientSummary } from '../../utils/client-share';
import { ShareBar } from '../ShareBar';

export interface LayerClientsProps {
  layer: ClientLayer;
  /** Per-client proposed blocks over the window */
  blockSummaries: ClientSummary[];
  /** Blocks in the window, named client or not */
  blockTotal: number;
  /** e.g. "in the last 7 days" or "from coinbase in the last 7 days" */
  blockScope: string;
  /** The blocks share chart over the window */
  blockChart: { labels: string[]; series: SeriesData[] };
  blockTooltip: (params: unknown) => string;
  /** P2P census rows of the layer over the window */
  peerRows: Array<{ day_start_date?: string; client?: string; peer_count?: number }>;
  /** Latest full day of the census */
  peerDay: string | null;
  peersLoading: boolean;
  /** Xatu nodes per client; consensus only */
  xatuNodes?: Map<string, number>;
  latestReleases: Map<string, DimClientRelease>;
  /** Share of each client's blocks in the last 24 hours on its latest release or newer */
  latestAdoption: Map<string, number>;
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

/** A column header with what the column is weighted by underneath */
function HeaderCell({ title, note, className }: { title: string; note?: string; className?: string }): JSX.Element {
  return (
    <th scope="col" className={clsx('px-3 py-2 text-left align-bottom font-normal first:pl-0 last:pr-0', className)}>
      <span className="block text-xs/5 font-medium whitespace-nowrap text-foreground">{title}</span>
      {note && <span className="block text-xs/4 whitespace-nowrap text-muted">{note}</span>}
    </th>
  );
}

/**
 * One layer's clients by every angle Lab has, side by side: share of proposed blocks (stake-weighted, from graffiti),
 * share of P2P peers (node-weighted, from the P2P census), Xatu nodes, and how much of each client runs its latest
 * release. Below, both shares over time. Rows link to the client pages.
 */
export function LayerClients({
  layer,
  blockSummaries,
  blockTotal,
  blockScope,
  blockChart,
  blockTooltip,
  peerRows,
  peerDay,
  peersLoading,
  xatuNodes,
  latestReleases,
  latestAdoption,
}: LayerClientsProps): JSX.Element {
  const latestPeers = useMemo(() => peerRows.filter(row => row.day_start_date === peerDay), [peerRows, peerDay]);
  const { rows, other, peerTotal } = useMemo(
    () => unifiedClientRows(layer, blockSummaries, latestPeers),
    [layer, blockSummaries, latestPeers]
  );
  const peerChart = useMemo(() => peerShareChart(layer, peerRows), [layer, peerRows]);
  const named = blockSummaries.filter(summary => summary.identifiedShare !== null).reduce((n, s) => n + s.blocks, 0);
  const label = layer === 'consensus' ? 'consensus' : 'execution';
  const article = layer === 'consensus' ? 'a' : 'an';

  const footer: ReactNode = (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-xs/5 text-muted lg:grid-cols-2">
      <div>
        <dt className="inline font-medium text-foreground">Proposed blocks: </dt>
        <dd className="inline">
          share of the {named.toLocaleString()} blocks {blockScope} whose graffiti names {article} {label} client (
          {blockTotal > 0 ? ((named / blockTotal) * 100).toFixed(0) : 0}% of {blockTotal.toLocaleString()}).
        </dd>
      </div>
      <div>
        <dt className="inline font-medium text-foreground">P2P peers: </dt>
        <dd className="inline">
          share of the {peerTotal.toLocaleString()} {label} peers the tysm P2P crawler saw on {peerDay ?? '-'} that
          advertised an agent. Agents that are not {label} clients count as Other.
        </dd>
      </div>
      {xatuNodes && (
        <div>
          <dt className="inline font-medium text-foreground">Xatu nodes: </dt>
          <dd className="inline">contributor nodes active in the last 24 hours.</dd>
        </div>
      )}
      <div>
        <dt className="inline font-medium text-foreground">On latest: </dt>
        <dd className="inline">
          share of the client&apos;s blocks in the last 24 hours on its latest release or newer.
        </dd>
      </div>
    </dl>
  );

  return (
    <section className="flex flex-col gap-4">
      <Card
        rounded
        title={layer === 'consensus' ? 'Consensus clients' : 'Execution clients'}
        footer={footer}
        allowContentOverflow
      >
        <div className="-mx-(--card-inset) overflow-x-auto px-(--card-inset)">
          <table className="w-full border-collapse sm:min-w-[44rem]">
            <thead className="border-b border-border">
              <tr>
                <HeaderCell title="Client" className="w-44" />
                <HeaderCell title="Proposed blocks" note="Stake-weighted" className="w-[26%]" />
                <HeaderCell title="P2P peers" note="Node-weighted" className="w-[26%]" />
                {xatuNodes && <HeaderCell title="Xatu nodes" className="text-right" />}
                <HeaderCell title="Latest" />
                <HeaderCell title="On latest" className="text-right" />
                <th aria-hidden className="w-5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {rows.map(row => {
                const color = getClientColor(row.client);
                const latest = latestReleases.get(row.client)?.version;
                const adoption = latestAdoption.get(row.client);
                return (
                  <tr key={row.client} className="group relative transition-colors hover:bg-primary/5">
                    <td className="py-2 pr-3">
                      <Link
                        to="/ethereum/clients/$client"
                        params={{ client: row.client }}
                        className="inline-flex items-center gap-2 text-sm/6 font-medium whitespace-nowrap text-foreground group-hover:text-primary after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-primary"
                      >
                        <ClientLogo client={row.client} size={20} noLink decorative />
                        {formatClientName(row.client)}
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <ShareCell share={row.blockShare} color={color} />
                    </td>
                    <td className="px-3 py-2">
                      {peersLoading ? (
                        <LoadingContainer className="h-2 rounded-full" />
                      ) : (
                        <ShareCell share={row.peerShare} color={color} />
                      )}
                    </td>
                    {xatuNodes && (
                      <td className="px-3 py-2 text-right text-sm/6 text-muted tabular-nums">
                        {(xatuNodes.get(row.client) ?? 0).toLocaleString()}
                      </td>
                    )}
                    <td className="px-3 py-2 font-mono text-xs/6 whitespace-nowrap text-muted">{latest ?? '-'}</td>
                    <td className="px-3 py-2 text-right text-sm/6 text-foreground tabular-nums">
                      {adoption === undefined ? <span className="text-muted">-</span> : `${adoption.toFixed(0)}%`}
                    </td>
                    <td className="py-2 pl-1 text-right">
                      <ChevronRightIcon className="inline size-4 text-muted group-hover:text-primary" />
                    </td>
                  </tr>
                );
              })}
              {other.peers > 0 && (
                <tr className="text-muted">
                  <td className="py-2 pr-3">
                    <span className="inline-flex items-center gap-2 pl-7 text-sm/6">Other</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="block text-right text-sm/6">-</span>
                  </td>
                  <td className="px-3 py-2">
                    <ShareCell share={other.peerShare} color={OTHER_VERSION_COLOR} />
                  </td>
                  {xatuNodes && <td />}
                  <td />
                  <td />
                  <td />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <PopoutCard
          title="Proposed blocks over time"
          subtitle={`Share of blocks naming ${article} ${label} client ${blockScope}`}
          anchorId={`${layer}-block-share`}
          modalSize="full"
        >
          {({ inModal }) => (
            <MultiLineChart
              series={blockChart.series}
              xAxis={{ type: 'category', labels: blockChart.labels, name: 'Date' }}
              yAxis={{ name: 'Share (%)', min: 0, max: 100 }}
              height={inModal ? 600 : 280}
              showLegend
              legendPosition="top"
              tooltipFormatter={blockTooltip}
            />
          )}
        </PopoutCard>
        <PopoutCard
          title="P2P peers over time"
          subtitle={`Daily share of ${label} peers with an agent`}
          anchorId={`${layer}-peer-share`}
          modalSize="full"
        >
          {({ inModal }) =>
            peersLoading ? (
              <LoadingContainer className="h-72 rounded-sm" />
            ) : peerChart.days.length === 0 ? (
              <p className="text-sm text-muted">No P2P census for this window yet.</p>
            ) : (
              <MultiLineChart
                series={peerChart.series}
                xAxis={{ type: 'category', labels: peerChart.labels, name: 'Date' }}
                yAxis={{ name: 'Share (%)', min: 0, max: 100 }}
                height={inModal ? 600 : 280}
                showLegend
                legendPosition="top"
              />
            )
          }
        </PopoutCard>
      </div>
    </section>
  );
}
