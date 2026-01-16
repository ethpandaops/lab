import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ATTESTATION_DEADLINE_MS } from '@/utils';
import { intEngineNewPayloadServiceListOptions } from '@/api/@tanstack/react-query.gen';
import type {
  FctBlockFirstSeenByNode,
  FctHeadFirstSeenByNode,
  FctBlockBlobFirstSeenByNode,
  FctBlockDataColumnSidecarFirstSeenByNode,
  FctAttestationFirstSeenChunked50Ms,
  FctMevBidHighestValueByBuilderChunked50Ms,
} from '@/api/types.gen';
import { SLOT_DURATION_MS, MAX_REASONABLE_SEEN_TIME_MS } from './constants';
import { formatMs, classificationToCategory, filterOutliers } from './utils';
import type { TraceSpan } from './SlotProgressTimeline.types';

interface UseTraceSpansOptions {
  slot: number;
  blockPropagation: FctBlockFirstSeenByNode[];
  headPropagation: FctHeadFirstSeenByNode[];
  blobPropagation: FctBlockBlobFirstSeenByNode[];
  dataColumnPropagation: FctBlockDataColumnSidecarFirstSeenByNode[];
  attestations: FctAttestationFirstSeenChunked50Ms[];
  mevBidding: FctMevBidHighestValueByBuilderChunked50Ms[];
  selectedUsername: string | null;
  excludeOutliers: boolean;
}

interface UseTraceSpansResult {
  spans: TraceSpan[];
  availableUsernames: string[];
  selectedNodeNames: Set<string> | null;
  isLoading: boolean;
}

/**
 * Hook that builds trace spans from slot data.
 * Handles fetching execution data and transforming all data sources into TraceSpan format.
 */
export function useTraceSpans({
  slot,
  blockPropagation,
  headPropagation,
  blobPropagation,
  dataColumnPropagation,
  attestations,
  mevBidding,
  selectedUsername,
  excludeOutliers,
}: UseTraceSpansOptions): UseTraceSpansResult {
  // Fetch raw execution data to get individual node timings (all nodes, not just EIP7870)
  const { data: rawExecutionData, isLoading: executionLoading } = useQuery({
    ...intEngineNewPayloadServiceListOptions({
      query: {
        slot_eq: slot,
        page_size: 10000,
      },
    }),
    enabled: slot > 0,
  });

  const rawExecutionNodes = useMemo(() => rawExecutionData?.int_engine_new_payload ?? [], [rawExecutionData]);

  // Extract unique usernames for filter dropdown
  const availableUsernames = useMemo(() => {
    const usernames = new Set<string>();
    for (const node of blockPropagation) {
      if (node.username) {
        usernames.add(node.username);
      }
    }
    return Array.from(usernames).sort();
  }, [blockPropagation]);

  // Get node names for the selected username (for filtering execution/DA data)
  const selectedNodeNames = useMemo(() => {
    if (!selectedUsername) return null;
    const names = new Set<string>();
    for (const node of blockPropagation) {
      if (node.username === selectedUsername && node.meta_client_name) {
        names.add(node.meta_client_name);
      }
    }
    return names;
  }, [selectedUsername, blockPropagation]);

  // Build trace spans from slot data
  const spans = useMemo(() => {
    const result: TraceSpan[] = [];

    // Root span: Slot (full 12s duration)
    result.push({
      id: 'slot',
      label: 'Slot',
      startMs: 0,
      endMs: SLOT_DURATION_MS,
      category: 'slot',
      depth: 0,
      details: 'Full slot duration (12 seconds)',
    });

    // Calculate when block was first seen (for MEV bidding end time)
    let blockFirstSeenMs: number | null = null;
    if (blockPropagation.length > 0) {
      const validTimes = blockPropagation
        .map(node => node.seen_slot_start_diff ?? Infinity)
        .filter(v => v !== Infinity && v >= 0 && v <= MAX_REASONABLE_SEEN_TIME_MS);

      if (validTimes.length > 0) {
        blockFirstSeenMs = Math.min(...validTimes);
      }
    }

    // MEV Builders
    buildMevSpans(result, mevBidding, blockFirstSeenMs);

    // Aggregate all node data into per-node timelines
    const nodeTimelines = aggregateNodeTimelines(
      blockPropagation,
      headPropagation,
      rawExecutionNodes,
      dataColumnPropagation,
      blobPropagation,
      selectedUsername
    );

    // Block Proposal (unified per-node view)
    buildBlockProposalSpans(result, nodeTimelines, excludeOutliers, selectedUsername);

    // Attestations
    buildAttestationSpans(result, attestations);

    return result;
  }, [
    blockPropagation,
    headPropagation,
    blobPropagation,
    dataColumnPropagation,
    attestations,
    mevBidding,
    rawExecutionNodes,
    selectedUsername,
    excludeOutliers,
  ]);

  return {
    spans,
    availableUsernames,
    selectedNodeNames,
    isLoading: executionLoading,
  };
}

