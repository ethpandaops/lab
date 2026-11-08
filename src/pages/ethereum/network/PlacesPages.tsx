import type { JSX } from 'react';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { Card } from '@/components/Layout/Card';
import {
  CENSUS_TABLES,
  censusList,
  type FctPeerCountByClientAsnDaily,
  type FctPeerCountByClientCountryDaily,
} from '@/pages/ethereum/clients/api/client-models';
import { CountriesTable, CountsNote, NetworksTable, RangeBar, TableCardSkeleton } from './components';
import { RANGE_DAYS } from './constants';
import { useRangeSearch } from './hooks/useRangeSearch';
import { useRangeEnds } from './hooks/useRangeEnds';

const ALL = {};

/**
 * Every country by consensus peers on the range's last day, with its change since the first.
 */
export function CountriesPage(): JSX.Element {
  const { range, setRange } = useRangeSearch();
  const countries = useRangeEnds<FctPeerCountByClientCountryDaily>(
    censusList(CENSUS_TABLES.clCountry),
    CENSUS_TABLES.clCountry,
    ALL,
    RANGE_DAYS[range]
  );

  return (
    <Container>
      <Header title="Countries" description="Consensus peers by the country they connect from" />
      <div className="flex flex-col gap-6">
        <RangeBar range={range} onChange={setRange} endDay={countries.endDay} startDay={countries.startDay} />
        {countries.isLoading ? (
          <TableCardSkeleton rows={16} />
        ) : (
          <Card rounded>
            {countries.end.length === 0 ? (
              <p className="text-sm text-muted">No P2P census for this network yet.</p>
            ) : (
              <CountriesTable end={countries.end} start={countries.start} />
            )}
          </Card>
        )}
        <CountsNote />
      </div>
    </Container>
  );
}

/**
 * Every network (autonomous system) by consensus peers on the range's last day, with its change since the first.
 */
export function AsnsPage(): JSX.Element {
  const { range, setRange } = useRangeSearch();
  const networks = useRangeEnds<FctPeerCountByClientAsnDaily>(
    censusList(CENSUS_TABLES.clAsn),
    CENSUS_TABLES.clAsn,
    ALL,
    RANGE_DAYS[range]
  );

  return (
    <Container>
      <Header title="Networks" description="Consensus peers by the network they connect from" />
      <div className="flex flex-col gap-6">
        <RangeBar range={range} onChange={setRange} endDay={networks.endDay} startDay={networks.startDay} />
        {networks.isLoading ? (
          <TableCardSkeleton rows={16} />
        ) : (
          <Card rounded>
            {networks.end.length === 0 ? (
              <p className="text-sm text-muted">No P2P census for this network yet.</p>
            ) : (
              <NetworksTable end={networks.end} start={networks.start} />
            )}
          </Card>
        )}
        <CountsNote />
      </div>
    </Container>
  );
}
