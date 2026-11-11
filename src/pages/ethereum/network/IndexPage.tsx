import type { JSX } from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { SegmentedControl } from '@/components/Forms/SegmentedControl';
import type { ClientLayer } from '@/pages/ethereum/clients/utils/client-share';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { Card } from '@/components/Layout/Card';
import {
  ChurnCharts,
  ColumnCustody,
  CountsNote,
  CustodyChart,
  ExecutionNodesChart,
  ForkReadiness,
  GoodbyeCharts,
  NetworkSkeleton,
  NodesChart,
  RangeBar,
  ReachabilityCharts,
  Section,
  SubnetCharts,
  SyncCharts,
  WhereNodesRun,
} from './components';
import { RANGE_DAYS } from './constants';
import { useRangeSearch } from './hooks/useRangeSearch';
import { useOverviewCensus } from './hooks/useOverviewCensus';

/** Layers the "where nodes run" section switches between */
const LAYER_OPTIONS: ReadonlyArray<{ value: ClientLayer; label: string }> = [
  { value: 'consensus', label: 'Consensus' },
  { value: 'execution', label: 'Execution' },
];

/**
 * Network overview: the consensus peers our sentries and ENR crawler reached and the execution nodes our crawler
 * found, each day of the range: how they come and go and why they drop our sentries, how far behind they run and how
 * much history they serve, where they run, what they custody, which subnets they join and how they connect, with fork
 * readiness on the latest day.
 */
export function IndexPage(): JSX.Element {
  const { range, t, setRange } = useRangeSearch();
  const navigate = useNavigate({ from: '/ethereum/network/' });
  const layer: ClientLayer = useSearch({ from: '/ethereum/network/' }).layer ?? 'consensus';
  const census = useOverviewCensus(RANGE_DAYS[range], layer);
  const { peers, concentration } = census;

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
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <NodesChart rows={peers.rows} />
                <ExecutionNodesChart rows={concentration.execution.rows} />
              </div>
            </Section>

            <Section title="Churn">
              <ChurnCharts networkTypes={census.churn.networkTypes.rows} clients={census.churn.clients.rows} />
            </Section>

            <Section title="Goodbyes">
              <GoodbyeCharts reasons={census.goodbyes.reasons.rows} clients={census.goodbyes.clients.rows} />
            </Section>

            <Section title="Sync and history">
              <SyncCharts rows={census.sync.rows} />
            </Section>

            <Section
              title="Where nodes run"
              actions={
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <Link
                    to="/ethereum/network/countries"
                    search={{ t }}
                    className="text-sm text-primary hover:underline"
                  >
                    All countries
                  </Link>
                  <Link to="/ethereum/network/asn" search={{ t }} className="text-sm text-primary hover:underline">
                    All networks
                  </Link>
                  <SegmentedControl
                    options={LAYER_OPTIONS}
                    value={layer}
                    onChange={value =>
                      navigate({ search: prev => ({ ...prev, layer: value }), replace: true, resetScroll: false })
                    }
                    ariaLabel="Layer"
                  />
                </div>
              }
            >
              <WhereNodesRun
                rows={concentration[layer].rows}
                countryCodes={census.countryCodes}
                countries={census.countries.rows}
                noun={layer === 'consensus' ? 'consensus peers' : 'execution nodes'}
              />
            </Section>

            <Section title="PeerDAS custody">
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <CustodyChart rows={peers.rows} />
                <ColumnCustody
                  coverage={census.columns.coverage.rows}
                  latest={census.columns.latest.end}
                  latestDay={census.columns.latest.endDay}
                />
              </div>
            </Section>

            <Section title="Subnets">
              <SubnetCharts
                clients={census.subnets.clients.rows}
                coverage={census.subnets.coverage.rows}
                latest={census.subnets.latest.end}
                latestDay={census.subnets.latest.endDay}
              />
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
