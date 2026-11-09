import { type JSX, useMemo } from 'react';
import { useParams } from '@tanstack/react-router';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { Card } from '@/components/Layout/Card';
import { useNetworkChangeRedirect } from '@/hooks/useNetworkChangeRedirect';
import { CountryFlag } from '@/components/Elements/CountryFlag';
import {
  CENSUS_TABLES,
  type FctPeerCountByClientAsnDaily,
  type FctPeerCountByClientCountryDaily,
} from '@/pages/ethereum/clients/api/client-models';
import { fctPeerCountByClClientCityDailyServiceList } from '@/api/sdk.gen';
import type { FctPeerCountByClClientCityDaily } from '@/api/types.gen';
import type { fetchAllPages } from '@/utils/api-pagination';
import {
  CityTable,
  CountsNote,
  OTHER_COUNTRY,
  OTHER_NETWORK,
  PeerTable,
  PlaceOverview,
  PlaceSkeleton,
  RangeBar,
} from './components';
import { usePeerList } from './hooks/usePeerList';
import { useRangeEnds } from './hooks/useRangeEnds';
import { RANGE_DAYS } from './constants';
import { useRangeSearch } from './hooks/useRangeSearch';
import { usePlaceCensus, type PlaceKind } from './hooks/usePlaceCensus';
import { countryName } from './utils/network-census';

type ListFn = Parameters<typeof fetchAllPages>[0];

const CITY_TABLE = 'fct_peer_count_by_cl_client_city_daily';
const HOSTING = { network_type_eq: 'hosting' };

/**
 * One country: its consensus peers over the range, their share of the network and rank, its client mix, its cities
 * and its peers on the range's last day.
 */
export function CountryPage(): JSX.Element {
  const { country } = useParams({ from: '/ethereum/network/countries/$country' });
  useNetworkChangeRedirect('/ethereum/network/countries');
  const { range, setRange } = useRangeSearch();
  const code = country.toUpperCase();
  const kind = useMemo<PlaceKind<FctPeerCountByClientCountryDaily>>(
    () => ({
      table: CENSUS_TABLES.clCountry,
      filter: { country_code_eq: code },
      keyOf: row => row.country_code ?? '',
    }),
    [code]
  );
  const census = usePlaceCensus(kind, RANGE_DAYS[range]);
  const cityFilter = useMemo(() => ({ country_code_eq: code }), [code]);
  const cities = useRangeEnds<FctPeerCountByClClientCityDaily>(
    fctPeerCountByClClientCityDailyServiceList as ListFn,
    CITY_TABLE,
    cityFilter,
    1
  );
  const peers = usePeerList(census.all.endDay, cityFilter);

  return (
    <Container>
      <Header
        title={
          <span className="inline-flex items-center gap-3">
            <CountryFlag code={code} className="h-5 w-[30px] rounded-xs" />
            {countryName(code)}
          </span>
        }
      />
      <div className="flex flex-col gap-6">
        <RangeBar range={range} onChange={setRange} endDay={census.all.endDay} startDay={census.all.startDay} />
        {census.isLoading ? (
          <PlaceSkeleton />
        ) : census.place.end.length === 0 ? (
          <Card rounded>
            <h3 className="text-base/7 font-semibold text-foreground">No consensus peer counted in this country</h3>
            {code !== OTHER_COUNTRY.toUpperCase() && (
              <p className="mt-1 text-sm/6 text-muted">
                Countries with only a few peers are counted together under Other.
              </p>
            )}
          </Card>
        ) : (
          <PlaceOverview
            place={census.place}
            all={census.all}
            days={census.days}
            placeKey={code}
            keyOf={kind.keyOf}
            rollup={OTHER_COUNTRY}
            noun="countries"
          />
        )}
        {!census.isLoading && census.place.end.length > 0 && (
          <>
            <CityTable country={country.toLowerCase()} rows={cities.end} day={cities.endDay} />
            <PeerTable title="Peers" day={census.all.endDay} list={peers} city network />
          </>
        )}
        <CountsNote />
      </div>
    </Container>
  );
}

/**
 * One network (autonomous system): its consensus peers over the range, their share of the network and rank, and
 * its client mix. Hosting networks also list their peers on the range's last day.
 */
export function AsnPage(): JSX.Element {
  const { asn } = useParams({ from: '/ethereum/network/asn/$asn' });
  useNetworkChangeRedirect('/ethereum/network/asn');
  const { range, setRange } = useRangeSearch();
  const number = Number(asn.replace(/^as/i, ''));
  const kind = useMemo<PlaceKind<FctPeerCountByClientAsnDaily>>(
    () => ({
      table: CENSUS_TABLES.clAsn,
      filter: { autonomous_system_number_eq: Number.isInteger(number) ? number : -1 },
      keyOf: row => String(row.autonomous_system_number ?? 0),
    }),
    [number]
  );
  const census = usePlaceCensus(kind, RANGE_DAYS[range]);
  const latest = census.place.end[0];
  const name = latest?.autonomous_system_organization;
  const hosting = latest?.network_type === 'hosting';
  const asnFilter = useMemo(() => ({ ...HOSTING, autonomous_system_number_eq: number }), [number]);
  const peers = usePeerList(hosting ? census.all.endDay : null, asnFilter);

  return (
    <Container>
      <Header
        title={name || `AS${number}`}
        description={hosting ? `Autonomous system ${number}, a hosting provider` : `Autonomous system ${number}`}
      />
      <div className="flex flex-col gap-6">
        <RangeBar range={range} onChange={setRange} endDay={census.all.endDay} startDay={census.all.startDay} />
        {census.isLoading ? (
          <PlaceSkeleton />
        ) : census.place.end.length === 0 || String(number) === OTHER_NETWORK ? (
          <Card rounded>
            <h3 className="text-base/7 font-semibold text-foreground">No consensus peer counted on this network</h3>
            <p className="mt-1 text-sm/6 text-muted">Networks with only a few peers are counted together.</p>
          </Card>
        ) : (
          <PlaceOverview
            place={census.place}
            all={census.all}
            days={census.days}
            placeKey={String(number)}
            keyOf={kind.keyOf}
            rollup={OTHER_NETWORK}
            noun="networks"
          />
        )}
        {hosting && <PeerTable title="Peers" day={census.all.endDay} list={peers} country city />}
        <CountsNote />
      </div>
    </Container>
  );
}