// Helper functions for building specific span types

function buildMevSpans(
  result: TraceSpan[],
  mevBidding: FctMevBidHighestValueByBuilderChunked50Ms[],
  blockFirstSeenMs: number | null
): void {
  if (mevBidding.length === 0) return;

  const validBids = mevBidding.filter(
    bid => bid.chunk_slot_start_diff !== undefined && bid.chunk_slot_start_diff !== null
  );

  if (validBids.length === 0) return;

  const sortedBids = [...validBids].sort((a, b) => (a.chunk_slot_start_diff ?? 0) - (b.chunk_slot_start_diff ?? 0));

  const firstBidTime = sortedBids[0].chunk_slot_start_diff ?? 0;
  const lastBidTime = sortedBids[sortedBids.length - 1].chunk_slot_start_diff ?? 0;
  const mevEndTime = blockFirstSeenMs !== null ? blockFirstSeenMs : lastBidTime + 50;

  const bidsByBuilder = new Map<string, { count: number; firstTime: number; lastTime: number; maxValue: string }>();
  for (const bid of validBids) {
    const builderKey = bid.builder_pubkey ?? 'Unknown';
    const existing = bidsByBuilder.get(builderKey);
    const bidTime = bid.chunk_slot_start_diff ?? 0;
    const bidValue = bid.value ?? '0';

    if (existing) {
      existing.count++;
      existing.firstTime = Math.min(existing.firstTime, bidTime);
      existing.lastTime = Math.max(existing.lastTime, bidTime);
      if (BigInt(bidValue) > BigInt(existing.maxValue)) {
        existing.maxValue = bidValue;
      }
    } else {
      bidsByBuilder.set(builderKey, {
        count: 1,
        firstTime: bidTime,
        lastTime: bidTime,
        maxValue: bidValue,
      });
    }
  }

  result.push({
    id: 'mev-builders',
    label: 'MEV Builders',
    startMs: Math.min(firstBidTime, 0),
    endMs: mevEndTime,
    category: 'mev',
    depth: 1,
    details: `${validBids.length} bids from ${bidsByBuilder.size} builder${bidsByBuilder.size !== 1 ? 's' : ''} (${formatMs(firstBidTime)} to ${formatMs(lastBidTime)})`,
    isLate: false,
    collapsible: bidsByBuilder.size > 1,
    defaultCollapsed: true,
  });

  if (bidsByBuilder.size > 1) {
    for (const [pubkey, data] of bidsByBuilder) {
      const shortPubkey = pubkey.length > 12 ? `${pubkey.slice(0, 8)}...${pubkey.slice(-4)}` : pubkey;

      result.push({
        id: `mev-builder-${pubkey}`,
        label: shortPubkey,
        startMs: Math.min(data.firstTime, 0),
        endMs: data.lastTime + 50,
        category: 'mev-builder',
        depth: 2,
        details: `Builder ${shortPubkey}: ${data.count} bid${data.count !== 1 ? 's' : ''} from ${formatMs(data.firstTime)} to ${formatMs(data.lastTime)}`,
        parentId: 'mev-builders',
      });
    }
  }
}

