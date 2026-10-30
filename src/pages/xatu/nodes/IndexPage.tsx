import type { JSX } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { SegmentedControl } from '@/components/Forms/SegmentedControl';
import { Route } from '@/routes/xatu/nodes/index';
import { Stats } from '@/components/DataDisplay/Stats';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import { Alert } from '@/components/Feedback/Alert';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { getCountryFlag } from '@/utils';
import { getConsensusClientColor } from '@/utils/ethereum';
import { formatClientName } from '@/utils/graffiti';
import {
  ArrivalHistogram,
  BreakdownList,
  ClientArrivalChart,
  NetworkArrivalChart,
  NodeMap,
  NodesSkeleton,
  NodesTable,
} from './components';
import type { BreakdownItem } from './components/BreakdownList/BreakdownList';
import { DEFAULT_NODE_RANGE, NODE_RANGE_CONFIG, NODE_RANGE_OPTIONS } from './constants';
import { useNodeHistory } from './hooks/useNodeHistory';
import { useNodeRows, type NodeRow } from './hooks/useNodeRows';
import { formatMs, median, shortVersion } from './utils/node-stats';

const DESCRIPTION = 'Nodes that reported to Xatu in the last 24 hours.';

/** Count rows by key, with the median block arrival of each group */
function groupRows(
  rows: NodeRow[],
  keyOf: (row: NodeRow) => string | undefined
): Map<string, { count: number; timings: number[]; sample: NodeRow }> {
  const groups = new Map<string, { count: number; timings: number[]; sample: NodeRow }>();
  rows.forEach(row => {
    const key = keyOf(row) || 'unknown';
    if (!groups.has(key)) groups.set(key, { count: 0, timings: [], sample: row });
    const group = groups.get(key)!;
    group.count++;
    if (row.observation?.blockP50 != null) group.timings.push(row.observation.blockP50);
  });
  return groups;
}

/**
 * Nodes overview: headline counts, where nodes are, how fast they see blocks, and every node in a table.
 */
export function IndexPage(): JSX.Element {
  const { rows, network, block24h, isLoading, timingsLoading, error } = useNodeRows();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: '/xatu/nodes/' });
  const range = search.range ?? DEFAULT_NODE_RANGE;
  const rangeLabel = NODE_RANGE_CONFIG[range].label;
  const history = useNodeHistory('block', range, {});

  if (isLoading) {
    return (
      <Container>
        <Header title="Nodes" description={DESCRIPTION} />
        <NodesSkeleton />
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Header title="Nodes" description={DESCRIPTION} />
        <Alert variant="error" title="Error loading nodes" description={error.message} />
      </Container>
    );
  }

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
    detail: formatMs(median(group.timings)),
  }));

  const versionItems: BreakdownItem[] = [
    ...groupRows(rows, row =>
      `${row.node.meta_client_implementation ?? ''} ${shortVersion(row.node.meta_client_version)}`.trim()
    ).entries(),
  ].map(([version, group]) => ({
    key: version,
    label: version,
    count: group.count,
    detail: group.sample.newerVersion ? <span className="text-warning">Outdated</span> : 'Latest',
  }));

  const countryItems: BreakdownItem[] = [...groupRows(rows, row => row.node.meta_client_geo_country).entries()].map(
    ([country, group]) => ({
      key: country,
      label: country === 'unknown' ? 'Unknown' : country,
      icon: <span>{getCountryFlag(group.sample.node.meta_client_geo_country_code, '')}</span>,
      count: group.count,
      detail: formatMs(median(group.timings)),
    })
  );

  const nodeMedians = rows.flatMap(row => (row.observation?.blockP50 == null ? [] : [row.observation.blockP50]));
  // Node medians sit in a narrow band, so fit the axis to them in 250 ms steps
  const histogramMin = nodeMedians.length > 0 ? Math.floor(Math.min(...nodeMedians) / 250) * 250 : 0;
  const histogramMax = nodeMedians.length > 0 ? Math.ceil((Math.max(...nodeMedians) + 1) / 250) * 250 : 5000;

  return (
    <Container>
      <Header title="Nodes" description={DESCRIPTION} />

      <div className="flex flex-col gap-6">
        <Stats
          gridClassName="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6"
          stats={[
            { id: 'nodes', name: 'Nodes', value: rows.length, subtitle: `${online} online` },
            { id: 'contributors', name: 'Contributors', value: contributors },
            { id: 'countries', name: 'Countries', value: countries },
            { id: 'asns', name: 'ASNs', value: asns },
            {
              id: 'block',
              name: 'Block arrival p50',
              value: timingsLoading ? '…' : formatMs(network.blockP50),
              subtitle: 'Last 24h',
            },
            {
              id: 'attestation',
              name: 'Attestation arrival p50',
              value: timingsLoading ? '…' : formatMs(network.attestationP50),
              subtitle: 'Last 24h',
            },
          ]}
        />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <NodeMap rows={rows} resetKey={block24h?.buckets[0]} />
          </div>
          <BreakdownList title="Consensus clients" items={clientItems} detailLabel="Block p50" />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg/7 font-semibold tracking-tight text-foreground">Block arrival</h2>
          <SegmentedControl
            options={NODE_RANGE_OPTIONS}
            value={range}
            onChange={value => navigate({ search: prev => ({ ...prev, range: value }), replace: true })}
            ariaLabel="Time range"
          />
        </div>
        {history.data ? (
          <div className="-mt-2 grid grid-cols-1 gap-6 xl:grid-cols-2">
            <NetworkArrivalChart history={history.data} rangeLabel={rangeLabel} />
            <ClientArrivalChart history={history.data} rangeLabel={rangeLabel} />
          </div>
        ) : (
          <div className="-mt-2 grid grid-cols-1 gap-6 xl:grid-cols-2">
            <LoadingContainer className="h-96 rounded-sm" />
            <LoadingContainer className="h-96 rounded-sm" />
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <BreakdownList title="Collector versions" items={versionItems} detailLabel="Status" limit={6} />
          <BreakdownList title="Countries" items={countryItems} detailLabel="Block p50" limit={6} />
          <ArrivalHistogram
            title="Node block arrival"
            subtitle="Each node's median, last 24h"
            anchorId="node-arrival-histogram"
            values={nodeMedians}
            unit="Nodes"
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
