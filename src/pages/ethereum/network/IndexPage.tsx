import type { JSX } from 'react';
import { Link } from '@tanstack/react-router';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { Card } from '@/components/Layout/Card';
import {
  ClientShares,
  CountriesTable,
  CountsNote,
  CustodyCard,
  ForkReadiness,
  NetworkSkeleton,
  NetworkStats,
  NetworksTable,
  RangeBar,
  ReachabilityCard,
  Section,
} from './components';
import { RANGE_DAYS, TOP_PLACES } from './constants';
import { useRangeSearch } from './hooks/useRangeSearch';
import { useOverviewCensus } from './hooks/useOverviewCensus';

/**
 * Network overview: the consensus peers our sentries saw and the execution nodes our crawler found, by client, by
 * place, by custody and by how they connect, on the range's last day against its first.
 */
export function IndexPage(): JSX.Element {
  const { range, t, setRange } = useRangeSearch();
  const census = useOverviewCensus(RANGE_DAYS[range]);
  const { cl, el, countries, networks, blocks } = census;

  return (
    <Container>
      <Header title="Network" description="Every node our sentries and crawler reached, by client and place" />
      <div className="flex flex-col gap-6">
        <RangeBar range={range} onChange={setRange} endDay={cl.endDay} startDay={cl.startDay} />
        {census.isLoading ? (
          <NetworkSkeleton />
        ) : cl.end.length === 0 ? (
          <Card rounded>
            <h3 className="text-base/7 font-semibold text-foreground">No P2P census for this network yet</h3>
          </Card>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              <NetworkStats census={census} />
              <CountsNote execution />
            </div>

            <Section title="Clients" more={{ to: '/ethereum/clients', label: 'All clients' }}>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <ClientShares
                  layer="consensus"
                  end={cl.end}
                  start={cl.start}
                  count={row => row.peer_count}
                  blocks={blocks.end}
                />
                <ClientShares
                  layer="execution"
                  end={el.end}
                  start={el.start}
                  count={row => row.node_count}
                  blocks={blocks.end}
                />
              </div>
            </Section>

            <Section title="Where nodes run">
              <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
                <Card
                  rounded
                  title="Countries"
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

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <Section title="PeerDAS custody">
                <CustodyCard rows={cl.end} day={cl.endDay} />
              </Section>
              <Section title="Reachability">
                <ReachabilityCard rows={cl.end} day={cl.endDay} />
              </Section>
            </div>

            <Section title="Fork readiness">
              <ForkReadiness consensus={census.clReadiness.end} execution={census.elReadiness} />
            </Section>
          </>
        )}
      </div>
    </Container>
  );
}
