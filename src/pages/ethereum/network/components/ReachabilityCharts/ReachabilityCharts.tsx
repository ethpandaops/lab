import type { JSX } from 'react';
import type { FctPeerCountBySourceDaily, FctPeerReachabilityByClClientDaily } from '@/api/types.gen';
import { SeriesCard } from '../SeriesCard';
import { clientShareLines, dayShares, line, seriesDays } from '../../utils/network-series';

export interface ReachabilityChartsProps {
  /** Network-wide consensus peer rows, one a day */
  network: FctPeerCountBySourceDaily[];
  /** Consensus peer reachability rows per client, every day of the range */
  clients: FctPeerReachabilityByClClientDaily[];
}

/** Clients averaging fewer peers a day are left out of the per-client chart */
const MIN_CLIENT_PEERS = 10;

/** Colours of the ways a peer connects; none is a client or an angle */
const REACH_COLORS = { dialled: '#0ea5e9', quic: '#f59e0b' };

/**
 * How consensus peers connect each day: whether a sentry dialled them, and whether they use QUIC, across the network
 * and per client.
 */
export function ReachabilityCharts({ network, clients }: ReachabilityChartsProps): JSX.Element {
  const peers = (row: { peer_count?: number }): number | undefined => row.peer_count;
  const days = seriesDays(network, peers);
  const clientDays = seriesDays(clients, peers);
  const share = (part: (row: FctPeerCountBySourceDaily) => number | undefined): Array<number | null> =>
    dayShares(network, days, part, peers);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SeriesCard
          title="How peers connect"
          days={days}
          yName="Share of peers"
          percent="line"
          empty="No consensus peer was counted in this range."
          series={[
            line(
              'Dialled',
              share(row => row.dialled_peer_count),
              REACH_COLORS.dialled
            ),
            line(
              'QUIC',
              share(row => row.quic_peer_count),
              REACH_COLORS.quic
            ),
          ]}
        />
        <SeriesCard
          title="Dialled, by client"
          days={clientDays}
          yName="Share of peers"
          percent="line"
          empty="No consensus peer was counted in this range."
          series={clientShareLines(clients, clientDays, row => row.dialled_peer_count, peers, MIN_CLIENT_PEERS)}
        />
      </div>
      <p className="text-xs/5 text-muted">
        Peers not dialled connected inbound only. Sentries fill their slots from inbound peers first, so that does not
        make them unreachable.
      </p>
    </div>
  );
}
