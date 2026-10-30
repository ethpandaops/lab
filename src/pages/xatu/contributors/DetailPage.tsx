import { type JSX, useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { fctNodeActiveLast24hServiceListOptions } from '@/api/@tanstack/react-query.gen';
import type { FctNodeActiveLast24h } from '@/api/types.gen';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import { Button } from '@/components/Elements/Button';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { SegmentedControl } from '@/components/Forms/SegmentedControl';
import { Stats } from '@/components/DataDisplay/Stats';
import { Table } from '@/components/Lists/Table';
import type { Column } from '@/components/Lists/Table';
import { UserDetailsSkeleton } from './components/UserDetailsSkeleton';
import type { UserClassification } from './components/UserCard/UserCard.types';
import { getClassificationLabel, getClassificationBadgeClasses, getCountryFlag, getRelativeTime } from '@/utils';
import { Timestamp } from '@/components/DataDisplay/Timestamp';
import { Route } from '@/routes/xatu/contributors/$id';
import { PerNodeHistoryChart } from '@/pages/xatu/nodes/components';
import { DEFAULT_NODE_RANGE, NODE_RANGE_CONFIG, NODE_RANGE_OPTIONS } from '@/pages/xatu/nodes/constants';
import { useNodeHistory, type HistoryMetric } from '@/pages/xatu/nodes/hooks/useNodeHistory';

const HISTORY_CHARTS: Array<{ metric: HistoryMetric; title: string; subtitle: string; anchorId: string }> = [
  { metric: 'block', title: 'Block arrival', subtitle: 'Median per node', anchorId: 'block-latency' },
  { metric: 'head', title: 'Head events', subtitle: 'Median per node', anchorId: 'head-latency' },
  { metric: 'attestation', title: 'Attestations', subtitle: 'Median per node', anchorId: 'attestation-latency' },
  {
    metric: 'dataColumn',
    title: 'Data columns',
    subtitle: 'Median per node of when the last custody column arrived',
    anchorId: 'data-column-latency',
  },
];

// Node table columns (constant, defined once outside component)
const nodeColumns: Column<FctNodeActiveLast24h>[] = [
  {
    header: 'Node',
    accessor: (node: FctNodeActiveLast24h) =>
      node.node_id ? (
        <Link
          to="/xatu/nodes/$nodeId"
          params={{ nodeId: node.node_id }}
          className="font-mono text-primary hover:underline"
        >
          {node.node_id}
        </Link>
      ) : (
        '-'
      ),
  },
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

  const search = Route.useSearch();
  const navigate = useNavigate({ from: '/xatu/contributors/$id' });
  const range = search.range ?? DEFAULT_NODE_RANGE;
  const rangeLabel = NODE_RANGE_CONFIG[range].label;
  const histories = {
    block: useNodeHistory('block', range, { username: id }),
    head: useNodeHistory('head', range, { username: id }),
    attestation: useNodeHistory('attestation', range, { username: id }),
    dataColumn: useNodeHistory('dataColumn', range, { username: id }),
  };

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
        <Header title="Contributor Details" />
        <UserDetailsSkeleton />
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Header title="Contributor Details" />
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
        <Header title="Contributor Details" />
        <div className="rounded-sm border border-border bg-surface p-12 text-center">
          <h2 className="mb-2 text-lg/7 font-semibold text-foreground">Contributor not found</h2>
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
        <Header title={username} size="lg" className="mb-0" />
        <span
          className={`inline-flex shrink-0 items-center rounded-sm px-1.5 py-0.5 text-xs font-medium inset-ring ${getClassificationBadgeClasses(classification)}`}
        >
          {getClassificationLabel(classification)}
        </span>

        {/* Inline Client Logos */}
        {uniqueConsensusClients.size > 0 && (
          <>
            <span className="text-muted">/</span>
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
          <Button variant="secondary" size="sm" onClick={() => setShowAllNodes(!showAllNodes)}>
            {showAllNodes ? 'Show Less' : `Show More (${nodes.length - 5} more)`}
          </Button>
        </div>
      )}

      <div className="mt-12">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg/7 font-semibold text-foreground">Propagation latency</h2>
          <SegmentedControl
            options={NODE_RANGE_OPTIONS}
            value={range}
            onChange={value => navigate({ search: prev => ({ ...prev, range: value }), replace: true })}
            ariaLabel="Time range"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {HISTORY_CHARTS.map(chart => {
            const history = histories[chart.metric as keyof typeof histories].data;
            return history ? (
              <PerNodeHistoryChart
                key={chart.metric}
                title={chart.title}
                subtitle={`${chart.subtitle}, ${rangeLabel.toLowerCase()}`}
                anchorId={chart.anchorId}
                history={history}
                nodeIds={nodes.flatMap(node => (node.node_id ? [node.node_id] : []))}
                clientOf={nodeId => nodes.find(node => node.node_id === nodeId)?.meta_consensus_implementation}
              />
            ) : (
              <LoadingContainer key={chart.metric} className="h-96 rounded-sm" />
            );
          })}
        </div>
      </div>
    </Container>
  );
}
