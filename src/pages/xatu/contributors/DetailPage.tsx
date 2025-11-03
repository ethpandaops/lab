import { type JSX, useState, useEffect } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { fctNodeActiveLast24hServiceListOptions } from '@/api/@tanstack/react-query.gen';
import type { FctNodeActiveLast24h } from '@/api/types.gen';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { Stats } from '@/components/DataDisplay/Stats';
import { Table } from '@/components/Lists/Table';
import type { Column } from '@/components/Lists/Table';
import { UserDetailsSkeleton } from './components/UserDetailsSkeleton';
import type { UserClassification } from './components/UserCard/UserCard.types';
import { getClassificationLabel, getClassificationBadgeClasses, getCountryFlag, getRelativeTime } from '@/utils';
import { Timestamp } from '@/components/DataDisplay/Timestamp';
import { useSlotPlayerMeta } from '@/hooks/useSlotPlayer';
import { SlotPlayerControls } from './components/SlotPlayerControls';
import { BlockLatencyChart } from './components/BlockLatencyChart';
import { BlobLatencyChart } from './components/BlobLatencyChart';
import { DataColumnLatencyChart } from './components/DataColumnLatencyChart';
import { AttestationLatencyChart } from './components/AttestationLatencyChart';
import { HeadLatencyChart } from './components/HeadLatencyChart';
import { MetricsSkeleton } from './components/MetricsSkeleton';
import { useBeaconClock } from '@/hooks/useBeaconClock';
import { useNetwork } from '@/hooks/useNetwork';
import { isEpochAtOrAfter } from '@/utils/beacon';

// Node table columns (constant, defined once outside component)
const nodeColumns: Column<FctNodeActiveLast24h>[] = [
  {
    header: 'Location',
    accessor: (node: FctNodeActiveLast24h) => {
      const city = node.meta_client_geo_city;
      const country = node.meta_client_geo_country;
      const countryCode = node.meta_client_geo_country_code;
      const flag = countryCode ? getCountryFlag(countryCode, '') : '';

      // Show city + country if both available
      if (city && country) {
        return (
          <div className="flex items-center gap-2">
            {flag && <span>{flag}</span>}
            <span>{`${city}, ${country}`}</span>
          </div>
        );
      }
      // Otherwise show just country if available
      if (country) {
        return (
          <div className="flex items-center gap-2">
            {flag && <span>{flag}</span>}
            <span>{country}</span>
          </div>
        );
      }
      // No location data
      return <span className="text-muted/60">Unknown</span>;
    },
    cellClassName: 'text-muted',
  },
  {
    header: 'Implementation',
    accessor: (node: FctNodeActiveLast24h) => {
      if (node.meta_client_implementation && node.meta_client_version) {
        return `${node.meta_client_implementation} ${node.meta_client_version}`;
      }
      return node.meta_client_implementation || node.meta_client_version || '-';
    },
    cellClassName: 'text-muted',
  },
  {
    header: 'Consensus',
    accessor: (node: FctNodeActiveLast24h) => node.meta_consensus_implementation || '-',
    cellClassName: 'text-muted',
  },
  {
    header: 'Consensus Version',
    accessor: (node: FctNodeActiveLast24h) => node.meta_consensus_version || '-',
    cellClassName: 'text-muted',
  },
  {
    header: 'Last Seen',
    accessor: (node: FctNodeActiveLast24h) => {
      if (node.last_seen_date_time) {
        return <Timestamp timestamp={node.last_seen_date_time} format="relative" />;
      }
      return '-';
    },
    cellClassName: 'text-muted',
  },
];

