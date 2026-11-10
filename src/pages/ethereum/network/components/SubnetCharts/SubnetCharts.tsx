import type { JSX } from 'react';
import type {
  FctPeerAttnetCountByClClientDaily,
  FctPeerSubnetCoverageDaily,
  FctPeerSubnetDaily,
} from '@/api/types.gen';
import { DayBarsCard } from '../DayBarsCard';
import { SeriesCard } from '../SeriesCard';
import { clientShareLines, line, seriesDays } from '../../utils/network-series';

type AttnetRow = FctPeerAttnetCountByClClientDaily;

export interface SubnetChartsProps {
  /** Attestation subnets per peer by client, every day of the range */
  clients: AttnetRow[];
  /** Peers per attestation subnet, one row a day */
  coverage: FctPeerSubnetCoverageDaily[];
  /** Every subnet on one day */
  latest: FctPeerSubnetDaily[];
  latestDay: string | null;
}

/** Clients averaging fewer peers a day are left out of the per-client chart */
const MIN_CLIENT_PEERS = 10;

/** Peers on all 64 subnets and on fewer, dark and light amber */
const SUBNET_COLORS = { all: '#92400e', fewer: '#fbbf24' };

/** Colours of the thinnest, median and thickest subnet; none is a client or an angle */
const SPREAD_COLORS = { min: '#ef4444', partial: '#f59e0b', median: '#0ea5e9', max: '#94a3b8' };

const peers = (row: AttnetRow): number | undefined => row.peer_count;

/**
 * Which consensus peers subscribe to every attestation subnet, by client, and how many peers each subnet has: over the
 * range, and every subnet on the latest day.
 */
export function SubnetCharts({ clients, coverage, latest, latestDay }: SubnetChartsProps): JSX.Element {
  const days = seriesDays(clients, peers);
  const coverageDays = seriesDays(coverage, row => row.median_attestation_subnet_peer_count);
  const byDay = new Map(coverage.map(row => [row.day_start_date, row]));
  const spread = (pick: (row: FctPeerSubnetCoverageDaily) => number | undefined): Array<number | null> =>
    coverageDays.map(day => {
      const row = byDay.get(day);
      return row ? (pick(row) ?? null) : null;
    });
  const subnets = latest
    .filter(row => row.subnet_type === 'attestation')
    .sort((a, b) => (a.subnet_id ?? 0) - (b.subnet_id ?? 0));
  const empty = 'No consensus peer answered a metadata request in this range.';

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <SeriesCard
        title="On all 64 subnets, by client"
        days={days}
        yName="Share of peers"
        percent="line"
        empty={empty}
        series={clientShareLines(clients, days, row => row.attnets_64_peer_count, peers, MIN_CLIENT_PEERS)}
      />
      <SeriesCard
        title="Peers per attestation subnet"
        days={coverageDays}
        yName="Peers"
        empty={empty}
        series={[
          line(
            'Thickest subnet',
            spread(row => row.max_attestation_subnet_peer_count),
            SPREAD_COLORS.max
          ),
          line(
            'Median subnet',
            spread(row => row.median_attestation_subnet_peer_count),
            SPREAD_COLORS.median
          ),
          line(
            'Thinnest subnet',
            spread(row => row.min_attestation_subnet_peer_count),
            SPREAD_COLORS.min
          ),
          line(
            'Thinnest, without peers on all 64',
            spread(row => row.min_attestation_subnet_partial_peer_count),
            SPREAD_COLORS.partial
          ),
        ]}
      />
      <DayBarsCard
        title="Every attestation subnet"
        wide
        day={subnets.length > 0 ? latestDay : null}
        labels={subnets.map(row => String(row.subnet_id ?? ''))}
        xName="Subnet"
        yName="Peers"
        empty={empty}
        bars={[
          {
            name: 'On all 64',
            data: subnets.map(row => row.all_subnets_peer_count ?? 0),
            color: SUBNET_COLORS.all,
          },
          {
            name: 'On fewer',
            data: subnets.map(row => Math.max(0, (row.peer_count ?? 0) - (row.all_subnets_peer_count ?? 0))),
            color: SUBNET_COLORS.fewer,
          },
        ]}
      />
    </div>
  );
}
