import type { JSX } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { CpuChipIcon } from '@heroicons/react/20/solid';
import { SegmentedControl } from '@/components/Forms/SegmentedControl';
import { SelectMenu } from '@/components/Forms/SelectMenu';
import { Route } from '@/routes/xatu/nodes/index';
import { Stats } from '@/components/DataDisplay/Stats';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import { Alert } from '@/components/Feedback/Alert';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { getConsensusClientColor } from '@/utils/ethereum';
import { formatClientName } from '@/utils/graffiti';
import {
  ArrivalHistogram,
  BreakdownList,
  ClientArrivalChart,
  ContributorHistory,
  LocationsBreakdown,
  NetworkArrivalChart,
  NodeMap,
  NodesSkeleton,
  NodesTable,
} from './components';
import type { BreakdownItem } from './components/BreakdownList/BreakdownList';
import { DEFAULT_NODE_RANGE, NODE_RANGE_CONFIG, NODE_RANGE_OPTIONS } from './constants';
import { useLatestDayNodes } from './hooks/useLatestDayNodes';
import { useNetworkHistory } from './hooks/useNetworkHistory';
import { useNodeRows, type NodeRow } from './hooks/useNodeRows';
import { formatMs, median } from './utils/node-stats';

/** Count rows by key */
function groupRows(
  rows: NodeRow[],
  keyOf: (row: NodeRow) => string | undefined
): Map<string, { count: number; sample: NodeRow }> {
  const groups = new Map<string, { count: number; sample: NodeRow }>();
  rows.forEach(row => {
    const key = keyOf(row) || 'unknown';
    if (!groups.has(key)) groups.set(key, { count: 0, sample: row });
    groups.get(key)!.count++;
  });
  return groups;
}

/**
 * Xatu nodes overview: headline counts, where they are, when they see blocks, and every Xatu node in a table.
 * `?contributor=` narrows all of it to one contributor's Xatu nodes.
 */
