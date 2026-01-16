import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ATTESTATION_DEADLINE_MS } from '@/utils';
import { intEngineNewPayloadServiceListOptions } from '@/api/@tanstack/react-query.gen';
import { extractClusterFromNodeName } from '@/constants/eip7870';
import type {
  FctBlockFirstSeenByNode,
  FctBlockBlobFirstSeenByNode,
  FctBlockDataColumnSidecarFirstSeenByNode,
  FctAttestationFirstSeenChunked50Ms,
  FctMevBidHighestValueByBuilderChunked50Ms,
} from '@/api/types.gen';
import { SLOT_DURATION_MS, MAX_REASONABLE_SEEN_TIME_MS } from './constants';
import { formatMs, classificationToCategory, getShortNodeId, filterOutliers } from './utils';
import type { TraceSpan } from './SlotProgressTimeline.types';

interface UseTraceSpansOptions {
  slot: number;
  blockPropagation: FctBlockFirstSeenByNode[];
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
  blobPropagation,
  dataColumnPropagation,
  attestations,
  mevBidding,
  selectedUsername,
  excludeOutliers,
}: UseTraceSpansOptions): UseTraceSpansResult {
  // Fetch raw execution data to get individual node timings
  const { data: rawExecutionData, isLoading: executionLoading } = useQuery({
    ...intEngineNewPayloadServiceListOptions({
      query: {
        slot_eq: slot,
        node_class_eq: 'eip7870-block-builder',
        page_size: 100,
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

    // Block arrival timing - calculate first
    let blockFirstSeenMs: number | null = null;
    let blockLastSeenMs: number | null = null;
    let blockLastSeenMsForParent: number | null = null;

    if (blockPropagation.length > 0) {
      const validTimes = blockPropagation
        .map(node => node.seen_slot_start_diff ?? Infinity)
        .filter(v => v !== Infinity && v >= 0 && v <= MAX_REASONABLE_SEEN_TIME_MS);

      if (validTimes.length > 0) {
        blockFirstSeenMs = Math.min(...validTimes);
        blockLastSeenMs = Math.max(...validTimes);

        if (excludeOutliers) {
          const filteredTimes = filterOutliers(validTimes);
          blockLastSeenMsForParent = filteredTimes.length > 0 ? Math.max(...filteredTimes) : blockLastSeenMs;
        } else {
          blockLastSeenMsForParent = blockLastSeenMs;
        }
      }
    }

    // MEV Builders
    buildMevSpans(result, mevBidding, blockFirstSeenMs);

    // Calculate execution data
    const { executionClientData, maxExecutionEnd } = calculateExecutionData(
      rawExecutionNodes,
      blockFirstSeenMs,
      blockPropagation,
      selectedNodeNames
    );

    // Create geo lookup map
    const nodeGeoMap = buildNodeGeoMap(blockPropagation);

    // Block Propagation
    buildPropagationSpans(
      result,
      blockPropagation,
      selectedUsername,
      blockFirstSeenMs,
      blockLastSeenMs,
      blockLastSeenMsForParent,
      excludeOutliers
    );

    // EIP7870 Execution
    buildExecutionSpans(result, executionClientData, maxExecutionEnd, selectedUsername, nodeGeoMap, excludeOutliers);

    // Data availability
    buildDataAvailabilitySpans(
      result,
      dataColumnPropagation,
      blobPropagation,
      selectedUsername,
      selectedNodeNames,
      nodeGeoMap,
      excludeOutliers
    );

    // Attestations
    buildAttestationSpans(result, attestations);

    return result;
  }, [
    blockPropagation,
    blobPropagation,
    dataColumnPropagation,
    attestations,
    mevBidding,
    rawExecutionNodes,
    selectedUsername,
    selectedNodeNames,
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

interface ExecutionNodeData {
  nodeName: string;
  cluster: string;
  startMs: number;
  endMs: number;
  duration: number;
  status: string;
}

interface ExecutionClientData {
  impl: string;
  nodes: ExecutionNodeData[];
  minStart: number;
  maxEnd: number;
}

function calculateExecutionData(
  rawExecutionNodes: Array<{
    status?: string;
    duration_ms?: number;
    meta_client_name?: string;
    meta_execution_implementation?: string;
  }>,
  blockFirstSeenMs: number | null,
  blockPropagation: FctBlockFirstSeenByNode[],
  selectedNodeNames: Set<string> | null
): { executionClientData: ExecutionClientData[]; maxExecutionEnd: number } {
  let maxExecutionEnd = blockFirstSeenMs ?? 0;
  const executionClientData: ExecutionClientData[] = [];

  if (rawExecutionNodes.length === 0 || blockFirstSeenMs === null) {
    return { executionClientData, maxExecutionEnd };
  }

  const nodeSeenTimeMap = new Map<string, number>();
  for (const propNode of blockPropagation) {
    const nodeName = propNode.meta_client_name;
    const seenTime = propNode.seen_slot_start_diff;
    if (
      nodeName &&
      seenTime !== undefined &&
      seenTime !== null &&
      seenTime >= 0 &&
      seenTime <= MAX_REASONABLE_SEEN_TIME_MS
    ) {
      nodeSeenTimeMap.set(nodeName, seenTime);
    }
  }

  const clientsByImpl = new Map<string, ExecutionNodeData[]>();

  for (const node of rawExecutionNodes) {
    if (node.status?.toUpperCase() !== 'VALID') continue;
    if (!node.duration_ms || node.duration_ms <= 0) continue;

    const nodeName = node.meta_client_name ?? 'unknown';

    if (selectedNodeNames && !selectedNodeNames.has(nodeName)) continue;

    const nodeBlockSeenMs = nodeSeenTimeMap.get(nodeName) ?? blockFirstSeenMs;
    const nodeStartMs = nodeBlockSeenMs;
    const nodeEndMs = nodeStartMs + node.duration_ms;

    const impl = node.meta_execution_implementation ?? 'Unknown';
    const cluster = extractClusterFromNodeName(nodeName) ?? 'other';

    if (!clientsByImpl.has(impl)) {
      clientsByImpl.set(impl, []);
    }
    clientsByImpl.get(impl)!.push({
      nodeName,
      cluster,
      startMs: nodeStartMs,
      endMs: nodeEndMs,
      duration: node.duration_ms,
      status: node.status ?? 'UNKNOWN',
    });
  }

  if (clientsByImpl.size > 0) {
    for (const [impl, nodes] of clientsByImpl) {
      let clientMinStart = Infinity;
      let clientMaxEnd = 0;

      for (const node of nodes) {
        clientMinStart = Math.min(clientMinStart, node.startMs);
        clientMaxEnd = Math.max(clientMaxEnd, node.endMs);
      }

      executionClientData.push({
        impl,
        nodes,
        minStart: clientMinStart,
        maxEnd: clientMaxEnd,
      });
      maxExecutionEnd = Math.max(maxExecutionEnd, clientMaxEnd);
    }
  }

  return { executionClientData, maxExecutionEnd };
}

function buildNodeGeoMap(
  blockPropagation: FctBlockFirstSeenByNode[]
): Map<string, { country: string; city: string; clientImpl: string; clientVersion: string }> {
  const nodeGeoMap = new Map<string, { country: string; city: string; clientImpl: string; clientVersion: string }>();
  for (const node of blockPropagation) {
    if (node.meta_client_name) {
      nodeGeoMap.set(node.meta_client_name, {
        country: node.meta_client_geo_country || 'Unknown',
        city: (node as { meta_client_geo_city?: string }).meta_client_geo_city || '',
        clientImpl: node.meta_consensus_implementation || 'unknown',
        clientVersion: (node as { meta_client_version?: string }).meta_client_version || '',
      });
    }
  }
  return nodeGeoMap;
}

interface NodeData {
  name: string;
  username: string;
  seenTime: number;
  classification: string;
  clientImpl: string;
  clientVersion: string;
  nodeId: string;
  country: string;
  city: string;
}

function buildPropagationSpans(
  result: TraceSpan[],
  blockPropagation: FctBlockFirstSeenByNode[],
  selectedUsername: string | null,
  blockFirstSeenMs: number | null,
  blockLastSeenMs: number | null,
  blockLastSeenMsForParent: number | null,
  excludeOutliers: boolean
): void {
  if (blockFirstSeenMs === null || blockLastSeenMs === null) return;

  const filteredPropagation = selectedUsername
    ? blockPropagation.filter(node => node.username === selectedUsername)
    : blockPropagation;

  const allNodes: NodeData[] = [];
  let filteredFirstSeen = Infinity;
  let filteredLastSeen = 0;

  for (const node of filteredPropagation) {
    const seenTime = node.seen_slot_start_diff;
    if (seenTime === undefined || seenTime === null || seenTime < 0 || seenTime > MAX_REASONABLE_SEEN_TIME_MS) continue;

    filteredFirstSeen = Math.min(filteredFirstSeen, seenTime);
    filteredLastSeen = Math.max(filteredLastSeen, seenTime);

    const country = node.meta_client_geo_country || 'Unknown';
    const city = (node as { meta_client_geo_city?: string }).meta_client_geo_city || '';
    const nodeName = node.meta_client_name || 'unknown';
    const username = node.username || nodeName;
    const classification = node.classification || 'unclassified';
    const clientImpl = node.meta_consensus_implementation || 'unknown';
    const clientVersion = (node as { meta_client_version?: string }).meta_client_version || '';
    const nodeId = node.node_id || '';

    allNodes.push({
      name: nodeName,
      username,
      seenTime,
      classification,
      clientImpl,
      clientVersion,
      nodeId,
      country,
      city,
    });
  }

  const propagationStart = selectedUsername && filteredFirstSeen !== Infinity ? filteredFirstSeen : blockFirstSeenMs;

  let propagationEndForParent: number;
  if (selectedUsername && filteredLastSeen > 0) {
    if (excludeOutliers) {
      const filteredTimes = filterOutliers(allNodes.map(n => n.seenTime));
      propagationEndForParent = filteredTimes.length > 0 ? Math.max(...filteredTimes) : filteredLastSeen;
    } else {
      propagationEndForParent = filteredLastSeen;
    }
  } else {
    propagationEndForParent = blockLastSeenMsForParent ?? blockLastSeenMs;
  }
  const propagationEnd = propagationEndForParent;

  if (selectedUsername && allNodes.length > 0) {
    // Simplified per-node view when filtering by contributor
    result.push({
      id: 'propagation',
      label: 'Block Propagation',
      startMs: propagationStart,
      endMs: propagationEnd,
      category: 'propagation',
      depth: 1,
      details: `${selectedUsername}: ${allNodes.length} node${allNodes.length !== 1 ? 's' : ''} saw block`,
      isLate: propagationEnd > ATTESTATION_DEADLINE_MS,
      collapsible: allNodes.length > 0,
      defaultCollapsed: false,
    });

    const sortedNodes = [...allNodes].sort((a, b) => a.seenTime - b.seenTime);
    for (const nodeData of sortedNodes) {
      const shortId = getShortNodeId(nodeData.name);
      const location = nodeData.city || nodeData.country;
      result.push({
        id: `prop-node-${nodeData.name}`,
        label: `${location} (${shortId})`,
        startMs: nodeData.seenTime,
        endMs: nodeData.seenTime + 30,
        category: 'country',
        depth: 2,
        isLate: nodeData.seenTime > ATTESTATION_DEADLINE_MS,
        isPointInTime: true,
        parentId: 'propagation',
        clientName: nodeData.clientImpl,
        clientVersion: nodeData.clientVersion,
        nodeId: nodeData.nodeId,
        username: nodeData.username,
        nodeName: nodeData.name,
        country: nodeData.country,
        city: nodeData.city,
        classification: nodeData.classification,
      });
    }
  } else if (allNodes.length > 0) {
    // Default hierarchical view: Country → Node
    type CountryData = {
      firstSeen: number;
      lastSeen: number;
      nodeCount: number;
      allTimes: number[];
      nodes: NodeData[];
    };

    const propagationByCountry = new Map<string, CountryData>();

    for (const nodeData of allNodes) {
      let countryEntry = propagationByCountry.get(nodeData.country);
      if (!countryEntry) {
        countryEntry = {
          firstSeen: nodeData.seenTime,
          lastSeen: nodeData.seenTime,
          nodeCount: 0,
          allTimes: [],
          nodes: [],
        };
        propagationByCountry.set(nodeData.country, countryEntry);
      }

      countryEntry.firstSeen = Math.min(countryEntry.firstSeen, nodeData.seenTime);
      countryEntry.lastSeen = Math.max(countryEntry.lastSeen, nodeData.seenTime);
      countryEntry.allTimes.push(nodeData.seenTime);
      countryEntry.nodeCount++;
      countryEntry.nodes.push(nodeData);
    }

    const sortedCountries = Array.from(propagationByCountry.entries()).sort((a, b) => a[1].firstSeen - b[1].firstSeen);

    result.push({
      id: 'propagation',
      label: 'Block Propagation',
      startMs: propagationStart,
      endMs: propagationEnd,
      category: 'propagation',
      depth: 1,
      details: `Block propagated to ${allNodes.length} nodes in ${propagationByCountry.size} countries`,
      isLate: propagationEnd > ATTESTATION_DEADLINE_MS,
      collapsible: sortedCountries.length >= 1,
      defaultCollapsed: false,
    });

    for (const [country, countryData] of sortedCountries) {
      const countryId = `country-${country}`;

      let countryEndMs: number;
      if (countryData.nodeCount > 1) {
        if (excludeOutliers) {
          const filteredTimes = filterOutliers(countryData.allTimes);
          countryEndMs = filteredTimes.length > 0 ? Math.max(...filteredTimes) : countryData.lastSeen;
        } else {
          countryEndMs = countryData.lastSeen;
        }
      } else {
        countryEndMs = countryData.firstSeen + 50;
      }

      result.push({
        id: countryId,
        label: country,
        startMs: countryData.firstSeen,
        endMs: countryEndMs,
        category: 'country',
        depth: 2,
        details:
          countryData.nodeCount > 1
            ? `${country}: ${formatMs(countryData.firstSeen)} → ${formatMs(countryData.lastSeen)} (${countryData.nodeCount} nodes)`
            : `${country}: first seen at ${formatMs(countryData.firstSeen)}`,
        isLate: countryEndMs > ATTESTATION_DEADLINE_MS,
        parentId: 'propagation',
        nodeCount: countryData.nodeCount,
        collapsible: true,
        defaultCollapsed: true,
      });

      const sortedNodes = [...countryData.nodes].sort((a, b) => a.seenTime - b.seenTime);
      for (const nodeData of sortedNodes) {
        result.push({
          id: `node-${country}-${nodeData.name}`,
          label: nodeData.username,
          startMs: nodeData.seenTime,
          endMs: nodeData.seenTime + 30,
          category: classificationToCategory(nodeData.classification),
          depth: 3,
          details: `${nodeData.username}: seen at ${formatMs(nodeData.seenTime)} (${nodeData.classification})`,
          isLate: nodeData.seenTime > ATTESTATION_DEADLINE_MS,
          isPointInTime: true,
          parentId: countryId,
          clientName: nodeData.clientImpl,
          nodeId: nodeData.nodeId,
          username: nodeData.username,
          nodeName: nodeData.name,
          classification: nodeData.classification,
        });
      }
    }
  }
}

function buildExecutionSpans(
  result: TraceSpan[],
  executionClientData: ExecutionClientData[],
  maxExecutionEnd: number,
  selectedUsername: string | null,
  nodeGeoMap: Map<string, { country: string; city: string; clientImpl: string; clientVersion: string }>,
  excludeOutliers: boolean
): void {
  if (executionClientData.length === 0) return;

  const executionMinStart = Math.min(...executionClientData.map(c => c.minStart));
  const totalNodes = executionClientData.reduce((sum, c) => sum + c.nodes.length, 0);

  const allExecNodes = executionClientData.flatMap(c => c.nodes.map(n => ({ ...n, impl: c.impl })));

  let executionEndForParent = maxExecutionEnd;
  if (excludeOutliers && allExecNodes.length >= 4) {
    const allEndTimes = allExecNodes.map(n => n.endMs);
    const filteredEndTimes = filterOutliers(allEndTimes);
    if (filteredEndTimes.length > 0) {
      executionEndForParent = Math.max(...filteredEndTimes);
    }
  }

  result.push({
    id: 'execution',
    label: 'EIP7870 Execution',
    startMs: executionMinStart,
    endMs: executionEndForParent,
    category: 'execution',
    depth: 1,
    details: selectedUsername
      ? `${selectedUsername}: ${totalNodes} node${totalNodes !== 1 ? 's' : ''} executed block`
      : `EIP7870 reference nodes: ${formatMs(executionMinStart)} → ${formatMs(maxExecutionEnd)} (${totalNodes} nodes, ${executionClientData.length} clients)`,
    isLate: executionEndForParent > ATTESTATION_DEADLINE_MS,
    collapsible: totalNodes > 0,
    defaultCollapsed: false,
  });

  if (selectedUsername) {
    const sortedNodes = [...allExecNodes].sort((a, b) => a.startMs - b.startMs);
    for (const nodeData of sortedNodes) {
      const shortId = getShortNodeId(nodeData.nodeName);
      const geo = nodeGeoMap.get(nodeData.nodeName) || {
        country: 'Unknown',
        city: '',
        clientImpl: 'unknown',
        clientVersion: '',
      };
      const location = geo.city ? `${geo.city}, ${geo.country}` : geo.country;

      result.push({
        id: `exec-node-${nodeData.nodeName}`,
        label: `${location} (${shortId})`,
        startMs: nodeData.startMs,
        endMs: nodeData.endMs,
        category: 'execution-client',
        depth: 2,
        isLate: nodeData.endMs > ATTESTATION_DEADLINE_MS,
        parentId: 'execution',
        clientName: nodeData.impl,
        clientVersion: geo.clientVersion,
        nodeName: nodeData.nodeName,
        country: geo.country,
        city: geo.city,
      });
    }
  } else {
    const sortedNodes = [...allExecNodes].sort((a, b) => a.startMs - b.startMs);
    for (const nodeData of sortedNodes) {
      const geo = nodeGeoMap.get(nodeData.nodeName);
      const location = geo ? (geo.city ? `${geo.city}, ${geo.country}` : geo.country) : nodeData.cluster;

      result.push({
        id: `exec-node-${nodeData.nodeName}`,
        label: `${location} (${nodeData.impl})`,
        startMs: nodeData.startMs,
        endMs: nodeData.endMs,
        category: 'execution-client',
        depth: 2,
        isLate: nodeData.endMs > ATTESTATION_DEADLINE_MS,
        parentId: 'execution',
        clientName: nodeData.impl,
        clientVersion: geo?.clientVersion,
        nodeName: nodeData.nodeName,
        country: geo?.country,
        city: geo?.city,
      });
    }
  }
}

function buildDataAvailabilitySpans(
  result: TraceSpan[],
  dataColumnPropagation: FctBlockDataColumnSidecarFirstSeenByNode[],
  blobPropagation: FctBlockBlobFirstSeenByNode[],
  selectedUsername: string | null,
  selectedNodeNames: Set<string> | null,
  nodeGeoMap: Map<string, { country: string; city: string; clientImpl: string; clientVersion: string }>,
  excludeOutliers: boolean
): void {
  const daData = dataColumnPropagation.length > 0 ? dataColumnPropagation : blobPropagation;
  const isDataColumns = dataColumnPropagation.length > 0;

  if (daData.length === 0) return;

  const filteredDaData = selectedNodeNames
    ? daData.filter(item => item.meta_client_name && selectedNodeNames.has(item.meta_client_name))
    : daData;

  if (selectedUsername && selectedNodeNames) {
    // Group by node, then by column
    const byNode = new Map<
      string,
      {
        columns: Map<number, number>;
        firstSeen: number;
        lastSeen: number;
        columnCount: number;
        country: string;
        city: string;
        clientImpl: string;
        clientVersion: string;
      }
    >();

    for (const item of filteredDaData) {
      const nodeName = item.meta_client_name ?? 'unknown';
      const index =
        'column_index' in item ? (item.column_index ?? 0) : 'blob_index' in item ? (item.blob_index ?? 0) : 0;
      const seenTime = item.seen_slot_start_diff ?? Infinity;
      if (seenTime === Infinity || seenTime < 0 || seenTime > MAX_REASONABLE_SEEN_TIME_MS) continue;

      let nodeEntry = byNode.get(nodeName);
      if (!nodeEntry) {
        const geo = nodeGeoMap.get(nodeName) || {
          country: 'Unknown',
          city: '',
          clientImpl: 'unknown',
          clientVersion: '',
        };
        nodeEntry = {
          columns: new Map(),
          firstSeen: Infinity,
          lastSeen: 0,
          columnCount: 0,
          country: geo.country,
          city: geo.city,
          clientImpl: geo.clientImpl,
          clientVersion: geo.clientVersion,
        };
        byNode.set(nodeName, nodeEntry);
      }

      if (!nodeEntry.columns.has(index)) {
        nodeEntry.columns.set(index, seenTime);
        nodeEntry.columnCount++;
      }
      nodeEntry.firstSeen = Math.min(nodeEntry.firstSeen, seenTime);
      nodeEntry.lastSeen = Math.max(nodeEntry.lastSeen, seenTime);
    }

    if (byNode.size > 0) {
      const sortedNodes = Array.from(byNode.entries()).sort((a, b) => a[1].firstSeen - b[1].firstSeen);
      const daStartMs = Math.min(...sortedNodes.map(([, d]) => d.firstSeen));
      const daEndMsRaw = Math.max(...sortedNodes.map(([, d]) => d.lastSeen));

      let daEndMs = daEndMsRaw;
      if (excludeOutliers && sortedNodes.length >= 4) {
        const allLastSeens = sortedNodes.map(([, d]) => d.lastSeen);
        const filteredLastSeens = filterOutliers(allLastSeens);
        if (filteredLastSeens.length > 0) {
          daEndMs = Math.max(...filteredLastSeens);
        }
      }

      result.push({
        id: 'data-availability',
        label: isDataColumns ? 'Data Columns' : 'Blobs',
        startMs: daStartMs,
        endMs: daEndMs,
        category: 'data-availability',
        depth: 1,
        details: `${selectedUsername}: ${sortedNodes.length} node${sortedNodes.length !== 1 ? 's' : ''} receiving ${isDataColumns ? 'columns' : 'blobs'}`,
        isLate: daEndMs > ATTESTATION_DEADLINE_MS,
        collapsible: true,
        defaultCollapsed: false,
      });

      for (const [nodeName, nodeData] of sortedNodes) {
        const shortId = getShortNodeId(nodeName);
        const location = nodeData.city ? `${nodeData.city}, ${nodeData.country}` : nodeData.country;
        const nodeId = `da-node-${nodeName}`;

        result.push({
          id: nodeId,
          label: `${location} (${shortId})`,
          startMs: nodeData.firstSeen,
          endMs: nodeData.lastSeen,
          category: 'column',
          depth: 2,
          isLate: nodeData.lastSeen > ATTESTATION_DEADLINE_MS,
          parentId: 'data-availability',
          collapsible: true,
          defaultCollapsed: true,
          nodeName,
          country: nodeData.country,
          city: nodeData.city,
          nodeCount: nodeData.columnCount,
          clientName: nodeData.clientImpl,
          clientVersion: nodeData.clientVersion,
        });

        const sortedColumns = Array.from(nodeData.columns.entries()).sort((a, b) => a[1] - b[1]);
        for (const [colIndex, colTime] of sortedColumns) {
          result.push({
            id: `da-${nodeName}-col-${colIndex}`,
            label: `${isDataColumns ? 'Col' : 'Blob'} ${colIndex}`,
            startMs: colTime,
            endMs: colTime + 30,
            category: 'column',
            depth: 3,
            details: `${isDataColumns ? 'Column' : 'Blob'} ${colIndex} seen at ${formatMs(colTime)}`,
            isLate: colTime > ATTESTATION_DEADLINE_MS,
            isPointInTime: true,
            parentId: nodeId,
          });
        }
      }
    }
  } else {
    // Default view: group by column index
    const itemsByIndex = new Map<number, number[]>();

    for (const item of filteredDaData) {
      const index =
        'column_index' in item ? (item.column_index ?? 0) : 'blob_index' in item ? (item.blob_index ?? 0) : 0;
      const seenTime = item.seen_slot_start_diff ?? Infinity;
      if (seenTime !== Infinity && seenTime >= 0 && seenTime <= MAX_REASONABLE_SEEN_TIME_MS) {
        const existing = itemsByIndex.get(index) || [];
        existing.push(seenTime);
        itemsByIndex.set(index, existing);
      }
    }

    if (itemsByIndex.size > 0) {
      const columnFirstSeen = Array.from(itemsByIndex.entries())
        .map(([index, times]) => ({
          index,
          firstSeenMs: Math.min(...times),
          nodeCount: times.length,
        }))
        .sort((a, b) => a.index - b.index);

      const daStartMs = Math.min(...columnFirstSeen.map(c => c.firstSeenMs));
      const daEndMsRaw = Math.max(...columnFirstSeen.map(c => c.firstSeenMs));

      let daEndMs = daEndMsRaw;
      if (excludeOutliers && columnFirstSeen.length >= 4) {
        const allFirstSeens = columnFirstSeen.map(c => c.firstSeenMs);
        const filteredFirstSeens = filterOutliers(allFirstSeens);
        if (filteredFirstSeens.length > 0) {
          daEndMs = Math.max(...filteredFirstSeens);
        }
      }

      result.push({
        id: 'data-availability',
        label: isDataColumns ? 'Data Columns' : 'Blobs',
        startMs: daStartMs,
        endMs: daEndMs,
        category: 'data-availability',
        depth: 1,
        details: `${columnFirstSeen.length} ${isDataColumns ? 'columns' : 'blobs'} available from ${formatMs(daStartMs)} to ${formatMs(daEndMsRaw)}`,
        isLate: daEndMs > ATTESTATION_DEADLINE_MS,
        collapsible: true,
        defaultCollapsed: true,
      });

      for (const col of columnFirstSeen) {
        result.push({
          id: `column-${col.index}`,
          label: `${isDataColumns ? 'Col' : 'Blob'} ${col.index}`,
          startMs: col.firstSeenMs,
          endMs: col.firstSeenMs + 50,
          category: 'column',
          depth: 2,
          details: `${isDataColumns ? 'Column' : 'Blob'} ${col.index} first seen at ${formatMs(col.firstSeenMs)} (${col.nodeCount} nodes)`,
          isLate: col.firstSeenMs > ATTESTATION_DEADLINE_MS,
          isPointInTime: true,
          nodeCount: col.nodeCount,
          parentId: 'data-availability',
        });
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
