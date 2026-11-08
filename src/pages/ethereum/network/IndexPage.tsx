import type { JSX } from 'react';
import { Link } from '@tanstack/react-router';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { Card } from '@/components/Layout/Card';
import {
  CountriesTable,
  CountsNote,
  CustodyChart,
  ForkReadiness,
  HostingChart,
  NetworkSkeleton,
  NetworksTable,
  NodesChart,
  RangeBar,
  ReachabilityCharts,
  Section,
  SyncCharts,
} from './components';
import { RANGE_DAYS, TOP_PLACES } from './constants';
import { useRangeSearch } from './hooks/useRangeSearch';
import { useOverviewCensus } from './hooks/useOverviewCensus';
import { dayStart } from './utils/network-census';
import { formatDataDate } from '@/pages/ethereum/clients/utils/client-versions';

/**
 * Network overview: the consensus peers our sentries and ENR crawler reached each day of the range, how far behind
 * they run and how much history they serve, where they run, what they custody and how they connect, with fork
 * readiness on the latest day.
 */
export function IndexPage(): JSX.Element {
  const { range, t, setRange } = useRangeSearch();
  const census = useOverviewCensus(RANGE_DAYS[range]);
  const { peers, countries, networks } = census;

  return (
    <Container>
      <Header title="Network" description="Every node our sentries and crawlers reached, day by day" />
      <div className="flex flex-col gap-6">
        <RangeBar range={range} onChange={setRange} endDay={null} startDay={null} />
        {census.isLoading ? (
          <NetworkSkeleton />
        ) : peers.rows.length === 0 ? (
          <Card rounded>
            <h3 className="text-base/7 font-semibold text-foreground">No P2P census for this network yet</h3>
          </Card>
        ) : (
          <>
            <Section title="Nodes">
              <NodesChart rows={peers.rows} />
            </Section>

            <Section title="Sync and history">
              <SyncCharts rows={census.sync.rows} />
            </Section>

            <Section title="Where nodes run">
              <HostingChart rows={peers.rows} />
              <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
                <Card
                  rounded
                  title="Countries"
                  subtitle={placesSubtitle(countries.endDay, countries.startDay)}
                  actions={
                    <Link
                      to="/ethereum/network/countries"
                      search={{ t }}
                      className="text-sm text-primary hover:underline"
                    >
                      All countries
                    </Link>
                  }
                >
                  <CountriesTable end={countries.end} start={countries.start} limit={TOP_PLACES} />
                </Card>
                <Card
                  rounded
                  title="Networks"
                  subtitle={placesSubtitle(networks.endDay, networks.startDay)}
                  actions={
                    <Link to="/ethereum/network/asn" search={{ t }} className="text-sm text-primary hover:underline">
                      All networks
                    </Link>
                  }
                >
                  <NetworksTable end={networks.end} start={networks.start} limit={TOP_PLACES} />
                </Card>
              </div>
            </Section>

            <Section title="PeerDAS custody">
              <CustodyChart rows={peers.rows} />
            </Section>

            <Section title="Reachability">
              <ReachabilityCharts network={peers.rows} clients={census.reachability.rows} />
            </Section>

            <Section title="Fork readiness">
              <ForkReadiness consensus={census.clReadiness.end} execution={census.elReadiness} />
            </Section>
            <CountsNote execution />
          </>
        )}
      </div>
    </Container>
  );
}

/** Days a place table's counts and changes come from */
function placesSubtitle(endDay: string | null, startDay: string | null): string | undefined {
  if (!endDay) return undefined;
  return startDay
    ? `Consensus peers on ${formatDataDate(dayStart(endDay))}, change since ${formatDataDate(dayStart(startDay))}`
    : `Consensus peers on ${formatDataDate(dayStart(endDay))}`;
}
