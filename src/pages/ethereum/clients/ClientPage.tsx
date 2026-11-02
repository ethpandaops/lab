import { type JSX, useCallback } from 'react';
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { TabGroup, TabPanel, TabPanels } from '@headlessui/react';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/16/solid';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { Alert } from '@/components/Feedback/Alert';
import { Timestamp } from '@/components/DataDisplay/Timestamp';
import { Tab } from '@/components/Navigation/Tab';
import { ScrollableTabs } from '@/components/Navigation/ScrollableTabs';
import { useNetwork } from '@/hooks/useNetwork';
import { useTabState } from '@/hooks/useTabState';
import { normalizeClientName } from '@/utils/ethereum';
import { formatClientName } from '@/utils/graffiti';
import { CLIENT_TABS, VERSION_WINDOW_DAYS, type VersionWindow } from './constants';
import { ClientHeader, ForkReadinessCard } from './components';
import {
  NetworkTab,
  NodesTab,
  OverviewTab,
  PairingsTab,
  PerformanceTab,
  ProposersTab,
  ReleasesTab,
  VersionsTab,
  type ClientTabProps,
} from './components/ClientTabs';
import { useClientBlocks, useClientNodes, useClientReleases } from './hooks';
import { clientLayerOf } from './utils/client-versions';
import { forkRequirements } from './utils/fork-requirements';

const TAB_LABELS: Record<(typeof CLIENT_TABS)[number], string> = {
  overview: 'Overview',
  versions: 'Versions',
  proposers: 'Proposers',
  pairings: 'Pairings',
  network: 'Network',
  nodes: 'Nodes',
  performance: 'Performance',
  releases: 'Releases',
};

/**
 * Deep dive into one consensus or execution client: share, versions, proposers, pairings, network, our nodes,
 * performance and releases.
 */
export function ClientPage(): JSX.Element {
  const params = useParams({ from: '/ethereum/clients/$client/' });
  const search = useSearch({ from: '/ethereum/clients/$client/' });
  const navigate = useNavigate({ from: '/ethereum/clients/$client/' });
  const { currentNetwork } = useNetwork();
  const client = normalizeClientName(params.client);
  const layer = clientLayerOf(client);
  const window: VersionWindow = search.w ?? '7d';

  const { selectedIndex, onChange } = useTabState(CLIENT_TABS.map(id => ({ id })));
  const { releases, latest, isLoading: releasesLoading } = useClientReleases(layer ? client : undefined);
  const {
    blocks,
    since,
    isLoading: blocksLoading,
  } = useClientBlocks(client, layer, VERSION_WINDOW_DAYS[window], releases);
  const { nodes, allNodes, isLoading: nodesLoading } = useClientNodes(client, layer);
  const requirements = forkRequirements(currentNetwork, client);
  const requirement = requirements.find(item => item.fork === search.fork);

  const onWindowChange = useCallback(
    (value: VersionWindow) =>
      navigate({ search: prev => ({ ...prev, w: value as '7d' | '14d' | '30d' }), replace: true }),
    [navigate]
  );

  if (!layer) {
    return (
      <Container>
        <Header title={formatClientName(client)} />
        <Alert
          variant="warning"
          title="Unknown client"
          description={`"${params.client}" is not a consensus or execution client this site knows.`}
          link={{ label: 'All clients', to: '/ethereum/clients' }}
        />
      </Container>
    );
  }

  const tabProps: ClientTabProps = {
    client,
    layer,
    releases,
    latest,
    releasesLoading,
    blocks,
    blocksLoading: blocksLoading || releasesLoading,
    window,
    since,
    onWindowChange,
    nodes,
    allNodes,
    nodesLoading,
    requirements,
    requirement,
  };
  const repository = releases[0]?.repository;

  return (
    <Container>
      <div className="flex flex-col gap-6">
        <ClientHeader
          client={client}
          layer={layer}
          title={formatClientName(client)}
          details={[
            {
              label: 'Latest release',
              value: latest?.version ? (
                <Link
                  to="/ethereum/clients/$client/$version"
                  params={{ client, version: latest.version }}
                  className="font-mono text-primary hover:underline"
                >
                  {latest.version}
                </Link>
              ) : (
                '-'
              ),
            },
            {
              label: 'Released',
              value: latest?.release_date ? <Timestamp timestamp={latest.release_date} format="short" /> : '-',
            },
            {
              label: 'Repository',
              value: repository ? (
                <a
                  href={`https://github.com/${repository}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  {repository}
                  <ArrowTopRightOnSquareIcon className="size-3" />
                </a>
              ) : (
                '-'
              ),
            },
          ]}
        />

        {search.fork && (
          <ForkReadinessCard
            client={client}
            layer={layer}
            fork={search.fork}
            requirement={requirement}
            blocks={blocks}
            nodes={nodes}
            releases={releases}
          />
        )}

        <TabGroup selectedIndex={selectedIndex} onChange={onChange}>
          <ScrollableTabs>
            {CLIENT_TABS.map(tab => (
              <Tab key={tab}>{TAB_LABELS[tab]}</Tab>
            ))}
          </ScrollableTabs>
          <TabPanels className="mt-6">
            <TabPanel>
              <OverviewTab {...tabProps} />
            </TabPanel>
            <TabPanel>
              <VersionsTab {...tabProps} />
            </TabPanel>
            <TabPanel>
              <ProposersTab {...tabProps} />
            </TabPanel>
            <TabPanel>
              <PairingsTab {...tabProps} />
            </TabPanel>
            <TabPanel>
              <NetworkTab {...tabProps} />
            </TabPanel>
            <TabPanel>
              <NodesTab {...tabProps} />
            </TabPanel>
            <TabPanel>
              <PerformanceTab {...tabProps} />
            </TabPanel>
            <TabPanel>
              <ReleasesTab {...tabProps} />
            </TabPanel>
          </TabPanels>
        </TabGroup>
      </div>
    </Container>
  );
}
