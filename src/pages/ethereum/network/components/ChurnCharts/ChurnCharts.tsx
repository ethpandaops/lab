import type { JSX } from 'react';
import type { FctPeerChurnByClClientDaily, FctPeerChurnDaily } from '@/api/types.gen';
import { getDataVizColors } from '@/utils/dataVizColors';
import { SeriesCard } from '../SeriesCard';
import { CHURN_WINDOW_DAYS } from '../../constants';
import { clientShareLines, dayShares, daySums, line, seriesDays, stackLayer } from '../../utils/network-series';

export interface ChurnChartsProps {
  /** Churn rows per network type, every day of the range */
  networkTypes: FctPeerChurnDaily[];
  /** Churn rows per consensus client, every day of the range */
  clients: FctPeerChurnByClClientDaily[];
}

type ChurnRow = FctPeerChurnDaily | FctPeerChurnByClClientDaily;

/** Clients averaging fewer peers a day are left out of the per-client chart */
const MIN_CLIENT_PEERS = 10;

/** Colours of peers arriving and leaving; none is a client or an angle */
const FLOW_COLORS = { new: '#22c55e', returning: '#0ea5e9', departed: '#ef4444' };

/** Days seen out of the last 30, from one (new) to all, light to dark teal */
const SEEN_BUCKETS = [
  { label: '1 day (new)', count: (row: ChurnRow) => row.new_peer_count, color: '#ccfbf1' },
  { label: '2–7 days', count: (row: ChurnRow) => row.seen_2_7_days_peer_count, color: '#5eead4' },
  { label: '8–29 days', count: (row: ChurnRow) => row.seen_8_29_days_peer_count, color: '#14b8a6' },
  { label: 'All 30 days', count: (row: ChurnRow) => row.seen_30_days_peer_count, color: '#0f766e' },
] as const;

const peers = (row: ChurnRow): number | undefined => row.peer_count;

/** Rows whose day has a full window behind it; earlier days count every peer as new */
function fullWindow<T extends ChurnRow>(rows: T[]): T[] {
  return rows.filter(row => (row.history_days ?? 0) >= CHURN_WINDOW_DAYS);
}

/**
 * Consensus peers arriving and leaving each day, how many of the last 30 days each was seen, and how that differs by
 * client and by network type. A peer is its peer ID, so a client that rotates its ID on restart shows as churn.
 */
export function ChurnCharts({ networkTypes, clients }: ChurnChartsProps): JSX.Element {
  const types = fullWindow(networkTypes);
  const byClient = fullWindow(clients);
  const days = seriesDays(types, peers);
  const clientDays = seriesDays(byClient, peers);
  const { CHART_CATEGORICAL_COLORS: palette } = getDataVizColors();
  const count = (part: (row: FctPeerChurnDaily) => number | undefined): number[] => {
    const sums = daySums(types, part);
    return days.map(day => sums.get(day) ?? 0);
  };
  const stayed = (networkType: string): Array<number | null> =>
    dayShares(
      types.filter(row => row.network_type === networkType),
      days,
      row => row.seen_30_days_peer_count,
      peers
    );
  const empty = 'No consensus peer was counted in this range.';

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SeriesCard
          title="Peers arriving and leaving"
          days={days}
          yName="Peers"
          empty={empty}
          series={[
            line(
              'New',
              count(row => row.new_peer_count),
              FLOW_COLORS.new
            ),
            line(
              'Returning',
              count(row => row.returning_peer_count),
              FLOW_COLORS.returning
            ),
            line(
              'Departed',
              count(row => row.departed_peer_count),
              FLOW_COLORS.departed
            ),
          ]}
        />
        <SeriesCard
          title="Days seen of the last 30"
          days={days}
          yName="Share of peers"
          percent="stack"
          empty={empty}
          series={SEEN_BUCKETS.map(bucket =>
            stackLayer(bucket.label, dayShares(types, days, bucket.count, peers), bucket.color, 'seen')
          )}
        />
        <SeriesCard
          title="New peers, by client"
          days={clientDays}
          yName="Share of peers"
          percent="line"
          empty={empty}
          series={clientShareLines(byClient, clientDays, row => row.new_peer_count, peers, MIN_CLIENT_PEERS)}
        />
        <SeriesCard
          title="Seen all 30 days, by network type"
          days={days}
          yName="Share of peers"
          percent="line"
          empty={empty}
          series={[line('Hosting', stayed('hosting'), palette[0]), line('Other', stayed('other'), palette[1])]}
        />
      </div>
      <p className="text-xs/5 text-muted">
        New peers were not seen in the 29 days before; returning peers were away the day before. Each peer ID counts as
        a peer, so clients that change their ID on restart show up as new.
      </p>
    </div>
  );
}
