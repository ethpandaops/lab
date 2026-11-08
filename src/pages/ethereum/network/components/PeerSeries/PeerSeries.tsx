import type { JSX } from 'react';
import type { FctPeerCountBySourceDaily } from '@/api/types.gen';
import { ANGLE_COLORS } from '@/pages/ethereum/clients/utils/angle-colors';
import { CUSTODY_BUCKETS } from '@/pages/ethereum/clients/utils/census';
import { SeriesCard } from '../SeriesCard';
import { dayShares, seriesDays, stackLayer, type ConcentrationRow } from '../../utils/network-series';

type Row = FctPeerCountBySourceDaily;

export interface PeerSeriesProps {
  /** Network-wide consensus peer rows, one a day */
  rows: Row[];
}

/** Peers both sources saw, between the sentry and ENR angle colours */
const BOTH_COLOR = '#ae8982';

/** Custody buckets from fewest groups to most, light to dark in the peers angle's hue */
const CUSTODY_COLORS = ['#f5d0fe', '#f0abfc', '#d946ef', '#a21caf'];

/**
 * Consensus peers each day, stacked by which source found them: the libp2p sentries, the ENR crawl, or both.
 */
export function NodesChart({ rows }: PeerSeriesProps): JSX.Element {
  const days = seriesDays(rows, row => row.peer_count);
  const byDay = new Map(rows.map(row => [row.day_start_date, row]));
  const value = (count: (row: Row) => number): number[] =>
    days.map(day => {
      const row = byDay.get(day);
      return row ? Math.max(0, count(row)) : 0;
    });
  const both = (row: Row): number => row.sentry_and_enr_peer_count ?? 0;

  return (
    <SeriesCard
      title="Consensus peers"
      days={days}
      yName="Peers"
      empty="No consensus peer was counted in this range."
      series={[
        stackLayer(
          'Sentry only',
          value(row => (row.sentry_peer_count ?? 0) - both(row)),
          ANGLE_COLORS.peers,
          'peers'
        ),
        stackLayer('Sentry and ENR', value(both), BOTH_COLOR, 'peers'),
        stackLayer(
          'ENR only',
          value(row => (row.enr_peer_count ?? 0) - both(row)),
          ANGLE_COLORS.enr,
          'peers'
        ),
      ]}
    />
  );
}

/**
 * Consensus peers by how many custody groups they advertise each day, as shares of the peers whose count is known.
 */
export function CustodyChart({ rows }: PeerSeriesProps): JSX.Element {
  const known = (row: Row): number | undefined => row.custody_known_peer_count;
  const days = seriesDays(rows, known);

  return (
    <SeriesCard
      title="Custody groups advertised"
      days={days}
      yName="Share of peers"
      percent="stack"
      empty="No consensus peer reported its custody in this range."
      series={CUSTODY_BUCKETS.map((bucket, index) =>
        stackLayer(
          bucket.label,
          dayShares(rows, days, row => row[bucket.key], known),
          CUSTODY_COLORS[index],
          'custody'
        )
      )}
    />
  );
}

/**
 * Execution nodes on this chain each day, as the discovery crawler found them.
 */
export function ExecutionNodesChart({
  rows,
}: {
  /** Execution concentration rows, one a day */ rows: ConcentrationRow[];
}): JSX.Element {
  const nodes = (row: ConcentrationRow): number | undefined => row.peer_count;
  const days = seriesDays(rows, nodes);
  const byDay = new Map(rows.map(row => [row.day_start_date, row.peer_count ?? 0]));

  return (
    <SeriesCard
      title="Execution nodes"
      days={days}
      yName="Nodes"
      empty="No execution node was counted in this range."
      series={[
        stackLayer(
          'Nodes',
          days.map(day => byDay.get(day) ?? 0),
          ANGLE_COLORS.peers,
          'nodes'
        ),
      ]}
    />
  );
}
