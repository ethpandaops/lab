import { type JSX, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { Card } from '@/components/Layout/Card';
import { Stats } from '@/components/DataDisplay/Stats';
import { Table } from '@/components/Lists/Table';
import { MultiLineChart } from '@/components/Charts/MultiLine';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import { formatClientName } from '@/utils/graffiti';
import { formatDailyDate } from '@/pages/ethereum/execution/overview/overview.utils';
import { ANGLE_COLORS } from '@/pages/ethereum/clients/utils/angle-colors';
import { formatDataDate } from '@/pages/ethereum/clients/utils/client-versions';
import type { UseRangeEndsResult } from '@/pages/ethereum/network/hooks/useRangeEnds';
import type { PlaceCensusRow } from '@/pages/ethereum/network/hooks/usePlaceCensus';
import {
  countDelta,
  dayStart,
  formatShare,
  layerCounts,
  rankPlaces,
  shareDelta,
  total,
} from '@/pages/ethereum/network/utils/network-census';
import { clientSeries } from '@/pages/ethereum/network/utils/network-series';

export interface PlaceOverviewProps<T extends PlaceCensusRow> {
  /** The place's rows on the range's first and last days */
  place: UseRangeEndsResult<T>;
  /** Every place's rows on the range's first and last days */
  all: UseRangeEndsResult<T>;
  /** The place's rows on every day of the range */
  days: T[];
  /** Key of this place, as `keyOf` returns it */
  placeKey: string;
  keyOf: (row: T) => string;
  /** Key of the census's bucket of places too small to list */
  rollup: string;
  /** What the places are, e.g. "countries" */
  noun: string;
}

const peers = (row: PlaceCensusRow): number | undefined => row.peer_count;

/**
 * A country's or network's consensus peers: how many on the range's last day, their share of the network and rank,
 * their clients each day of the range, and the client mix against the whole network's.
 */
export function PlaceOverview<T extends PlaceCensusRow>({
  place,
  all,
  days,
  placeKey,
  keyOf,
  rollup,
  noun,
}: PlaceOverviewProps<T>): JSX.Element {
  const here = total(place.end, peers);
  const ranked = rankPlaces(all.end, all.start, keyOf, rollup);
  const rank = ranked.findIndex(row => row.key === placeKey);
  const whole = total(all.end, peers);
  const startShare =
    place.start && all.start ? { part: total(place.start, peers), whole: total(all.start, peers) } : null;

  const chart = useMemo(() => clientSeries(days), [days]);
  const local = layerCounts(place.end, 'consensus', peers);
  const network = layerCounts(all.end, 'consensus', peers);
  const networkShare = new Map(network.clients.map(row => [row.client, (row.count / network.whole) * 100]));

  return (
    <div className="flex flex-col gap-6">
      <Stats
        gridClassName="grid grid-cols-1 sm:grid-cols-3"
        stats={[
          {
            id: 'peers',
            name: 'Consensus peers',
            value: here.toLocaleString(),
            delta: countDelta(place.start ? total(place.start, peers) : null, here),
            subtitle: 'A lower bound',
            accentColor: ANGLE_COLORS.peers,
          },
          {
            id: 'share',
            name: 'Share of consensus peers',
            value: formatShare(here, whole),
            delta: shareDelta(startShare, { part: here, whole }),
            accentColor: ANGLE_COLORS.peers,
          },
          {
            id: 'rank',
            name: 'Rank',
            value: placeKey === rollup || rank < 0 ? '-' : `#${rank + 1}`,
            subtitle: `Of ${ranked.length.toLocaleString()} ${noun}`,
          },
        ]}
      />

      <Card
        rounded
        title="Consensus peers"
        subtitle={
          chart.days.length > 0
            ? `Each day by client, ${formatDataDate(dayStart(chart.days[0]))} to ${formatDataDate(dayStart(chart.days[chart.days.length - 1]))}`
            : undefined
        }
      >
        {chart.days.length === 0 ? (
          <p className="text-sm text-muted">No consensus peer was counted here in this range.</p>
        ) : (
          <MultiLineChart
            series={chart.series}
            xAxis={{ type: 'category', labels: chart.days.map(formatDailyDate), name: 'Date' }}
            yAxis={{ name: 'Peers', min: 0 }}
            height={300}
            showLegend
            legendPosition="top"
          />
        )}
      </Card>

      <Card
        rounded
        title="Clients"
        subtitle={place.endDay ? `Consensus peers on ${formatDataDate(dayStart(place.endDay))}` : undefined}
      >
        <Table
          variant="nested"
          data={[...local.clients, ...(local.other > 0 ? [{ client: 'other', count: local.other }] : [])]}
          getRowKey={row => row.client}
          columns={[
            {
              header: 'Client',
              accessor: row =>
                row.client === 'other' ? (
                  <span className="pl-7 text-muted">Other</span>
                ) : (
                  <Link
                    to="/ethereum/clients/$client"
                    params={{ client: row.client }}
                    search={{ tab: 'network' }}
                    className="inline-flex items-center gap-2 font-medium text-foreground hover:text-primary"
                  >
                    <ClientLogo client={row.client} size={20} noLink decorative />
                    {formatClientName(row.client)}
                  </Link>
                ),
            },
            {
              header: 'Peers',
              accessor: row => row.count.toLocaleString(),
              cellClassName: 'text-right tabular-nums text-muted',
              headerClassName: 'text-right',
            },
            {
              header: 'Share',
              accessor: row => formatShare(row.count, local.whole),
              cellClassName: 'text-right tabular-nums font-medium text-foreground',
              headerClassName: 'text-right',
            },
            {
              header: 'Network share',
              accessor: row => {
                const share =
                  row.client === 'other' ? (network.other / network.whole) * 100 : networkShare.get(row.client);
                return share === undefined || !Number.isFinite(share) ? '-' : `${share.toFixed(1)}%`;
              },
              cellClassName: 'text-right tabular-nums text-muted',
              headerClassName: 'text-right',
            },
          ]}
        />
      </Card>
    </div>
  );
}