/**
 * Aggregated timeline data for a single node.
 * Combines data from block propagation, execution, head update, and data availability.
 */
interface NodeTimeline {
  nodeName: string;
  username: string;
  country: string;
  city: string;
  nodeId: string;
  classification: string;
  consensusClient: string;
  consensusVersion: string;
  /** When block gossip was first received (ms from slot start) */
  blockReceivedMs: number;
  /** When chain head was updated after import (ms from slot start) */
  headUpdatedMs: number | null;
  /** Execution data if available (EIP7870 nodes) */
  execution: {
    client: string;
    version: string;
    methodVersion: string;
    startMs: number;
    endMs: number;
    durationMs: number;
  } | null;
  /** Data availability completion time (ms from slot start) */
  daCompleteMs: number | null;
  /** Individual column/blob timing data (column index -> first seen time) */
  daColumns: Map<number, number>;
  /** Whether using data columns (true) or blobs (false) */
  isDataColumns: boolean;
}

/**
 * Aggregates all data sources into per-node timelines.
 */
function aggregateNodeTimelines(
  blockPropagation: FctBlockFirstSeenByNode[],
  headPropagation: FctHeadFirstSeenByNode[],
  executionNodes: Array<{
    status?: string;
    duration_ms?: number;
    meta_client_name?: string;
    meta_execution_implementation?: string;
    meta_execution_version?: string;
    method_version?: string;
    meta_client_geo_country?: string;
    meta_client_geo_city?: string;
    meta_client_implementation?: string;
    meta_client_version?: string;
    requested_date_time?: number;
    slot_start_date_time?: number;
  }>,
  dataColumnPropagation: FctBlockDataColumnSidecarFirstSeenByNode[],
  blobPropagation: FctBlockBlobFirstSeenByNode[],
  selectedUsername: string | null
): NodeTimeline[] {
  const timelines = new Map<string, NodeTimeline>();

  // First pass: Build base timeline from block propagation data
  for (const node of blockPropagation) {
    const nodeName = node.meta_client_name;
    const seenTime = node.seen_slot_start_diff;

    if (!nodeName) continue;
    if (seenTime === undefined || seenTime === null || seenTime < 0 || seenTime > MAX_REASONABLE_SEEN_TIME_MS) continue;
    if (selectedUsername && node.username !== selectedUsername) continue;

    timelines.set(nodeName, {
      nodeName,
      username: node.username || nodeName,
      country: node.meta_client_geo_country || 'Unknown',
      city: (node as { meta_client_geo_city?: string }).meta_client_geo_city || '',
      nodeId: node.node_id || '',
      classification: node.classification || 'unclassified',
      consensusClient: node.meta_consensus_implementation || 'unknown',
      consensusVersion: (node as { meta_client_version?: string }).meta_client_version || '',
      blockReceivedMs: seenTime,
      headUpdatedMs: null,
      execution: null,
      daCompleteMs: null,
      daColumns: new Map(),
      isDataColumns: dataColumnPropagation.length > 0,
    });
  }

  // Second pass: Add head update times
  for (const node of headPropagation) {
    const nodeName = node.meta_client_name;
    const seenTime = node.seen_slot_start_diff;

    if (!nodeName) continue;
    if (seenTime === undefined || seenTime === null || seenTime < 0 || seenTime > MAX_REASONABLE_SEEN_TIME_MS) continue;

    const timeline = timelines.get(nodeName);
    if (timeline) {
      timeline.headUpdatedMs = seenTime;
    }
  }

  // Third pass: Add execution data (for all nodes, not just those with block propagation)
  for (const node of executionNodes) {
    if (node.status?.toUpperCase() !== 'VALID') continue;
    if (!node.duration_ms || node.duration_ms <= 0) continue;

    const nodeName = node.meta_client_name ?? 'unknown';
    if (!nodeName || nodeName === 'unknown') continue;

    // Calculate execution timing from execution data's own timestamps
    // Note: requested_date_time is in microseconds, slot_start_date_time is in seconds
    let startMs: number;
    if (node.requested_date_time && node.slot_start_date_time) {
      const requestedMs = node.requested_date_time / 1000; // microseconds -> milliseconds
      const slotStartMs = node.slot_start_date_time * 1000; // seconds -> milliseconds
      startMs = requestedMs - slotStartMs;
    } else {
      // Fallback: use block received time if available
      const existingTimeline = timelines.get(nodeName);
      if (existingTimeline) {
        startMs = existingTimeline.blockReceivedMs;
      } else {
        // Can't position execution without timing data
        continue;
      }
    }

    // Skip unreasonable values
    if (startMs < 0 || startMs > MAX_REASONABLE_SEEN_TIME_MS) continue;

    const endMs = startMs + node.duration_ms;
    let timeline = timelines.get(nodeName);

    // Create new timeline for execution-only nodes (not in block propagation)
    if (!timeline) {
      // Skip if filtering by username and this node doesn't have username data
      // (execution-only nodes can't be filtered by username since they don't have that field)
      if (selectedUsername) continue;

      timeline = {
        nodeName,
        username: nodeName, // Use node name as username for execution-only nodes
        country: node.meta_client_geo_country || 'Unknown',
        city: node.meta_client_geo_city || '',
        nodeId: '',
        classification: 'unclassified',
        consensusClient: node.meta_client_implementation || 'unknown',
        consensusVersion: node.meta_client_version || '',
        blockReceivedMs: startMs, // Use execution start as proxy for block received
        headUpdatedMs: null,
        execution: null,
        daCompleteMs: null,
        daColumns: new Map(),
        isDataColumns: dataColumnPropagation.length > 0,
      };
      timelines.set(nodeName, timeline);
    }

    timeline.execution = {
      client: node.meta_execution_implementation ?? 'Unknown',
      version: node.meta_execution_version ?? '',
      methodVersion: node.method_version ?? '',
      startMs,
      endMs,
      durationMs: node.duration_ms,
    };
  }

  // Fourth pass: Add data availability completion times
  // Track unique column/blob indices per node to get accurate counts
  const daData = dataColumnPropagation.length > 0 ? dataColumnPropagation : blobPropagation;
  const daByNode = new Map<string, { columns: Map<number, number>; lastSeenMs: number }>();

  for (const item of daData) {
    const nodeName = item.meta_client_name;
    const seenTime = item.seen_slot_start_diff;
    // Extract column index (for data columns) or blob index (for blobs)
    const columnIndex =
      'column_index' in item ? (item.column_index ?? 0) : 'blob_index' in item ? (item.blob_index ?? 0) : 0;

    if (!nodeName) continue;
    if (seenTime === undefined || seenTime === null || seenTime < 0 || seenTime > MAX_REASONABLE_SEEN_TIME_MS) continue;

    const existing = daByNode.get(nodeName);
    if (existing) {
      // Keep the earliest time for each column
      const existingColTime = existing.columns.get(columnIndex);
      if (existingColTime === undefined || seenTime < existingColTime) {
        existing.columns.set(columnIndex, seenTime);
      }
      existing.lastSeenMs = Math.max(existing.lastSeenMs, seenTime);
    } else {
      const columns = new Map<number, number>();
      columns.set(columnIndex, seenTime);
      daByNode.set(nodeName, { columns, lastSeenMs: seenTime });
    }
  }

  for (const [nodeName, daInfo] of daByNode) {
    const timeline = timelines.get(nodeName);
    if (timeline) {
      timeline.daCompleteMs = daInfo.lastSeenMs;
      timeline.daColumns = daInfo.columns; // Store the full column map for child spans
    }
  }

  return Array.from(timelines.values());
}

