import { type JSX, useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import clsx from 'clsx';
import { useQuery } from '@tanstack/react-query';
import { fctNodeLastSeenServiceListOptions } from '@/api/@tanstack/react-query.gen';
import type { FctNodeLastSeen } from '@/api/types.gen';
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
import { useNetworkHistory } from '@/pages/xatu/nodes/hooks/useNetworkHistory';
import { useNodeHistory, type HistoryMetric } from '@/pages/xatu/nodes/hooks/useNodeHistory';
import { behindStarts } from '@/pages/xatu/nodes/utils/history';
import { getBuckets } from '@/pages/xatu/nodes/utils/time-buckets';
import { NodeClientVersion } from '@/pages/ethereum/clients/components/NodeClientVersion';

const HISTORY_CHARTS: Array<{ metric: HistoryMetric; title: string; subtitle: string; anchorId: string }> = [
  { metric: 'block', title: 'Block arrival', subtitle: 'Median per Xatu node', anchorId: 'block-latency' },
  { metric: 'head', title: 'Head events', subtitle: 'Median per Xatu node', anchorId: 'head-latency' },
  { metric: 'attestation', title: 'Attestations', subtitle: 'Median per Xatu node', anchorId: 'attestation-latency' },
  {
    metric: 'dataColumn',
    title: 'Data columns',
    subtitle: 'Median per Xatu node of when the last custody column arrived',
    anchorId: 'data-column-latency',
  },
];

/** A Xatu node's city and country with its flag */
function NodeLocation({ node }: { node: FctNodeLastSeen }): JSX.Element {
  const city = node.meta_client_geo_city;
  const country = node.meta_client_geo_country;
  const countryCode = node.meta_client_geo_country_code;
  const flag = countryCode ? getCountryFlag(countryCode, '') : '';

  if (!country) return <span className="text-muted/60">Unknown</span>;
  return (
    <div className="flex items-center gap-2">
      {flag && <span>{flag}</span>}
      <span>{city ? `${city}, ${country}` : country}</span>
    </div>
  );
}

/** Columns past the Node ID give way on narrow screens, where the Node ID cell stacks them instead */
const WIDE_ONLY = 'hidden sm:table-cell';

// Node table columns (constant, defined once outside component)
const nodeColumns: Column<FctNodeLastSeen>[] = [
  {
    header: 'Node ID',
    accessor: (node: FctNodeLastSeen) => (
      <div className="flex flex-col gap-1">
        {node.node_id ? (
          <Link
            to="/xatu/nodes/$nodeId"
            params={{ nodeId: node.node_id }}
            className="font-mono wrap-anywhere text-primary hover:underline"
          >
            {node.node_id}
          </Link>
        ) : (
          '-'
        )}
        <div className="flex flex-col gap-1 text-xs text-muted sm:hidden">
          {node.meta_consensus_implementation && (
            <NodeClientVersion client={node.meta_consensus_implementation} version={node.meta_consensus_version} />
          )}
          <NodeLocation node={node} />
          {node.last_seen_date_time && <Timestamp timestamp={node.last_seen_date_time} format="relative" />}
        </div>
      </div>
    ),
    cellClassName: 'max-sm:whitespace-normal text-foreground',
  },
  {
    header: 'Location',
    accessor: (node: FctNodeLastSeen) => <NodeLocation node={node} />,
    cellClassName: clsx('text-muted', WIDE_ONLY),
    headerClassName: WIDE_ONLY,
  },
  {
    header: 'Implementation',
    accessor: (node: FctNodeLastSeen) => {
      if (node.meta_client_implementation && node.meta_client_version) {
        return `${node.meta_client_implementation} ${node.meta_client_version}`;
      }
      return node.meta_client_implementation || node.meta_client_version || '-';
    },
    cellClassName: clsx('text-muted', WIDE_ONLY),
    headerClassName: WIDE_ONLY,
  },
  {
    header: 'Consensus',
    accessor: (node: FctNodeLastSeen) =>
      node.meta_consensus_implementation ? (
        <NodeClientVersion client={node.meta_consensus_implementation} version={node.meta_consensus_version} />
      ) : (
        '-'
      ),
    cellClassName: clsx('text-muted', WIDE_ONLY),
    headerClassName: WIDE_ONLY,
  },
  {
    header: 'Last Seen',
    accessor: (node: FctNodeLastSeen) => {
      if (node.last_seen_date_time) {
        return <Timestamp timestamp={node.last_seen_date_time} format="relative" />;
      }
      return '-';
    },
    cellClassName: clsx('text-muted', WIDE_ONLY),
    headerClassName: WIDE_ONLY,
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
  // The network's block arrival, to tell when one of these nodes was catching up rather than slow
  const networkMedians = useNetworkHistory(range).data?.medians ?? new Map<number, number>();
  const behindOf = (nodeId: string): Set<number> =>
    behindStarts(
      (histories.block.data?.rows ?? []).filter(row => row.nodeId === nodeId),
      networkMedians
    );

  // Every Xatu node the contributor ever ran, newest first; the range only narrows what is shown
  const { data, error, isLoading } = useQuery({
    ...fctNodeLastSeenServiceListOptions({
      query: {
        // The API requires a filter the primary key index can use
        meta_client_name_ne: '',
        username_eq: id,
        page_size: 10000,
        order_by: 'last_seen_date_time DESC',
      },
    }),
  });
  const allNodes = data?.fct_node_last_seen ?? [];
  const seen = search.seen ?? 'all';
  const seenStart = seen === 'all' ? 0 : getBuckets(seen, Date.now() / 1000)[0];
  const nodes = allNodes.filter(node => (node.last_seen_date_time ?? 0) >= seenStart);

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

  if (allNodes.length === 0) {
    return (
      <Container>
        <Header title="Contributor Details" />
        <div className="rounded-sm border border-border bg-surface p-12 text-center">
          <h2 className="mb-2 text-lg/7 font-semibold text-foreground">Contributor not found</h2>
          <p className="mb-4 text-muted">No Xatu nodes from &quot;{id}&quot;.</p>
          <Link to="/xatu/contributors" className="text-primary hover:underline">
            ← Back to all contributors
          </Link>
        </div>
      </Container>
    );
  }

  const contributoor = allNodes[0];
  const username = contributoor.username || id;
  const classification = (contributoor.classification || 'unclassified') as UserClassification;

  // Aggregate statistics (single pass through nodes for efficiency)
  const uniqueLocations = new Set<string>();
  const uniqueConsensusClients = new Set<string>();
  let latestSeen = 0;

  nodes.forEach(n => {
    if (n.meta_client_geo_country) uniqueLocations.add(n.meta_client_geo_country);
    if (n.meta_consensus_implementation) uniqueConsensusClients.add(n.meta_consensus_implementation);
  });
  allNodes.forEach(n => {
    if (n.last_seen_date_time && n.last_seen_date_time > latestSeen) {
      latestSeen = n.last_seen_date_time;
    }
  });
  const seenLabel = NODE_RANGE_CONFIG[seen].label;

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
          <div className="flex items-center gap-2">
            {Array.from(uniqueConsensusClients)
              .filter((client): client is string => typeof client === 'string')
              .map(client => (
                <ClientLogo key={client} client={client} size={24} />
              ))}
          </div>
        )}
      </div>

      <SegmentedControl
        options={NODE_RANGE_OPTIONS}
        value={seen}
        onChange={value =>
          navigate({
            search: prev => ({ ...prev, seen: value === 'all' ? undefined : value }),
            replace: true,
            resetScroll: false,
          })
        }
        ariaLabel="Xatu nodes time range"
        className="mb-4"
      />

      {/* Statistics - Full Width */}
      <Stats
        className="mb-6"
        stats={[
          {
            id: 'active-nodes',
            // Hashed node IDs rotate, so past a day they count IDs rather than machines
            name: seen === '24h' ? 'Xatu nodes' : 'Node IDs',
            value: nodes.length.toString(),
            subtitle: seenLabel,
          },
          {
            id: 'countries',
            name: 'Countries',
            value: uniqueLocations.size.toString(),
            subtitle: seenLabel,
          },
          {
            id: 'last-seen',
            name: 'Last Seen',
            value: getRelativeTime(latestSeen),
          },
        ]}
      />

      {/* Nodes Table */}
      {nodes.length > 0 && (
        <Table data={showAllNodes ? nodes : nodes.slice(0, 5)} columns={nodeColumns} variant="nested" />
      )}
      {nodes.length > 5 && (
        <div className="mt-4 text-center">
          <Button variant="secondary" size="sm" onClick={() => setShowAllNodes(!showAllNodes)}>
            {showAllNodes ? 'Show less' : `Show ${nodes.length - 5} more`}
          </Button>
        </div>
      )}

      <div className="mt-12">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg/7 font-semibold text-foreground">Observation timings</h2>
          <SegmentedControl
            options={NODE_RANGE_OPTIONS}
            value={range}
            onChange={value =>
              navigate({ search: prev => ({ ...prev, range: value }), replace: true, resetScroll: false })
            }
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
                behindOf={behindOf}
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
