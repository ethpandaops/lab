import type { JSX } from 'react';
import { Link } from '@tanstack/react-router';
import type { FctPeerCountByClClientCityDaily } from '@/api/types.gen';
import { Card } from '@/components/Layout/Card';
import { Table } from '@/components/Lists/Table';
import { formatDataDate } from '@/pages/ethereum/clients/utils/client-versions';
import { dayStart, formatShare } from '@/pages/ethereum/network/utils/network-census';
import { cityCounts, ROLLUP_CITIES } from '@/pages/ethereum/network/utils/network-peers';

export interface CityTableProps {
  /** Lowercase country code, as in the country page's URL */
  country: string;
  /** The country's city rows on one day */
  rows: FctPeerCountByClClientCityDaily[];
  day: string | null;
}

const numberColumn = 'text-right tabular-nums';

/** Label of a city the census folds cells into */
function rollupLabel(city: string): string {
  return city === 'other' ? 'Other cities' : 'Not located';
}

/**
 * A country's cities by consensus peers on one day, with how many run on hosting providers' networks. Rows link to
 * each city's page; small residential cells are counted under Other cities.
 */
export function CityTable({ country, rows, day }: CityTableProps): JSX.Element {
  const cities = cityCounts(rows);
  const whole = cities.reduce((sum, city) => sum + city.total, 0);

  return (
    <Card rounded title="Cities" subtitle={day ? `Consensus peers on ${formatDataDate(dayStart(day))}` : undefined}>
      {cities.length === 0 ? (
        <p className="text-sm text-muted">No consensus peer was located to a city here that day.</p>
      ) : (
        <Table
          variant="nested"
          data={cities}
          getRowKey={row => row.city}
          columns={[
            {
              header: 'City',
              accessor: row =>
                ROLLUP_CITIES.has(row.city) ? (
                  <span className="text-muted">{rollupLabel(row.city)}</span>
                ) : (
                  <Link
                    to="/ethereum/network/countries/$country/$city"
                    params={{ country, city: row.city }}
                    className="block max-w-40 truncate text-foreground hover:text-primary sm:max-w-none"
                    title={row.city}
                  >
                    {row.city}
                  </Link>
                ),
            },
            {
              header: 'Hosting',
              accessor: row => row.hosting.toLocaleString(),
              cellClassName: `hidden sm:table-cell ${numberColumn} text-muted`,
              headerClassName: 'hidden sm:table-cell text-right',
            },
            {
              header: 'Other',
              accessor: row => row.other.toLocaleString(),
              cellClassName: `hidden sm:table-cell ${numberColumn} text-muted`,
              headerClassName: 'hidden sm:table-cell text-right',
            },
            {
              header: 'Peers',
              accessor: row => row.total.toLocaleString(),
              cellClassName: `${numberColumn} text-foreground`,
              headerClassName: 'text-right',
            },
            {
              header: 'Share',
              accessor: row => formatShare(row.total, whole),
              cellClassName: `${numberColumn} font-medium text-foreground`,
              headerClassName: 'text-right',
            },
          ]}
        />
      )}
    </Card>
  );
}
