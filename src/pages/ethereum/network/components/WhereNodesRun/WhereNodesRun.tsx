import type { JSX } from 'react';
import { ANGLE_COLORS } from '@/pages/ethereum/clients/utils/angle-colors';
import { getDataVizColors } from '@/utils/dataVizColors';
import { SeriesCard } from '@/pages/ethereum/network/components/SeriesCard';
import { countryName } from '@/pages/ethereum/network/utils/network-census';
import {
  CONTINENTS,
  countryShares,
  dayShares,
  geolocated,
  line,
  seriesDays,
  stackLayer,
  type ConcentrationRow,
  type CountryDayRow,
} from '@/pages/ethereum/network/utils/network-series';

export interface WhereNodesRunProps {
  /** The layer's concentration rows, one a day */
  rows: ConcentrationRow[];
  /** The layer's largest countries, largest first */
  countryCodes: string[];
  /** Those countries' nodes each day */
  countries: CountryDayRow[];
  /** What the layer's nodes are called, e.g. "consensus peers" */
  noun: string;
}

const located = (row: ConcentrationRow): number | undefined => row.located_peer_count;

/**
 * Where a layer's nodes run each day: by continent and largest country, on hosting providers or not, and how
 * concentrated they are on the largest networks and countries.
 */
export function WhereNodesRun({ rows, countryCodes, countries, noun }: WhereNodesRunProps): JSX.Element {
  const { CHART_CATEGORICAL_COLORS: palette } = getDataVizColors();
  const color = (index: number): string | undefined => palette[index % palette.length];
  const geoDays = seriesDays(rows, geolocated);
  const days = seriesDays(rows, located);
  const share = (part: (row: ConcentrationRow) => number | undefined): Array<number | null> =>
    dayShares(rows, days, part, located);
  const byDay = new Map(rows.map(row => [row.day_start_date, row]));
  const count = (value: (row: ConcentrationRow) => number | undefined): Array<number | null> =>
    days.map(day => {
      const row = byDay.get(day);
      return row ? (value(row) ?? null) : null;
    });
  const empty = `No ${noun} were located in this range.`;

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <SeriesCard
        title="Continents"
        days={geoDays}
        yName="Share of nodes"
        percent="stack"
        empty={empty}
        series={CONTINENTS.filter(({ key }) => rows.some(row => (row[key] ?? 0) > 0)).map(({ key, label }, index) =>
          stackLayer(
            label,
            dayShares(rows, geoDays, row => row[key], geolocated),
            color(index),
            'continents'
          )
        )}
      />
      <SeriesCard
        title="Largest countries"
        days={geoDays}
        yName="Share of nodes"
        percent="line"
        empty={empty}
        series={countryCodes.map((code, index) =>
          line(countryName(code), countryShares(countries, rows, geoDays, code), color(index))
        )}
      />
      <SeriesCard
        title="On hosting providers"
        days={days}
        yName="Share of nodes"
        percent="line"
        empty={empty}
        series={[
          line(
            'Hosting',
            share(row => row.hosting_peer_count),
            ANGLE_COLORS.peers
          ),
        ]}
      />
      <SeriesCard
        title="On the largest networks"
        days={days}
        yName="Share of nodes"
        percent="line"
        empty={empty}
        series={[
          line(
            'Largest network',
            share(row => row.top_1_asn_peer_count),
            color(0)
          ),
          line(
            '5 largest',
            share(row => row.top_5_asn_peer_count),
            color(1)
          ),
          line(
            '10 largest',
            share(row => row.top_10_asn_peer_count),
            color(2)
          ),
        ]}
      />
      <SeriesCard
        title="Fewest networks that hold"
        days={days}
        yName="Networks"
        empty={empty}
        series={[
          line(
            'A third of nodes',
            count(row => row.third_asn_count),
            color(0)
          ),
          line(
            'Half of nodes',
            count(row => row.half_asn_count),
            color(1)
          ),
        ]}
      />
      <SeriesCard
        title="Fewest countries that hold"
        days={days}
        yName="Countries"
        empty={empty}
        series={[
          line(
            'A third of nodes',
            count(row => row.third_country_count),
            color(0)
          ),
          line(
            'Half of nodes',
            count(row => row.half_country_count),
            color(1)
          ),
        ]}
      />
    </div>
  );
}