/**
 * Builds the "Block Proposal" section with per-node integrated timelines.
 * Structure:
 * - Block Proposal (parent)
 *   - [Country] (collapsible)
 *     - [node-name] (collapsible, shows earliest → latest)
 *       - Block Received @Xms (point-in-time)
 *       - Execution (client) Yms (duration span if available)
 *       - Head Updated @Zms (point-in-time)
 *       - DA Complete @Wms (point-in-time if available)
 */
function buildBlockProposalSpans(
  result: TraceSpan[],
  nodeTimelines: NodeTimeline[],
  excludeOutliers: boolean,
  selectedUsername: string | null
): void {
  if (nodeTimelines.length === 0) return;

  // Calculate overall timing bounds
  const allStartTimes = nodeTimelines.map(n => n.blockReceivedMs);
  const allEndTimes = nodeTimelines.map(n => {
    // Find the latest event for each node
    const times = [n.blockReceivedMs];
    if (n.headUpdatedMs !== null) times.push(n.headUpdatedMs);
    if (n.execution) times.push(n.execution.endMs);
    if (n.daCompleteMs !== null) times.push(n.daCompleteMs);
    return Math.max(...times);
  });

  const firstSeenMs = Math.min(...allStartTimes);
  let lastEventMs = Math.max(...allEndTimes);

  // Apply outlier filtering for parent span
  if (excludeOutliers && allEndTimes.length >= 4) {
    const filteredEndTimes = filterOutliers(allEndTimes);
    if (filteredEndTimes.length > 0) {
      lastEventMs = Math.max(...filteredEndTimes);
    }
  }

  // Group by country
  const byCountry = new Map<string, NodeTimeline[]>();
  for (const timeline of nodeTimelines) {
    const existing = byCountry.get(timeline.country) || [];
    existing.push(timeline);
    byCountry.set(timeline.country, existing);
  }

  // Sort countries by first seen time
  const sortedCountries = Array.from(byCountry.entries()).sort((a, b) => {
    const aFirst = Math.min(...a[1].map(n => n.blockReceivedMs));
    const bFirst = Math.min(...b[1].map(n => n.blockReceivedMs));
    return aFirst - bFirst;
  });

  // Parent span: Block Proposal
  result.push({
    id: 'block-proposal',
    label: 'Block Proposal',
    startMs: firstSeenMs,
    endMs: lastEventMs,
    category: 'propagation',
    depth: 1,
    details: selectedUsername
      ? `${selectedUsername}: ${nodeTimelines.length} node${nodeTimelines.length !== 1 ? 's' : ''} processed block`
      : `Block proposal lifecycle across ${nodeTimelines.length} nodes in ${sortedCountries.length} countries`,
    isLate: lastEventMs > ATTESTATION_DEADLINE_MS,
    collapsible: sortedCountries.length > 0,
    defaultCollapsed: false,
  });

  // Build country → node → events hierarchy
  for (const [country, countryNodes] of sortedCountries) {
    const countryId = `country-${country}`;

    // Sort nodes by first seen
    const sortedNodes = [...countryNodes].sort((a, b) => a.blockReceivedMs - b.blockReceivedMs);

    // Calculate country span bounds
    const countryFirstSeen = Math.min(...sortedNodes.map(n => n.blockReceivedMs));
    const countryEndTimes = sortedNodes.map(n => {
      const times = [n.blockReceivedMs];
      if (n.headUpdatedMs !== null) times.push(n.headUpdatedMs);
      if (n.execution) times.push(n.execution.endMs);
      if (n.daCompleteMs !== null) times.push(n.daCompleteMs);
      return Math.max(...times);
    });

    let countryLastEvent = Math.max(...countryEndTimes);
    if (excludeOutliers && countryEndTimes.length >= 4) {
      const filteredTimes = filterOutliers(countryEndTimes);
      if (filteredTimes.length > 0) {
        countryLastEvent = Math.max(...filteredTimes);
      }
    }

    // Country span
    result.push({
      id: countryId,
      label: country,
      startMs: countryFirstSeen,
      endMs: countryLastEvent,
      category: 'country',
      depth: 2,
      details: `${country}: ${sortedNodes.length} node${sortedNodes.length !== 1 ? 's' : ''}`,
      isLate: countryLastEvent > ATTESTATION_DEADLINE_MS,
      parentId: 'block-proposal',
      nodeCount: sortedNodes.length,
      collapsible: true,
      defaultCollapsed: true,
    });

    // Node spans within country
    for (const timeline of sortedNodes) {
      const nodeId = `node-${country}-${timeline.nodeName}`;

      // Calculate node span bounds (from first to last event)
      const nodeEvents: number[] = [timeline.blockReceivedMs];
      if (timeline.headUpdatedMs !== null) nodeEvents.push(timeline.headUpdatedMs);
      if (timeline.execution) nodeEvents.push(timeline.execution.endMs);
      if (timeline.daCompleteMs !== null) nodeEvents.push(timeline.daCompleteMs);

      const nodeStartMs = Math.min(...nodeEvents);
      const nodeEndMs = Math.max(...nodeEvents);

      // Count how many child events this node has
      let eventCount = 1; // Block Received is always shown
      if (timeline.headUpdatedMs !== null) eventCount++;
      if (timeline.execution) eventCount++;
      if (timeline.daCompleteMs !== null) eventCount++;

      // Node span (shows full timeline)
      result.push({
        id: nodeId,
        label: timeline.username,
        startMs: nodeStartMs,
        endMs: nodeEndMs,
        category: classificationToCategory(timeline.classification),
        depth: 3,
        details: `${timeline.username}: ${formatMs(nodeStartMs)} → ${formatMs(nodeEndMs)}`,
        isLate: nodeEndMs > ATTESTATION_DEADLINE_MS,
        parentId: countryId,
        clientName: timeline.consensusClient,
        clientVersion: timeline.consensusVersion,
        nodeId: timeline.nodeId,
        username: timeline.username,
        nodeName: timeline.nodeName,
        country: timeline.country,
        city: timeline.city,
        classification: timeline.classification,
        collapsible: eventCount > 1,
        defaultCollapsed: true,
        // Include execution info if available
        executionClient: timeline.execution?.client,
        executionVersion: timeline.execution?.version,
        methodVersion: timeline.execution?.methodVersion,
        executionDurationMs: timeline.execution?.durationMs,
      });

      // Child spans: Individual events for this node

      // 1. Block Received (point-in-time)
      result.push({
        id: `${nodeId}-block-received`,
        label: 'Block Received',
        startMs: timeline.blockReceivedMs,
        endMs: timeline.blockReceivedMs + 30,
        category: 'individual',
        depth: 4,
        details: `Block gossip received at ${formatMs(timeline.blockReceivedMs)}`,
        isLate: timeline.blockReceivedMs > ATTESTATION_DEADLINE_MS,
        isPointInTime: true,
        parentId: nodeId,
      });

      // 2. Execution (duration span, if available)
      if (timeline.execution) {
        result.push({
          id: `${nodeId}-execution`,
          label: `Execution (${timeline.execution.client})`,
          startMs: timeline.execution.startMs,
          endMs: timeline.execution.endMs,
          category: 'execution-node',
          depth: 4,
          details: `newPayload executed in ${formatMs(timeline.execution.durationMs)} by ${timeline.execution.client}`,
          isLate: timeline.execution.endMs > ATTESTATION_DEADLINE_MS,
          parentId: nodeId,
          // Don't set clientName for execution spans - it's only for CL client
          executionClient: timeline.execution.client,
          executionVersion: timeline.execution.version,
          methodVersion: timeline.execution.methodVersion,
          executionDurationMs: timeline.execution.durationMs,
        });
      }

      // 3. Head Updated (point-in-time, if available)
      if (timeline.headUpdatedMs !== null) {
        result.push({
          id: `${nodeId}-head-updated`,
          label: 'Head Updated',
          startMs: timeline.headUpdatedMs,
          endMs: timeline.headUpdatedMs + 30,
          category: 'internal',
          depth: 4,
          details: `Chain head updated at ${formatMs(timeline.headUpdatedMs)}`,
          isLate: timeline.headUpdatedMs > ATTESTATION_DEADLINE_MS,
          isPointInTime: true,
          parentId: nodeId,
        });
      }

      // 4. Data availability (collapsible with individual columns as children)
      if (timeline.daCompleteMs !== null && timeline.daColumns.size > 0) {
        const daSpanId = `${nodeId}-da-complete`;
        const columnCount = timeline.daColumns.size;

        // Calculate DA start time (first column received)
        const columnTimes = Array.from(timeline.daColumns.values());
        const daStartMs = Math.min(...columnTimes);

        result.push({
          id: daSpanId,
          label: `Data availability (${columnCount})`,
          startMs: daStartMs,
          endMs: timeline.daCompleteMs,
          category: 'column',
          depth: 4,
          details: `${timeline.isDataColumns ? 'Data columns' : 'Blobs'}: ${formatMs(daStartMs)} → ${formatMs(timeline.daCompleteMs)} (${columnCount} ${timeline.isDataColumns ? 'columns' : 'blobs'})`,
          isLate: timeline.daCompleteMs > ATTESTATION_DEADLINE_MS,
          parentId: nodeId,
          collapsible: columnCount > 1,
          defaultCollapsed: true,
          nodeCount: columnCount,
        });

        // Add child spans for each individual column/blob (only if multiple)
        if (columnCount > 1) {
          const sortedColumns = Array.from(timeline.daColumns.entries()).sort((a, b) => a[1] - b[1]);
          for (const [colIndex, colTime] of sortedColumns) {
            result.push({
              id: `${daSpanId}-col-${colIndex}`,
              label: `${timeline.isDataColumns ? 'Column' : 'Blob'} ${colIndex}`,
              startMs: colTime,
              endMs: colTime + 30,
              category: 'column',
              depth: 5,
              details: `${timeline.isDataColumns ? 'Column' : 'Blob'} ${colIndex} seen at ${formatMs(colTime)}`,
              isLate: colTime > ATTESTATION_DEADLINE_MS,
              isPointInTime: true,
              parentId: daSpanId,
            });
          }
        }
      }
    }
  }
}

