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
  VsNetworkChart,
} from './components';
import { DEFAULT_NODE_RANGE, NETWORK_WINDOW_SLOTS, NODE_RANGE_CONFIG, NODE_RANGE_OPTIONS } from './constants';
import { useNetworkObservations } from './hooks/useNetworkObservations';
import { useNodeDataColumns } from './hooks/useNodeDataColumns';
import { useNodeHistory } from './hooks/useNodeHistory';
import { useNodePerformance } from './hooks/useNodePerformance';
import { useNodeRows } from './hooks/useNodeRows';
import { behindStarts, medianByStart, rangeValue } from './utils/history';
import { formatMs, getIngestedEndSlot, getSyncState, shareSlowerThan } from './utils/node-stats';
import { expectedSlots } from './utils/time-buckets';

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
 * One node in depth: identity, arrival history from the last day to all time, rank against every node,
 * data column custody, engine API timings and its most recent slots.
 */
export function DetailPage(): JSX.Element {
  const { nodeId } = useParams({ from: '/xatu/nodes/$nodeId' });
  const search = Route.useSearch();
  const navigate = useNavigate({ from: '/xatu/nodes/$nodeId' });
  const context = Route.useRouteContext();
  useNetworkChangeRedirect(context.redirectOnNetworkChange);

  const range = search.range ?? DEFAULT_NODE_RANGE;
  const rangeLabel = NODE_RANGE_CONFIG[range].label;

  const { rows, isLoading, error } = useNodeRows();
  const row = rows.find(candidate => candidate.nodeId === nodeId);
  const filter = { nodeId };
  const block = useNodeHistory('block', range, filter);
  const head = useNodeHistory('head', range, filter);
  const attestation = useNodeHistory('attestation', range, filter);
  const dataColumn = useNodeHistory('dataColumn', range, filter);
  const network = useNodeHistory('block', range, {});
  // Only ethPandaOps nodes report engine API calls
  const reportsEngine = row?.node.classification === 'internal';
  const newPayload = useNodeHistory('newPayload', range, filter, reportsEngine);
  const getBlobs = useNodeHistory('getBlobs', range, filter, reportsEngine);
  const recent = useNodePerformance(nodeId, NETWORK_WINDOW_SLOTS);
  const recentNetwork = useNetworkObservations();
  const custody = useNodeDataColumns(nodeId);

  if (isLoading) {
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
        <Alert variant="error" title="Error loading node" description={error.message} />
      </Container>
    );
  }

  if (!row) {
    return (
      <Container>
        <Header title={nodeId} />
        <Alert
          variant="info"
          title="Node not found"
          description="No node with this ID reported in the last 24 hours."
        />
        <Link to="/xatu/nodes" className="mt-4 inline-block text-sm text-primary hover:underline">
          All nodes
        </Link>
      </Container>
    );
  }

  const ownP50 = row.observation?.blockP50 ?? null;
  const otherP50s = rows.flatMap(other =>
    other.nodeId === nodeId || other.observation?.blockP50 == null ? [] : [other.observation.blockP50]
  );
  const fasterThan = ownP50 === null ? null : shareSlowerThan(ownP50, otherP50s);

  const blockRows = block.data?.rows ?? [];
  const now = Date.now() / 1000;
  const seen = blockRows.reduce((sum, entry) => sum + entry.count, 0);
  // Count expected slots from the node's first bucket, so a node that joined mid-range isn't marked as missing
  const firstBucket = blockRows.length > 0 ? Math.min(...blockRows.map(entry => entry.start)) : null;
  const expected =
    block.data && firstBucket !== null
      ? block.data.buckets
          .filter(start => start >= firstBucket)
          .reduce((sum, start) => sum + expectedSlots(start, block.data!.granularity, now), 0)
      : 0;

  const latestEngine = newPayload.data?.rows.reduce<(typeof newPayload.data.rows)[number] | null>(
    (latest, entry) => (!latest || entry.start > latest.start ? entry : latest),
    null
  );
  const execution = latestEngine?.client
    ? { implementation: latestEngine.client, version: latestEngine.clientVersion ?? '' }
    : null;
  const hasEngine = !!newPayload.data && newPayload.data.rows.length > 0;
  const hasColumns = !!dataColumn.data && dataColumn.data.rows.length > 0;
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

        <Section
          title="Performance"
          actions={
            <SegmentedControl
              options={NODE_RANGE_OPTIONS}
              value={range}
              onChange={value => navigate({ search: prev => ({ ...prev, range: value }), replace: true })}
              ariaLabel="Time range"
            />
          }
        >
          <Stats
            gridClassName="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6"
            stats={[
              {
                id: 'block-p50',
                name: 'Block p50',
                value: formatMs(rangeValue(blockRows, 'p50')),
                subtitle: rangeLabel,
              },
              {
                id: 'block-p90',
                name: 'Block p90',
                value: formatMs(rangeValue(blockRows, 'p90')),
                subtitle: rangeLabel,
              },
              {
                id: 'head-p50',
                name: 'Head p50',
                value: formatMs(rangeValue(head.data?.rows ?? [], 'p50')),
                subtitle: rangeLabel,
              },
              {
                id: 'attestation-p50',
                name: 'Attestation p50',
                value: formatMs(rangeValue(attestation.data?.rows ?? [], 'p50')),
                subtitle: rangeLabel,
              },
              {
                id: 'blocks-seen',
                name: 'Slots seen',
                value: expected > 0 ? `${Math.min(100, (seen / expected) * 100).toFixed(1)}%` : '–',
                subtitle: expected > 0 ? `${seen.toLocaleString()} of ${expected.toLocaleString()}` : rangeLabel,
              },
              {
                id: 'rank',
                name: 'Faster than',
                value: fasterThan === null ? '–' : `${Math.round(fasterThan * 100)}%`,
                subtitle: 'of nodes, last 24h',
              },
            ]}
          />

          {!block.data || !network.data ? (
            <>
              <LoadingContainer className="h-28 rounded-sm" />
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <LoadingContainer className="h-96 rounded-sm" />
                <LoadingContainer className="h-96 rounded-sm" />
              </div>
            </>
          ) : (
            <>
              <ActivityStrip block={block.data} rangeLabel={rangeLabel} behind={behind} />
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <NodeArrivalChart block={block.data} head={head.data} rangeLabel={rangeLabel} behind={behind} />
                <VsNetworkChart nodeId={nodeId} network={network.data} rangeLabel={rangeLabel} behind={behind} />
                {attestation.data && (
                  <div className="xl:col-span-2">
                    <AttestationArrivalChart history={attestation.data} rangeLabel={rangeLabel} behind={behind} />
                  </div>
                )}
              </div>
            </>
          )}
        </Section>

        {(hasColumns || (custody.data && custody.data.columns.size > 0)) && (
          <Section title="Data columns">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
              {custody.data && custody.data.columns.size > 0 && (
                <div className="xl:col-span-2">
                  <CustodyGrid columns={custody.data} />
                </div>
              )}
              {hasColumns && (
                <div className="xl:col-span-3">
                  <ColumnArrivalChart history={dataColumn.data!} rangeLabel={rangeLabel} behind={behind} />
                </div>
              )}
            </div>
          </Section>
        )}

        {hasEngine && (
          <Section title="Execution">
            <EngineSection newPayload={newPayload.data!} getBlobs={getBlobs.data} rangeLabel={rangeLabel} />
          </Section>
        )}

        {recent.data && recent.data.block.size > 0 && (
          <NodeSlotsTable
            performance={recent.data}
            network={recentNetwork.data}
            columns={custody.data}
            endSlot={recentEndSlot}
          />
        )}
      </div>
    </Container>
  );
}
