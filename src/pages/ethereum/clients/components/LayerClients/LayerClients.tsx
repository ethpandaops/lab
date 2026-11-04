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
import { ANGLE_COLORS } from '../../utils/angle-colors';
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
  /** Whether the blocks share chart has daily buckets rather than hourly */
  blockChartDaily: boolean;
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
  /**
   * Why the P2P peers and Xatu nodes columns, their chart and, with `hideLatestAdoption`, the On latest column are
   * left out: the page's filters narrow the blocks in ways those numbers cannot follow. Shown in their place.
   */
  unfilteredNote?: string;
  /** Leave out On latest, which cannot follow the other layer's client filter */
  hideLatestAdoption?: boolean;
  /** Which blocks On latest covers when the page is filtered, e.g. "from coinbase" */
  adoptionScope?: string;
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
function HeaderCell({
  title,
  note,
  color,
  className,
}: {
  title: string;
  note?: string;
  /** Swatch of the angle the column shows */
  color?: string;
  className?: string;
}): JSX.Element {
  return (
    <th scope="col" className={clsx('px-3 py-2 text-left align-bottom font-normal first:pl-0 last:pr-0', className)}>
      <span className="inline-flex items-center gap-1.5 text-xs/5 font-medium whitespace-nowrap text-foreground">
        {color && <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />}
        {title}
      </span>
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
  blockChartDaily,
  blockTooltip,
  peerRows,
  peerDay,
  peersLoading,
  xatuNodes,
  latestReleases,
  latestAdoption,
  unfilteredNote,
  hideLatestAdoption = false,
  adoptionScope,
}: LayerClientsProps): JSX.Element {
  // Every number shown follows the page's filters; those that cannot are left out rather than shown network-wide
  const showPeers = !unfilteredNote;
  const showXatu = showPeers && !!xatuNodes;
  const latestPeers = useMemo(
    () => (showPeers ? peerRows.filter(row => row.day_start_date === peerDay) : []),
    [showPeers, peerRows, peerDay]
  );
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
          {blockTotal > 0 ? ((named / blockTotal) * 100).toFixed(0) : 0}% of {blockTotal.toLocaleString()}).{' '}
          {blockChartDaily ? 'Charted per day.' : 'Charted per hour.'}
        </dd>
      </div>
      {showPeers && (
        <div>
          <dt className="inline font-medium text-foreground">P2P peers: </dt>
          <dd className="inline">
            share of the {peerTotal.toLocaleString()} {label} P2P peers the tysm crawler saw on {peerDay ?? '-'} that
            advertised an agent. Agents that are not {label} clients count as Other.
          </dd>
        </div>
      )}
      {showXatu && (
        <div>
          <dt className="inline font-medium text-foreground">Xatu nodes: </dt>
          <dd className="inline">
            nodes running Xatu or contributoor that report to ethPandaOps, active in the last 24 hours.
          </dd>
        </div>
      )}
      {!hideLatestAdoption && (
        <div>
          <dt className="inline font-medium text-foreground">On latest: </dt>
          <dd className="inline">
            share of the client&apos;s blocks {adoptionScope ? `${adoptionScope} ` : ''}in the last 24 hours on its
            latest release or newer.
          </dd>
        </div>
      )}
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
                <HeaderCell
                  title="Proposed blocks"
                  note="Stake-weighted"
                  color={ANGLE_COLORS.blocks}
                  className="w-[26%]"
                />
                {showPeers && (
                  <HeaderCell title="P2P peers" note="Node-weighted" color={ANGLE_COLORS.peers} className="w-[26%]" />
                )}
                {showXatu && <HeaderCell title="Xatu nodes" color={ANGLE_COLORS.xatu} className="text-right" />}
                <HeaderCell title="Latest" />
                {!hideLatestAdoption && <HeaderCell title="On latest" className="text-right" />}
                <th aria-hidden className="w-5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {rows.map(row => {
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
                      <ShareCell share={row.blockShare} color={getClientColor(row.client)} />
                    </td>
                    {showPeers && (
                      <td className="px-3 py-2">
                        {peersLoading ? (
                          <LoadingContainer className="h-2 rounded-full" />
                        ) : (
                          <ShareCell share={row.peerShare} color={getClientColor(row.client)} />
                        )}
                      </td>
                    )}
                    {showXatu && xatuNodes && (
                      <td className="px-3 py-2 text-right text-sm/6 text-muted tabular-nums">
                        {(xatuNodes.get(row.client) ?? 0).toLocaleString()}
                      </td>
                    )}
                    <td className="px-3 py-2 font-mono text-xs/6 whitespace-nowrap text-muted">{latest ?? '-'}</td>
                    {!hideLatestAdoption && (
                      <td className="px-3 py-2 text-right text-sm/6 text-foreground tabular-nums">
                        {adoption === undefined ? <span className="text-muted">-</span> : `${adoption.toFixed(0)}%`}
                      </td>
                    )}
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
                  {showXatu && <td />}
                  <td />
                  {!hideLatestAdoption && <td />}
                  <td />
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {unfilteredNote && <p className="mt-3 text-xs/5 text-muted">{unfilteredNote}</p>}
      </Card>

      <div className={clsx('grid grid-cols-1 gap-4', showPeers && 'xl:grid-cols-2')}>
        <PopoutCard
          title="Proposed blocks over time"
          subtitle={`${blockChartDaily ? 'Daily' : 'Hourly'} share of blocks naming ${article} ${label} client ${blockScope}`}
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
        {showPeers && (
          <PopoutCard
            title="P2P peers over time"
            subtitle={`Daily share of ${label} P2P peers with an agent`}
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
        )}
      </div>
    </section>
  );
}