export function DetailPage(): JSX.Element {
  const { id } = useParams({ from: '/xatu/contributors/$id' });

  // State for triggering re-renders to update relative time
  const [, setNow] = useState(Date.now());

  // State for showing all nodes in the table
  const [showAllNodes, setShowAllNodes] = useState(false);

  // Get current epoch for fork detection
  const { epoch: currentEpoch } = useBeaconClock();
  const { currentNetwork } = useNetwork();

  // Scroll to top when contributor ID changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  // Update relative time every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Get slot player meta state
  const { isLoading: slotPlayerLoading, error: slotPlayerError } = useSlotPlayerMeta();

  // Query all three categories since we don't know which one the username belongs to
  const {
    data: pubData,
    error: pubError,
    isLoading: pubLoading,
  } = useQuery({
    ...fctNodeActiveLast24hServiceListOptions({
      query: {
        username_eq: id,
        meta_client_name_starts_with: 'pub-',
        page_size: 1000,
        order_by: 'last_seen_date_time DESC',
      },
    }),
  });

  const {
    data: corpData,
    error: corpError,
    isLoading: corpLoading,
  } = useQuery({
    ...fctNodeActiveLast24hServiceListOptions({
      query: {
        username_eq: id,
        meta_client_name_starts_with: 'corp-',
        page_size: 1000,
        order_by: 'last_seen_date_time DESC',
      },
    }),
  });

  const {
    data: ethData,
    error: ethError,
    isLoading: ethLoading,
  } = useQuery({
    ...fctNodeActiveLast24hServiceListOptions({
      query: {
        username_eq: id,
        meta_client_name_starts_with: 'ethpandaops',
        page_size: 1000,
        order_by: 'last_seen_date_time DESC',
      },
    }),
  });

  const isLoading = pubLoading || corpLoading || ethLoading;
  const error = pubError || corpError || ethError;

  // Combine all results from the three queries
  const allNodes = [
    ...(pubData?.fct_node_active_last_24h ?? []),
    ...(corpData?.fct_node_active_last_24h ?? []),
    ...(ethData?.fct_node_active_last_24h ?? []),
  ];

  const data = allNodes.length > 0 ? { fct_node_active_last_24h: allNodes } : null;

  if (isLoading || slotPlayerLoading) {
    return (
      <Container>
        <Header title="Contributor Details" description="Detailed contribution metrics and activity" />
        <UserDetailsSkeleton />
        {!isLoading && slotPlayerLoading && (
          <div className="mt-8">
            <h2 className="mb-4 text-2xl/8 font-bold text-foreground">Live Metrics</h2>
            <MetricsSkeleton />
          </div>
        )}
      </Container>
    );
  }

  if (error || slotPlayerError) {
    return (
      <Container>
        <Header title="Contributor Details" description="Detailed contribution metrics and activity" />
        <div className="rounded-sm border border-danger bg-danger/10 p-4 text-danger">
          {error && `Error loading contributor: ${error.message}`}
          {slotPlayerError && `Error initializing slot player: ${slotPlayerError.message}`}
        </div>
        <Link to="/xatu/contributors" className="mt-4 inline-block text-primary hover:underline">
          ← Back to all contributors
        </Link>
      </Container>
    );
  }

  const nodes = data?.fct_node_active_last_24h ?? [];

  if (nodes.length === 0) {
    return (
      <Container>
        <Header title="Contributor Details" description="Detailed contribution metrics and activity" />
        <div className="rounded-sm border border-border bg-surface/50 p-12 text-center backdrop-blur-sm">
          <h2 className="mb-2 text-2xl/8 font-bold text-foreground">Contributor not found</h2>
          <p className="mb-4 text-muted">No active nodes found for &quot;{id}&quot; in the last 24 hours.</p>
          <Link to="/xatu/contributors" className="text-primary hover:underline">
            ← Back to all contributors
          </Link>
        </div>
      </Container>
    );
  }

  const contributoor = nodes[0];
  const username = contributoor.username || id;
  const classification = (contributoor.classification || 'unclassified') as UserClassification;

  // Aggregate statistics (single pass through nodes for efficiency)
  const uniqueLocations = new Set<string>();
  const uniqueConsensusClients = new Set<string>();
  let latestSeen = 0;

  nodes.forEach(n => {
    if (n.meta_client_geo_country) uniqueLocations.add(n.meta_client_geo_country);
    if (n.meta_consensus_implementation) uniqueConsensusClients.add(n.meta_consensus_implementation);
    if (n.last_seen_date_time && n.last_seen_date_time > latestSeen) {
      latestSeen = n.last_seen_date_time;
    }
  });

  return (
    <Container>
      {/* Compact Profile Header */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl/9 font-bold text-foreground">{username}</h1>
        <span
          className={`inline-flex shrink-0 items-center rounded-sm px-1.5 py-0.5 text-xs font-medium inset-ring ${getClassificationBadgeClasses(classification)}`}
        >
          {getClassificationLabel(classification)}
        </span>

        {/* Inline Client Logos */}
        {uniqueConsensusClients.size > 0 && (
          <>
            <span className="text-muted">·</span>
            <div className="flex items-center gap-2">
              {Array.from(uniqueConsensusClients)
                .filter((client): client is string => typeof client === 'string')
                .map(client => (
                  <ClientLogo key={client} client={client} size={24} />
                ))}
            </div>
          </>
        )}
      </div>

      {/* Statistics - Full Width */}
      <Stats
        className="mb-6"
        stats={[
          {
            id: 'active-nodes',
            name: 'Active Nodes',
            value: nodes.length.toString(),
          },
          {
            id: 'countries',
            name: 'Countries',
            value: uniqueLocations.size.toString(),
          },
          {
            id: 'last-seen',
            name: 'Last Seen',
            value: getRelativeTime(latestSeen),
          },
        ]}
      />

      {/* Nodes Table */}
      <Table data={showAllNodes ? nodes : nodes.slice(0, 5)} columns={nodeColumns} variant="nested" />
      {nodes.length > 5 && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setShowAllNodes(!showAllNodes)}
            className="text-sm/6 font-medium text-primary hover:underline"
          >
            {showAllNodes ? 'Show Less' : `Show More (${nodes.length - 5} more)`}
          </button>
        </div>
      )}

      {/* Live Metrics Section */}
      <div className="mt-12">
        <h2 className="mb-6 text-2xl/8 font-bold text-foreground">Propagation Latency Metrics</h2>
        <p className="mb-6 text-muted">
          Real-time propagation latency for blocks, blobs, attestations, and head events observed by this
          contributor&apos;s nodes. Use the controls below to navigate through historical data.
        </p>

        <div className="mb-6">
          <SlotPlayerControls />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <PopoutCard
            title="Block Propagation"
            subtitle="Time from slot start to first seen"
            modalSize="full"
            anchorId="block-latency"
          >
            <BlockLatencyChart username={username} />
          </PopoutCard>

          {isEpochAtOrAfter(currentEpoch, currentNetwork?.forks?.consensus?.fusaka?.epoch) ? (
            <PopoutCard
              title="Data Column Propagation"
              subtitle="Time from slot start to first seen"
              modalSize="full"
              anchorId="data-column-latency"
            >
              <DataColumnLatencyChart username={username} nodes={nodes} />
            </PopoutCard>
          ) : (
            <PopoutCard
              title="Blob Propagation"
              subtitle="Time from slot start to first seen"
              modalSize="full"
              anchorId="blob-latency"
            >
              <BlobLatencyChart username={username} />
            </PopoutCard>
          )}

          <PopoutCard
            title="Head Events"
            subtitle="Time from slot start to first seen"
            modalSize="full"
            anchorId="head-latency"
          >
            <HeadLatencyChart username={username} />
          </PopoutCard>

          <PopoutCard
            title="Attestations"
            subtitle="Median attestation propagation latency"
            modalSize="full"
            anchorId="attestation-latency"
          >
            <AttestationLatencyChart username={username} />
          </PopoutCard>
        </div>
      </div>
    </Container>
  );
}
