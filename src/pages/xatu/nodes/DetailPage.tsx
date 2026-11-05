import type { JSX, ReactNode } from 'react';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { Stats } from '@/components/DataDisplay/Stats';
import { Alert } from '@/components/Feedback/Alert';
import { SegmentedControl } from '@/components/Forms/SegmentedControl';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { useNetworkChangeRedirect } from '@/hooks/useNetworkChangeRedirect';
import { Route } from '@/routes/xatu/nodes/$nodeId';
import {
  ActivityStrip,
  AttestationArrivalChart,
  ColumnArrivalChart,
  CustodyGrid,
  EngineSection,
  NodeArrivalChart,
  NodeDetailSkeleton,
  NodeHeader,
  NodeSlotsTable,
} from './components';
import { DEFAULT_NODE_RANGE, NETWORK_WINDOW_SLOTS, NODE_RANGE_CONFIG, NODE_RANGE_OPTIONS } from './constants';
import { useBlockSlots } from './hooks/useBlockSlots';
import { useLastSeenNodes } from './hooks/useLastSeenNodes';
import { useNetworkObservations } from './hooks/useNetworkObservations';
import { useNodeDataColumns } from './hooks/useNodeDataColumns';
import { useNodeHistory } from './hooks/useNodeHistory';
import { useNodePerformance } from './hooks/useNodePerformance';
import { buildNodeRows } from './hooks/useNodeRows';
import { behindStarts, medianByStart, rangeValue } from './utils/history';
import { formatMs, getIngestedEndSlot, getSyncState } from './utils/node-stats';