function buildAttestationSpans(result: TraceSpan[], attestations: FctAttestationFirstSeenChunked50Ms[]): void {
  if (attestations.length === 0) return;

  const sortedAttestations = [...attestations].sort(
    (a, b) => (a.chunk_slot_start_diff ?? Infinity) - (b.chunk_slot_start_diff ?? Infinity)
  );
  const firstAttestation = sortedAttestations.find(a => (a.attestation_count ?? 0) > 0);
  const lastAttestation = sortedAttestations.filter(a => (a.attestation_count ?? 0) > 0).pop();

  if (firstAttestation && firstAttestation.chunk_slot_start_diff !== undefined) {
    const firstAttTime = firstAttestation.chunk_slot_start_diff;
    const lastAttTime = lastAttestation?.chunk_slot_start_diff ?? firstAttTime;
    const totalAttestations = sortedAttestations.reduce((sum, a) => sum + (a.attestation_count ?? 0), 0);

    result.push({
      id: 'attestations',
      label: 'Attestations (network)',
      startMs: firstAttTime,
      endMs: Math.max(lastAttTime + 50, firstAttTime + 100),
      category: 'attestation',
      depth: 1,
      details: `${totalAttestations.toLocaleString()} attestations observed across all nodes (${formatMs(firstAttTime)} → ${formatMs(lastAttTime)})`,
      isLate: firstAttTime > ATTESTATION_DEADLINE_MS + 1000,
    });
  }
}