export function IndexPage(): JSX.Element {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: '/xatu/nodes/' });
  const range = search.range ?? DEFAULT_NODE_RANGE;
  const rangeLabel = NODE_RANGE_CONFIG[range].label;
  const contributor = search.contributor;
  const { rows: allRows, block, isLoading, error } = useNodeRows(range);
  const latestDay = useLatestDayNodes(contributor);
  const networkHistory = useNetworkHistory(range);

  if (isLoading) {
    return (
      <Container>
        <Header title="Xatu nodes" />
        <NodesSkeleton />
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Header title="Xatu nodes" />
        <Alert variant="error" title="Error loading Xatu nodes" description={error.message} />
      </Container>
    );
  }

  const rows = contributor ? allRows.filter(row => row.node.username === contributor) : allRows;
  const usernames = [...new Set([...allRows.map(row => row.node.username), contributor])]
    .filter((username): username is string => !!username)
    .sort((a, b) => a.localeCompare(b));

  const online = rows.filter(row => row.online).length;
  const contributors = new Set(rows.map(row => row.node.username).filter(Boolean)).size;
  const countries = new Set(rows.map(row => row.node.meta_client_geo_country_code).filter(Boolean)).size;
  const asns = new Set(rows.map(row => row.node.meta_client_geo_autonomous_system_number).filter(Boolean)).size;

  const clientItems: BreakdownItem[] = [
    ...groupRows(rows, row => row.node.meta_consensus_implementation?.toLowerCase()).entries(),
  ].map(([client, group], index) => ({
    key: client,
    label: formatClientName(client),
    icon: <ClientLogo client={client} size={18} />,
    count: group.count,
    color: getConsensusClientColor(client, index),
  }));

  // Xatu nodes missing from fct_node_last_seen carry no location
  const locatedRows = rows.filter(row => row.node.last_seen_date_time !== undefined);

  const nodeMedians = rows.flatMap(row => (row.observation?.blockP50 == null ? [] : [row.observation.blockP50]));
  // Node medians sit in a narrow band, so fit the axis to them in 250 ms steps
  const histogramMin = nodeMedians.length > 0 ? Math.floor(Math.min(...nodeMedians) / 250) * 250 : 0;
  const histogramMax = nodeMedians.length > 0 ? Math.ceil((Math.max(...nodeMedians) + 1) / 250) * 250 : 5000;
  // The median node, not the median block
  const attestationMedians = rows.flatMap(row =>
    row.observation?.attestationP50 == null ? [] : [row.observation.attestationP50]
  );

  return (
    <Container>
      <Header title="Xatu nodes" />

      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <SegmentedControl
            options={NODE_RANGE_OPTIONS}
            value={range}
            onChange={value =>
              navigate({ search: prev => ({ ...prev, range: value }), replace: true, resetScroll: false })
            }
            ariaLabel="Time range"
          />
          <SelectMenu
            label="Contributor"
            options={[
              { value: '', label: 'All contributors' },
              ...usernames.map(username => ({ value: username, label: username })),
            ]}
            value={contributor ?? ''}
            onChange={value =>
              navigate({
                search: prev => ({ ...prev, contributor: value || undefined }),
                replace: true,
                resetScroll: false,
              })
            }
            className="w-56"
          />
          <Link
            to="/xatu/nodes/resources"
            className="flex items-center gap-1.5 text-sm/6 font-medium text-primary hover:underline sm:ml-auto"
          >
            <CpuChipIcon className="size-4" />
            Xatu node resources
          </Link>
        </div>

        <Stats
          gridClassName="grid grid-cols-2 md:grid-cols-4"
          stats={[
            {
              id: 'nodes',
              name: 'Xatu nodes',
              value: latestDay.count ?? '–',
              subtitle: `Reporting on ${latestDay.day}`,
            },
            { id: 'node-ids', name: 'Node IDs', value: rows.length, subtitle: rangeLabel },
            { id: 'online', name: 'Online now', value: online, subtitle: 'Xatu nodes' },
            ...(contributor
              ? []
              : [{ id: 'contributors', name: 'Contributors', value: contributors, subtitle: rangeLabel }]),
            { id: 'countries', name: 'Countries', value: countries, subtitle: rangeLabel },
            { id: 'asns', name: 'ASNs', value: asns, subtitle: rangeLabel },
            {
              id: 'block',
              name: 'Block arrival',
              value: formatMs(median(nodeMedians)),
              subtitle: `Median Xatu node, ${rangeLabel.toLowerCase()}`,
            },
            {
              id: 'attestation',
              name: 'Attestation arrival',
              value: formatMs(median(attestationMedians)),
              subtitle: `Median Xatu node, ${rangeLabel.toLowerCase()}`,
            },
          ]}
        />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <NodeMap rows={rows} rangeLabel={rangeLabel} />
          </div>
          <BreakdownList title="Consensus clients" subtitle={rangeLabel} items={clientItems} />
        </div>

        <h2 className="text-lg/7 font-semibold tracking-tight text-foreground">
          {contributor ? 'Arrival by Xatu node' : 'Block arrival'}
        </h2>
        {contributor ? (
          <div className="-mt-2">
            <ContributorHistory
              username={contributor}
              range={range}
              rangeLabel={rangeLabel}
              networkMedians={networkHistory.data?.medians ?? new Map<number, number>()}
            />
          </div>
        ) : block && networkHistory.data ? (
          <div className="-mt-2 grid grid-cols-1 gap-6 xl:grid-cols-2">
            <NetworkArrivalChart
              buckets={block.buckets}
              granularity={block.granularity}
              spread={networkHistory.data.spread}
              rangeLabel={rangeLabel}
            />
            <ClientArrivalChart history={block} networkMedians={networkHistory.data.medians} rangeLabel={rangeLabel} />
          </div>
        ) : (
          <div className="-mt-2 grid grid-cols-1 gap-6 xl:grid-cols-2">
            <LoadingContainer className="h-96 rounded-sm" />
            <LoadingContainer className="h-96 rounded-sm" />
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <LocationsBreakdown rows={locatedRows} rangeLabel={rangeLabel} />
          <ArrivalHistogram
            title="Block arrival by node ID"
            subtitle={`Each node ID's median, ${rangeLabel.toLowerCase()}`}
            anchorId="node-arrival-histogram"
            values={nodeMedians}
            unit="Node IDs"
            bucketMs={50}
            minMs={histogramMin}
            maxMs={histogramMax}
            labelEveryMs={250}
          />
        </div>

        <NodesTable rows={rows} />
      </div>
    </Container>
  );
}