function Section({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}): JSX.Element {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg/7 font-semibold tracking-tight text-foreground">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

/**
 * One node in depth: identity, observation timings from the last day to all time, data column custody,
 * engine API timings and its most recent slots.
 */
export function DetailPage(): JSX.Element {
  const { nodeId } = useParams({ from: '/xatu/nodes/$nodeId' });
  const search = Route.useSearch();
  const navigate = useNavigate({ from: '/xatu/nodes/$nodeId' });
  const context = Route.useRouteContext();
  useNetworkChangeRedirect(context.redirectOnNetworkChange);

  const range = search.range ?? DEFAULT_NODE_RANGE;
  const rangeLabel = NODE_RANGE_CONFIG[range].label;

  const { nodes, isLoading, error } = useLastSeenNodes(range, nodeId);
  const filter = { nodeId };
  const block = useNodeHistory('block', range, filter);
  const head = useNodeHistory('head', range, filter);
  const attestation = useNodeHistory('attestation', range, filter);
  const row = buildNodeRows(
    nodes.filter(node => node.node_id === nodeId),
    block.data?.rows ?? [],
    attestation.data?.rows ?? [],
    Date.now() / 1000
  )[0];
  const dataColumn = useNodeHistory('dataColumn', range, filter);
  const network = useNodeHistory('block', range, {});
  const blockSlots = useBlockSlots(range);
  // Only ethPandaOps nodes report engine API calls
  const reportsEngine = row?.node.classification === 'internal';
  const newPayload = useNodeHistory('newPayload', range, filter, reportsEngine);
  const getBlobs = useNodeHistory('getBlobs', range, filter, reportsEngine);
  const recent = useNodePerformance(nodeId, NETWORK_WINDOW_SLOTS);
  const recentNetwork = useNetworkObservations();
  const custody = useNodeDataColumns(nodeId);

  const rangeControl = (
    <SegmentedControl
      options={NODE_RANGE_OPTIONS}
      value={range}
      onChange={value => navigate({ search: prev => ({ ...prev, range: value }), replace: true })}
      ariaLabel="Time range"
    />
  );

  if (isLoading || (!row && (block.isLoading || attestation.isLoading))) {
    return (
      <Container>
        <NodeDetailSkeleton />
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Header title={nodeId} />
        <Alert variant="error" title="Error loading Xatu node" description={error.message} />
      </Container>
    );
  }

  if (!row) {
    return (
      <Container>
        <Header title={nodeId} />
        <div className="flex flex-col items-start gap-4">
          {rangeControl}
          <Alert variant="info" title="Xatu node not found" description="No reports in this range." />
        </div>
        <Link to="/xatu/nodes" className="mt-4 inline-block text-sm text-primary hover:underline">
          All Xatu nodes
        </Link>
      </Container>
    );
  }

  const blockRows = block.data?.rows ?? [];
  // Count from the node's first bucket, so a node that joined mid-range isn't marked as missing, over settled
  // buckets: the one in progress lags ingestion
  const firstBucket = blockRows.length > 0 ? Math.min(...blockRows.map(entry => entry.start)) : null;
  const settled = new Set(
    (block.data?.buckets.slice(0, -1) ?? []).filter(
      start => firstBucket !== null && start >= firstBucket && blockSlots.data?.has(start)
    )
  );
  const seen = blockRows.reduce((sum, entry) => sum + (settled.has(entry.start) ? entry.count : 0), 0);
  const expected = [...settled].reduce((sum, start) => sum + blockSlots.data!.get(start)!, 0);

  const latestEngine = newPayload.data?.rows.reduce<(typeof newPayload.data.rows)[number] | null>(
    (latest, entry) => (!latest || entry.start > latest.start ? entry : latest),
    null
  );
  const execution = latestEngine?.client
    ? { implementation: latestEngine.client, version: latestEngine.clientVersion ?? '' }
    : null;
  const hasEngine = !!newPayload.data && newPayload.data.rows.length > 0;
  const hasColumns = !!dataColumn.data && dataColumn.data.rows.length > 0;
  const hasCustody = !!custody.data && custody.data.columns.size > 0;
  const hasRecent = !!recent.data && recent.data.block.size > 0;
  // Hours the node trailed the network by more than a slot were spent catching up after downtime or a resync
  const behind = behindStarts(blockRows, medianByStart(network.data?.rows ?? []));
  const sync =
    row.online && recent.data && recentNetwork.data ? getSyncState(recent.data.block, recentNetwork.data.slots) : null;
  const recentEndSlot = recent.data
    ? recentNetwork.data
      ? getIngestedEndSlot(recentNetwork.data.slots, recent.data.window.endSlot)
      : recent.data.window.endSlot
    : 0;

  return (
    <Container>
      <div className="flex flex-col gap-10">
        <NodeHeader row={row} execution={execution} sync={sync} />

        <Section title={rangeLabel} actions={rangeControl}>
          <Stats
            gridClassName="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5"
            stats={[
              { id: 'block-p50', name: 'Block p50', value: formatMs(rangeValue(blockRows, 'p50')) },
              { id: 'block-p90', name: 'Block p90', value: formatMs(rangeValue(blockRows, 'p90')) },
              { id: 'head-p50', name: 'Head p50', value: formatMs(rangeValue(head.data?.rows ?? [], 'p50')) },
              {
                id: 'attestation-p50',
                name: 'Attestation p50',
                value: formatMs(rangeValue(attestation.data?.rows ?? [], 'p50')),
              },
              {
                id: 'blocks-seen',
                name: 'Blocks seen',
                value: expected > 0 ? `${Math.min(100, (seen / expected) * 100).toFixed(1)}%` : '–',
                subtitle: expected > 0 ? `${seen.toLocaleString()} of ${expected.toLocaleString()} blocks` : undefined,
              },
            ]}
          />

          {!block.data || !network.data || !blockSlots.data ? (
            <>
              <LoadingContainer className="h-28 rounded-sm" />
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <LoadingContainer className="h-96 rounded-sm" />
                <LoadingContainer className="h-96 rounded-sm" />
              </div>
            </>
          ) : (
            <>
              <ActivityStrip block={block.data} blockSlots={blockSlots.data} />
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <div className={attestation.data ? undefined : 'xl:col-span-2'}>
                  <NodeArrivalChart block={block.data} head={head.data} rangeLabel={rangeLabel} behind={behind} />
                </div>
                {attestation.data && (
                  <AttestationArrivalChart history={attestation.data} rangeLabel={rangeLabel} behind={behind} />
                )}
                {hasColumns && (
                  <div className="xl:col-span-2">
                    <ColumnArrivalChart history={dataColumn.data!} rangeLabel={rangeLabel} behind={behind} />
                  </div>
                )}
              </div>
            </>
          )}

          {hasEngine && (
            <EngineSection newPayload={newPayload.data!} getBlobs={getBlobs.data} rangeLabel={rangeLabel} />
          )}
        </Section>

        {(hasCustody || hasRecent) && (
          <Section title={`Last ${NETWORK_WINDOW_SLOTS} slots`}>
            <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-5">
              {hasCustody && (
                <div className="xl:col-span-2">
                  <CustodyGrid columns={custody.data!} />
                </div>
              )}
              {hasRecent && (
                <div className={hasCustody ? 'xl:col-span-3' : 'xl:col-span-5'}>
                  <NodeSlotsTable performance={recent.data!} columns={custody.data} endSlot={recentEndSlot} />
                </div>
              )}
            </div>
          </Section>
        )}
      </div>
    </Container>
  );
}
