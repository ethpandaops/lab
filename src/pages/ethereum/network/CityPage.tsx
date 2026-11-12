import { type JSX, useMemo } from 'react';
import { useParams } from '@tanstack/react-router';
import { fctPeerCountByClClientCityDailyServiceList } from '@/api/sdk.gen';
import type { FctPeerCountByClClientCityDaily } from '@/api/types.gen';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { Card } from '@/components/Layout/Card';
import { CountryFlag } from '@/components/Elements/CountryFlag';
import { useNetworkChangeRedirect } from '@/hooks/useNetworkChangeRedirect';
import { getDataVizColors } from '@/utils/dataVizColors';
import type { fetchAllPages } from '@/utils/api-pagination';
import { clientSeries, seriesDays, stackLayer } from './utils/network-series';
import { CountsNote, PeerTable, PlaceSkeleton, RangeBar, SeriesCard } from './components';
import { RANGE_DAYS } from './constants';
import { usePeerList } from './hooks/usePeerList';
import { useRangeDays } from './hooks/useRangeDays';
import { useRangeSearch } from './hooks/useRangeSearch';
import { countryName, dayBounds } from './utils/network-census';
import { isHosting, ROLLUP_CITIES } from './utils/network-peers';

type ListFn = Parameters<typeof fetchAllPages>[0];

const CITY_TABLE = 'fct_peer_count_by_cl_client_city_daily';

/**
 * One city: its consensus peers each day of the range by client and by network type, and its hosting peers on the
 * range's last day. Peers on other networks are only counted here, never listed.
 */
export function CityPage(): JSX.Element {
  const { country, city } = useParams({ from: '/ethereum/network/countries/$country/$city' });
  useNetworkChangeRedirect('/ethereum/network/countries');
  const { range, setRange } = useRangeSearch();
  const code = country.toUpperCase();
  const rollup = ROLLUP_CITIES.has(city);
  const filters = useMemo(() => ({ country_code_eq: code, city_eq: city }), [code, city]);
  const census = useRangeDays<FctPeerCountByClClientCityDaily>(
    fctPeerCountByClClientCityDailyServiceList as ListFn,
    CITY_TABLE,
    RANGE_DAYS[range],
    { filters: rollup ? null : filters }
  );
  const lastDay = dayBounds(census.rows).last;
  const peerFilters = useMemo(() => ({ ...filters, network_type_eq: 'hosting' }), [filters]);
  const peers = usePeerList(lastDay, peerFilters);

  const byClient = useMemo(() => clientSeries(census.rows), [census.rows]);
  const { CHART_CATEGORICAL_COLORS: palette } = getDataVizColors();
  const typeDays = seriesDays(census.rows, row => row.peer_count);
  const byType = (hosting: boolean): number[] =>
    typeDays.map(day =>
      census.rows
        .filter(row => row.day_start_date === day && isHosting(row) === hosting)
        .reduce((sum, row) => sum + (row.peer_count ?? 0), 0)
    );

  return (
    <Container>
      <Header
        title={
          <span className="inline-flex items-center gap-3">
            <CountryFlag code={code} className="h-5 w-7.5 rounded-xs" />
            {city}
          </span>
        }
        description={countryName(code)}
      />
      <div className="flex flex-col gap-6">
        <RangeBar range={range} onChange={setRange} endDay={null} startDay={null} />
        {census.isLoading ? (
          <PlaceSkeleton />
        ) : rollup || census.rows.length === 0 ? (
          <Card rounded>
            <h3 className="text-base/7 font-semibold text-foreground">No consensus peer counted in this city</h3>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <SeriesCard
                title="Consensus peers"
                days={byClient.days}
                series={byClient.series}
                yName="Peers"
                empty="No consensus peer was counted here in this range."
              />
              <SeriesCard
                title="By network type"
                days={typeDays}
                yName="Peers"
                empty="No consensus peer was counted here in this range."
                series={[
                  stackLayer('Hosting', byType(true), palette[0], 'type'),
                  stackLayer('Other', byType(false), palette[1], 'type'),
                ]}
              />
            </div>
            <PeerTable
              title="Peers on hosting providers"
              day={lastDay}
              list={peers}
              network
              empty="No peer on a hosting provider's network was counted here that day."
            />
          </>
        )}
        <CountsNote />
      </div>
    </Container>
  );
}
