import type { JSX } from 'react';
import type { FctPeerSyncStatusByClClientDaily } from '@/api/types.gen';
import { useThemeColors } from '@/hooks/useThemeColors';
import { SeriesCard } from '../SeriesCard';
import { clientShareLines, dayShares, line, seriesDays, stackLayer } from '../../utils/network-series';

type Row = FctPeerSyncStatusByClClientDaily;

export interface SyncChartsProps {
  /** Consensus peer sync rows per client, every day of the range */
  rows: Row[];
}

/** Clients averaging fewer status peers a day are left out of the per-client chart */
const MIN_CLIENT_PEERS = 10;

/** History buckets from most served to least, dark to light green; under the minimum takes the danger colour */
const HISTORY_COLORS = ['#059669', '#34d399', '#a7f3d0'];

const status = (row: Row): number | undefined => row.status_peer_count;
const historyKnown = (row: Row): number | undefined => row.history_known_peer_count;

/**
 * How far behind our sentries' head and finality consensus peers run each day, which fork they are on, and how much
 * history they serve, from the status and metadata they answer with.
 */
export function SyncCharts({ rows }: SyncChartsProps): JSX.Element {
  const colors = useThemeColors();
  const days = seriesDays(rows, status);
  const historyDays = seriesDays(rows, historyKnown);
  const share = (part: (row: Row) => number | undefined): Array<number | null> => dayShares(rows, days, part, status);
  const historyShare = (part: (row: Row) => number | undefined): Array<number | null> =>
    dayShares(rows, historyDays, part, historyKnown);
  const empty = 'No consensus peer answered a status request in this range.';

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <SeriesCard
        title="Head lag"
        days={days}
        yName="Share of peers"
        percent="stack"
        empty={empty}
        series={[
          stackLayer(
            '0–1 slots',
            share(row => row.head_lag_0_1_peer_count),
            colors.success,
            'lag'
          ),
          stackLayer(
            '2–32 slots',
            share(row => row.head_lag_2_32_peer_count),
            colors.warning,
            'lag'
          ),
          stackLayer(
            'Over 32 slots',
            share(row => row.head_lag_over_32_peer_count),
            colors.danger,
            'lag'
          ),
        ]}
      />
      <SeriesCard
        title="Within a slot of the head, by client"
        days={days}
        yName="Share of peers"
        percent="line"
        empty={empty}
        series={clientShareLines(rows, days, row => row.head_lag_0_1_peer_count, status, MIN_CLIENT_PEERS)}
      />
      <SeriesCard
        title="Finality and fork"
        days={days}
        yName="Share of peers"
        percent="line"
        empty={empty}
        series={[
          line(
            'Finalized over 1 epoch behind',
            share(row => row.finalized_lag_over_1_peer_count),
            colors.warning
          ),
          line(
            'On another fork digest',
            share(row => row.other_fork_digest_peer_count),
            colors.danger
          ),
        ]}
      />
      <SeriesCard
        title="History served"
        days={historyDays}
        yName="Share of peers"
        percent="stack"
        empty="No consensus peer reported its earliest available slot in this range."
        series={[
          stackLayer(
            'Since genesis',
            historyShare(row => row.history_full_peer_count),
            HISTORY_COLORS[0],
            'history'
          ),
          stackLayer(
            'Over 33,024 epochs',
            historyShare(row => row.history_over_min_peer_count),
            HISTORY_COLORS[1],
            'history'
          ),
          stackLayer(
            '33,024 epochs',
            historyShare(row => row.history_min_peer_count),
            HISTORY_COLORS[2],
            'history'
          ),
          stackLayer(
            'Under 33,024 epochs',
            historyShare(row => row.history_under_min_peer_count),
            colors.danger,
            'history'
          ),
        ]}
      />
    </div>
  );
}
