import type { JSX } from 'react';
import type { FctPeerCustodyByColumnDaily, FctPeerCustodyCoverageDaily } from '@/api/types.gen';
import { DayBarsCard } from '../DayBarsCard';
import { SeriesCard } from '../SeriesCard';
import { line, seriesDays } from '../../utils/network-series';

export interface ColumnCustodyProps {
  /** Custodians per column, one row a day */
  coverage: FctPeerCustodyCoverageDaily[];
  /** Every column on one day */
  latest: FctPeerCustodyByColumnDaily[];
  latestDay: string | null;
}

/** Colours of the thinnest, median and thickest column; none is a client or an angle */
const SPREAD_COLORS = {
  min: '#ef4444',
  noSupernodes: '#f59e0b',
  noNetwork: '#8b5cf6',
  median: '#0ea5e9',
  max: '#94a3b8',
};

/** Supernodes and other custodians, in the darkest and a light shade of the custody groups chart */
const CUSTODIAN_COLORS = { supernodes: '#a21caf', other: '#f0abfc' };

/**
 * How many consensus peers custody each data column, from their custody group count and node ID: the thinnest,
 * median and thickest column each day, and every column on the latest day.
 */
export function ColumnCustody({ coverage, latest, latestDay }: ColumnCustodyProps): JSX.Element {
  const days = seriesDays(coverage, row => row.custody_peer_count);
  const byDay = new Map(coverage.map(row => [row.day_start_date, row]));
  const spread = (pick: (row: FctPeerCustodyCoverageDaily) => number | undefined): Array<number | null> =>
    days.map(day => {
      const row = byDay.get(day);
      return row ? (pick(row) ?? null) : null;
    });
  const columns = [...latest].sort((a, b) => (a.column_index ?? 0) - (b.column_index ?? 0));
  const empty = 'No consensus peer reported its custody in this range.';

  return (
    <>
      <SeriesCard
        title="Custodians per column"
        days={days}
        yName="Peers"
        empty={empty}
        series={[
          line(
            'Thickest column',
            spread(row => row.max_column_custodian_peer_count),
            SPREAD_COLORS.max
          ),
          line(
            'Median column',
            spread(row => row.median_column_custodian_peer_count),
            SPREAD_COLORS.median
          ),
          line(
            'Thinnest column',
            spread(row => row.min_column_custodian_peer_count),
            SPREAD_COLORS.min
          ),
          line(
            'Thinnest, without its largest network',
            spread(row => row.min_column_without_largest_autonomous_system_peer_count),
            SPREAD_COLORS.noNetwork
          ),
          line(
            'Thinnest, without supernodes',
            spread(row => row.min_column_non_supernode_peer_count),
            SPREAD_COLORS.noSupernodes
          ),
        ]}
      />
      <DayBarsCard
        title="Every column"
        wide
        day={columns.length > 0 ? latestDay : null}
        labels={columns.map(row => String(row.column_index ?? ''))}
        xName="Column"
        yName="Peers"
        empty={empty}
        bars={[
          {
            name: 'Supernodes',
            data: columns.map(row => row.supernode_peer_count ?? 0),
            color: CUSTODIAN_COLORS.supernodes,
          },
          {
            name: 'Other custodians',
            data: columns.map(row => Math.max(0, (row.custodian_peer_count ?? 0) - (row.supernode_peer_count ?? 0))),
            color: CUSTODIAN_COLORS.other,
          },
        ]}
      />
    </>
  );
}
