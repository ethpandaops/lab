import { type JSX } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { fctNodeActiveLast24hServiceListOptions } from '@/api/@tanstack/react-query.gen';
import type { FctNodeActiveLast24h } from '@/api/types.gen';
import { Card } from '@/components/Layout/Card';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { Stats } from '@/components/DataDisplay/Stats';
import { Table } from '@/components/Lists/Table';
import type { Column } from '@/components/Lists/Table';
import { UserDetailsSkeleton } from './components/UserDetailsSkeleton';
import type { UserClassification } from './components/UserCard/UserCard.types';
import { getBorderColor, getClassificationLabel, getClassificationColor } from './components/UserCard/utils';

export function DetailPage(): JSX.Element {
  const { id } = useParams({ from: '/xatu/contributors/$id' });

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

  if (isLoading) {
    return (
      <Container>
        <Header title="Contributor Details" description="Detailed contribution metrics and activity" />
        <UserDetailsSkeleton />
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Header title="Contributor Details" description="Detailed contribution metrics and activity" />
        <div className="rounded-sm border border-danger bg-danger/10 p-4 text-danger">
          Error loading contributor: {error.message}
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

  // Aggregate statistics
  const uniqueLocations = new Set(nodes.map(n => n.meta_client_geo_country).filter(Boolean));
  const uniqueConsensusClients = new Set(nodes.map(n => n.meta_consensus_implementation).filter(Boolean));

  const latestSeen = Math.max(...nodes.map(n => n.last_seen_date_time || 0));

  const nodeColumns: Column<FctNodeActiveLast24h>[] = [
    {
      header: 'Location',
      accessor: (node: FctNodeActiveLast24h) => {
        // Show city + country if both available
        if (node.meta_client_geo_city && node.meta_client_geo_country) {
          return `${node.meta_client_geo_city}, ${node.meta_client_geo_country}`;
        }
        // Otherwise show just country if available
        if (node.meta_client_geo_country) {
          return node.meta_client_geo_country;
        }
        // No location data
        return <span className="text-muted/60">Unknown</span>;
      },
      cellClassName: 'text-xs/5 text-muted',
    },
    {
      header: 'Implementation',
      accessor: (node: FctNodeActiveLast24h) => {
        if (node.meta_client_implementation && node.meta_client_version) {
          return `${node.meta_client_implementation} ${node.meta_client_version}`;
        }
        return node.meta_client_implementation || node.meta_client_version || '-';
      },
      cellClassName: 'text-xs/5 text-muted',
    },
    {
      header: 'Consensus',
      accessor: (node: FctNodeActiveLast24h) => node.meta_consensus_implementation || '-',
      cellClassName: 'text-xs/5 text-muted',
    },
    {
      header: 'Consensus Version',
      accessor: (node: FctNodeActiveLast24h) => node.meta_consensus_version || '-',
      cellClassName: 'text-xs/5 text-muted',
    },
    {
      header: 'Last Seen',
      accessor: (node: FctNodeActiveLast24h) => {
        if (node.last_seen_date_time) {
          return new Date(node.last_seen_date_time * 1000).toLocaleString();
        }
        return '-';
      },
      cellClassName: 'text-xs/5 text-muted',
    },
  ];

  return (
    <Container>
      <Header title="Contributor Details" description="Detailed contribution metrics and activity" />

      <Link to="/xatu/contributors" className="mb-6 inline-block text-primary hover:underline">
        ← Back to all contributors
      </Link>

      {/* Profile Header Card */}
      <Card className={`mb-6 border-l-4 ${getBorderColor(classification)}`}>
        <div className="flex-1">
          <h1 className="mb-2 text-3xl/9 font-bold text-foreground">{username}</h1>
          <p className={`text-lg/7 font-medium ${getClassificationColor(classification)}`}>
            {getClassificationLabel(classification)}
          </p>
        </div>
      </Card>

      {/* Statistics */}
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
            id: 'consensus-clients',
            name: 'Consensus Clients',
            value: uniqueConsensusClients.size.toString(),
          },
          {
            id: 'last-seen',
            name: 'Last Seen',
            value: new Date(latestSeen * 1000).toLocaleDateString(),
          },
        ]}
      />

      {/* Consensus Clients Detail */}
      {uniqueConsensusClients.size > 0 && (
        <Card className="mb-6">
          <h3 className="mb-3 text-sm/6 font-semibold text-muted">Consensus Client Implementations</h3>
          <div className="flex flex-wrap gap-3">
            {Array.from(uniqueConsensusClients)
              .filter((client): client is string => typeof client === 'string')
              .map(client => (
                <ClientLogo key={client} client={client} size={32} />
              ))}
          </div>
        </Card>
      )}

      {/* All Nodes Table */}
      <Card header={<h2 className="text-lg/7 font-semibold text-foreground">All Nodes ({nodes.length})</h2>}>
        <Table data={nodes.slice(0, 50)} columns={nodeColumns} variant="nested" />
        {nodes.length > 50 && (
          <div className="mt-4 text-center text-sm/6 text-muted">Showing 50 of {nodes.length} nodes</div>
        )}
      </Card>
    </Container>
  );
}
