import {
  BeaconSlotData,
  BlockData,
  Node,
  Proposer,
  SlimTimings,
  AttestationsData,
  AttestationWindow,
  BlobTimingMap,
  RelayBids,
  DeliveredPayloads,
  RelayBid,
  DeliveredPayload,
} from '@/api/gen/backend/pkg/server/proto/beacon_slots/beacon_slots_pb';
import {
  ListBeaconSlotBlockResponse,
  ListBeaconSlotBlockTimingResponse,
  ListBeaconSlotBlobTimingResponse,
  ListBeaconSlotBlobTotalResponse,
  ListBeaconSlotAttestationTimingResponse,
  ListBeaconSlotAttestationCorrectnessResponse,
  ListBeaconSlotProposerEntityResponse,
  ListBeaconSlotMevResponse,
  ListBeaconSlotMevRelayResponse,
  ListBeaconSlotMevBuilderResponse,
  BeaconBlock,
  BlockTimingNode,
  BlobTimingNode,
  AttestationTimingChunk,
  AttestationCorrectness,
  ProposerEntity,
  MevBlock,
} from '@/api/gen/backend/pkg/api/v1/proto/public_pb';
import { protoInt64 } from '@bufbuild/protobuf';
import { getCityCoordinates, getContinentCoordinates } from './cityCoordinates';

interface TransformData {
  network: string;
  slot: number;
  genesisTime?: number; // Network-specific genesis time from beacon context
  blockResult: PromiseSettledResult<ListBeaconSlotBlockResponse>;
  blockTimingResult: PromiseSettledResult<ListBeaconSlotBlockTimingResponse>;
  blobTimingResult: PromiseSettledResult<ListBeaconSlotBlobTimingResponse>;
  blobTotalResult: PromiseSettledResult<ListBeaconSlotBlobTotalResponse>;
  attestationTimingResult: PromiseSettledResult<ListBeaconSlotAttestationTimingResponse>;
  attestationCorrectnessResult: PromiseSettledResult<ListBeaconSlotAttestationCorrectnessResponse>;
  proposerEntityResult?: PromiseSettledResult<ListBeaconSlotProposerEntityResponse>; // Optional for backward compatibility
  mevBlockResult: PromiseSettledResult<ListBeaconSlotMevResponse>;
  mevRelayResult: PromiseSettledResult<ListBeaconSlotMevRelayResponse>;
  mevBuilderResult: PromiseSettledResult<ListBeaconSlotMevBuilderResponse>;
}

/**
 * Transform multiple REST API responses into the BeaconSlotData format
 * This ensures compatibility with existing components expecting the gRPC response structure
 */
export function transformToBeaconSlotData(data: TransformData): BeaconSlotData {
  const startTime = Date.now();

  // Initialize the response structure
  const slotData = new BeaconSlotData({
    slot: BigInt(data.slot),
    network: data.network,
    processedAt: new Date().toISOString(),
    processingTimeMs: BigInt(0), // Will be set at the end
    nodes: {},
  });

  // 1. Process Block Data (from getBeaconBlock)
  if (data.blockResult.status === 'fulfilled' && data.blockResult.value.blocks.length > 0) {
    const block = selectCanonicalBlock(data.blockResult.value.blocks);
    if (block) {
      slotData.block = transformBlockData(block, data.slot, data.genesisTime);
      slotData.proposer = new Proposer({
        slot: BigInt(data.slot),
        proposerValidatorIndex: BigInt(block.proposerIndex || 0),
      });

      // Get entity from proposer entity endpoint if available
      if (
        data.proposerEntityResult?.status === 'fulfilled' &&
        data.proposerEntityResult.value.entities.length > 0
      ) {
        // Look for entity matching the block root, or use first one
        const blockRoot = block.blockRoot;
        const entity =
          data.proposerEntityResult.value.entities.find(e => e.blockRoot === blockRoot) ||
          data.proposerEntityResult.value.entities[0];

        // ProposerEntity has 'entity' field, not 'entityName'
        slotData.entity = entity.entity || 'Unknown';
      } else {
        // Fallback to entity from block if available
        slotData.entity = block.entity || 'Unknown';
      }
    }
  }

  // 2. Build Nodes Map from timing data
  if (data.blockTimingResult.status === 'fulfilled') {
    extractNodesFromTiming(data.blockTimingResult.value, slotData.nodes);
  }
  if (data.blobTimingResult.status === 'fulfilled') {
    extractNodesFromBlobTiming(data.blobTimingResult.value, slotData.nodes);
  }

  // 3. Build Timings
  slotData.timings = buildTimings(data);

  // 4. Build Attestations
  const attestationResult = buildAttestations(data);
  slotData.attestations = attestationResult.attestations;

  // Add participation rate as a custom field for UI usage
  (slotData as any).participationRate = attestationResult.participationRate;

  // 5. Build MEV Data
  const mevData = buildMevData(data);
  slotData.relayBids = mevData.relayBids;
  slotData.deliveredPayloads = mevData.deliveredPayloads;

  // Set processing time
  slotData.processingTimeMs = BigInt(Date.now() - startTime);

  return slotData;
}

/**
 * Select the canonical block from multiple blocks (in case of forks)
 * For now, just return the first block - can be enhanced with canonical logic
 */
function selectCanonicalBlock(blocks: BeaconBlock[]): BeaconBlock | null {
  if (blocks.length === 0) return null;
  // TODO: Implement canonical selection logic if needed
  // For now, return the first block
  return blocks[0];
}

/**
 * Transform REST API BeaconBlock to gRPC BlockData format
 */
function transformBlockData(block: BeaconBlock, slot: number, genesisTime?: number): BlockData {
  const slotStartTime = calculateSlotStartTime(slot, genesisTime);
  const epoch = Math.floor(slot / 32);
  const epochStartTime = calculateSlotStartTime(epoch * 32, genesisTime);

  return new BlockData({
    slot: BigInt(slot),
    slotStartDateTime: new Date(slotStartTime * 1000).toISOString(),
    epoch: BigInt(epoch),
    epochStartDateTime: new Date(epochStartTime * 1000).toISOString(),
    blockRoot: block.blockRoot,
    blockVersion: block.blockVersion,
    blockTotalBytes: BigInt(block.blockTotalBytes || 0),
    blockTotalBytesCompressed: BigInt(block.blockTotalBytesCompressed || 0),
    parentRoot: block.parentRoot,
    stateRoot: block.stateRoot,
    proposerIndex: BigInt(block.proposerIndex || 0),

    // ETH1 data fields - Not provided by REST API and not used in UI
    // These fields track the deposit contract from pre-merge Ethereum
    // Setting to empty strings as they're not displayed anywhere in the UI
    eth1DataBlockHash: block.eth1BlockHash || '',
    eth1DataDepositRoot: block.eth1DepositRoot || '',

    // Execution payload fields
    executionPayloadBlockHash: block.executionBlockHash,
    executionPayloadBlockNumber: block.executionBlockNumber
      ? BigInt(block.executionBlockNumber)
      : protoInt64.zero,
    executionPayloadFeeRecipient: block.executionFeeRecipient,
    executionPayloadBaseFeePerGas: block.executionBaseFeePerGas
      ? BigInt(block.executionBaseFeePerGas)
      : protoInt64.zero,
    executionPayloadBlobGasUsed: block.executionBlobGasUsed
      ? BigInt(block.executionBlobGasUsed)
      : protoInt64.zero,
    executionPayloadExcessBlobGas: block.executionExcessBlobGas
      ? BigInt(block.executionExcessBlobGas)
      : protoInt64.zero,
    executionPayloadGasLimit: block.executionGasLimit
      ? BigInt(block.executionGasLimit)
      : protoInt64.zero,
    executionPayloadGasUsed: block.executionGasUsed
      ? BigInt(block.executionGasUsed)
      : protoInt64.zero,
    executionPayloadStateRoot: block.executionStateRoot || '',
    executionPayloadParentHash: block.executionParentHash || '',
    executionPayloadTransactionsCount: BigInt(block.executionTransactionsCount || 0),
    executionPayloadTransactionsTotalBytes: BigInt(block.executionTransactionsBytes || 0),
    executionPayloadTransactionsTotalBytesCompressed: BigInt(
      block.executionTransactionsBytesCompressed || 0,
    ),
  });
}

/**
 * Extract nodes from block timing response
 * NOTE: REST API doesn't provide latitude/longitude coordinates in GeoInfo
 * This means the map visualization won't show nodes at correct positions
 * TODO: Need to get coordinate data from another source or update the API
 */
function extractNodesFromTiming(
  timing: ListBeaconSlotBlockTimingResponse,
  nodesMap: Record<string, Node>,
) {
  timing.nodes?.forEach(node => {
    // Build the full node name to match gRPC format
    // The REST API gives us short node_id, but we need the full format
    const fullNodeName =
      node.client?.name ||
      `${node.username || 'unknown'}/${timing.filters?.network || 'mainnet'}/${node.nodeId}`;

    // Get coordinates from city lookup (with country and continent fallbacks)
    let latitude: number | undefined;
    let longitude: number | undefined;

    if (node.geo?.city && node.geo?.country) {
      // getCityCoordinates now handles city -> country -> undefined fallback
      const coords = getCityCoordinates(node.geo.city, node.geo.country);
      if (coords) {
        latitude = coords.lat;
        longitude = coords.lng;
      }
    } else if (node.geo?.country) {
      // No city provided, try country directly
      const coords = getCityCoordinates('', node.geo.country);
      if (coords) {
        latitude = coords.lat;
        longitude = coords.lng;
      }
    }

    // Final fallback to continent coordinates if no city/country coords found
    if (!latitude && !longitude && node.geo?.continentCode) {
      const coords = getContinentCoordinates(node.geo.continentCode);
      latitude = coords.lat;
      longitude = coords.lng;
    }

    nodesMap[fullNodeName] = new Node({
      name: fullNodeName,
      username: node.username || '',
      geo: node.geo
        ? {
            city: node.geo.city || '',
            country: node.geo.country || '',
            // REST API uses continent_code, gRPC uses continent
            continent: node.geo.continentCode || '',
            // Use looked up coordinates
            latitude: latitude ?? undefined,
            longitude: longitude ?? undefined,
          }
        : undefined,
    });
  });
}

/**
 * Extract nodes from blob timing response
 * BlobTimingNode includes both geo and client info
 */
function extractNodesFromBlobTiming(
  timing: ListBeaconSlotBlobTimingResponse,
  nodesMap: Record<string, Node>,
) {
  timing.nodes?.forEach(node => {
    // Build the full node name to match gRPC format
    const fullNodeName =
      node.client?.name ||
      `${node.username || 'unknown'}/${timing.filters?.network || 'mainnet'}/${node.nodeId}`;

    // Add or update node with geo data from blob timing
    if (!nodesMap[fullNodeName] || !nodesMap[fullNodeName].geo) {
      // Get coordinates from city lookup
      let latitude: number | undefined;
      let longitude: number | undefined;

      if (node.geo?.city && node.geo?.country) {
        const coords = getCityCoordinates(node.geo.city, node.geo.country);
        if (coords) {
          latitude = coords.lat;
          longitude = coords.lng;
        }
      }

      // Fallback to continent coordinates if no city coords found
      if (!latitude && !longitude && node.geo?.continentCode) {
        const coords = getContinentCoordinates(node.geo.continentCode);
        latitude = coords.lat;
        longitude = coords.lng;
      }

      nodesMap[fullNodeName] = new Node({
        name: fullNodeName,
        username: node.username || '',
        geo: node.geo
          ? {
              city: node.geo.city || '',
              country: node.geo.country || '',
              // REST API uses continent_code, gRPC uses continent
              continent: node.geo.continentCode || '',
              // Use looked up coordinates
              latitude: latitude as any,
              longitude: longitude as any,
            }
          : undefined,
      });
    }
  });
}

/**
 * Build timing structure from multiple endpoints
 */
function buildTimings(data: TransformData): SlimTimings {
  const timings = new SlimTimings({
    blockSeen: {},
    blockFirstSeenP2p: {},
    blobSeen: {},
    blobFirstSeenP2p: {},
  });

  // Process block timing
  if (data.blockTimingResult.status === 'fulfilled') {
    data.blockTimingResult.value.nodes?.forEach(node => {
      if (node.seenSlotStartDiff !== undefined) {
        const ms = BigInt(node.seenSlotStartDiff);

        // Filter out blocks seen after 12 seconds
        if (ms > BigInt(12000)) {
          return;
        }

        const fullNodeName =
          node.client?.name || `${node.username || 'unknown'}/${data.network}/${node.nodeId}`;

        // Use explicit source field to determine if P2P or API
        // Handle both exact matches and substring matches for flexibility
        if (
          node.source === 'libp2p_gossipsub_beacon_block' ||
          node.source?.includes('libp2p') ||
          node.source?.includes('gossipsub')
        ) {
          // P2P block (will be shown in purple)
          timings.blockFirstSeenP2p[fullNodeName] = ms;
        } else if (
          node.source === 'beacon_api_eth_v1_events_block' ||
          node.source === 'beacon_api_eth_v1_events_block_gossip' ||
          node.source?.includes('beacon_api')
        ) {
          // API block
          timings.blockSeen[fullNodeName] = ms;
        } else {
          // Unknown source - default to API
          timings.blockSeen[fullNodeName] = ms;
        }
      }
    });
  }

  // Process blob timing
  if (data.blobTimingResult.status === 'fulfilled') {
    data.blobTimingResult.value.nodes?.forEach(node => {
      if (node.seenSlotStartDiff !== undefined) {
        const ms = BigInt(node.seenSlotStartDiff);

        // Filter out blobs seen after 12 seconds
        if (ms > BigInt(12000)) {
          return;
        }

        // Build the node name consistently - use client.name if available, otherwise fallback
        const fullNodeName =
          node.client?.name || `${node.username || 'unknown'}/${data.network}/${node.nodeId}`;

        // If blobIndex is undefined, it means this is the first blob seen timing
        // We should still record it but maybe with index 0 or handle differently
        const blobIndexStr = node.blobIndex !== undefined ? String(node.blobIndex) : '0';

        // Use explicit source field to determine if P2P or API
        // Handle both exact matches and substring matches for flexibility
        if (
          node.source === 'libp2p_gossipsub_blob_sidecar' ||
          node.source?.includes('libp2p') ||
          node.source?.includes('gossipsub')
        ) {
          // P2P blob
          if (!timings.blobFirstSeenP2p[fullNodeName]) {
            timings.blobFirstSeenP2p[fullNodeName] = new BlobTimingMap({ timings: {} });
          }
          // Only set if not already set or if this timing is earlier
          if (
            !timings.blobFirstSeenP2p[fullNodeName].timings[blobIndexStr] ||
            ms < timings.blobFirstSeenP2p[fullNodeName].timings[blobIndexStr]
          ) {
            timings.blobFirstSeenP2p[fullNodeName].timings[blobIndexStr] = ms;
          }
        } else if (
          node.source === 'beacon_api_eth_v1_events_blob_sidecar' ||
          node.source?.includes('beacon_api')
        ) {
          // API blob
          if (!timings.blobSeen[fullNodeName]) {
            timings.blobSeen[fullNodeName] = new BlobTimingMap({ timings: {} });
          }
          // Only set if not already set or if this timing is earlier
          if (
            !timings.blobSeen[fullNodeName].timings[blobIndexStr] ||
            ms < timings.blobSeen[fullNodeName].timings[blobIndexStr]
          ) {
            timings.blobSeen[fullNodeName].timings[blobIndexStr] = ms;
          }
        } else {
          // Unknown source - default to API
          if (!timings.blobSeen[fullNodeName]) {
            timings.blobSeen[fullNodeName] = new BlobTimingMap({ timings: {} });
          }
          // Only set if not already set or if this timing is earlier
          if (
            !timings.blobSeen[fullNodeName].timings[blobIndexStr] ||
            ms < timings.blobSeen[fullNodeName].timings[blobIndexStr]
          ) {
            timings.blobSeen[fullNodeName].timings[blobIndexStr] = ms;
          }
        }
      }
    });
  }

  return timings;
}

/**
 * Build attestation data from timing and correctness endpoints
 */
function buildAttestations(data: TransformData): {
  attestations: AttestationsData | undefined;
  participationRate: number | null;
} {
  const windows: AttestationWindow[] = [];
  let maximumVotes = BigInt(0);
  let participationRate: number | null = null;

  // Process attestation timing chunks (50ms windows)
  if (data.attestationTimingResult.status === 'fulfilled') {
    const chunks = data.attestationTimingResult.value.chunks || [];

    // Group chunks by time slot and sum counts (handles multiple block roots)
    const chunksByTime = new Map<number, number>();

    chunks.forEach(chunk => {
      if (chunk.chunkStartMs !== undefined && chunk.attestationCount !== undefined) {
        const currentCount = chunksByTime.get(chunk.chunkStartMs) || 0;
        chunksByTime.set(chunk.chunkStartMs, currentCount + chunk.attestationCount);
      }
    });

    // Create windows from the aggregated data
    for (const [chunkStartMs, totalCount] of chunksByTime) {
      const startMs = BigInt(chunkStartMs);
      const endMs = startMs + BigInt(50); // 50ms chunks

      // Array filled with empty strings but typed as bigint[] - UI only checks .length
      const validatorIndices = Array(totalCount).fill('') as bigint[];

      windows.push(
        new AttestationWindow({
          startMs,
          endMs,
          validatorIndices,
        }),
      );
    }

    // Sort windows by start time
    windows.sort((a, b) => (a.startMs < b.startMs ? -1 : a.startMs > b.startMs ? 1 : 0));
  }

  // Get maximum votes and participation from correctness data
  if (data.attestationCorrectnessResult.status === 'fulfilled') {
    // REST API returns 'blocks' array with votesMax and correctnessPercentage fields
    const blocks = data.attestationCorrectnessResult.value.blocks || [];
    if (blocks.length > 0) {
      const block = blocks[0];
      if (block.votesMax) {
        maximumVotes = BigInt(block.votesMax);
      }
      // Use the pre-calculated correctness percentage directly from the API
      if (block.correctnessPercentage !== undefined) {
        participationRate = block.correctnessPercentage;
      }
    }
  }

  const attestations =
    windows.length === 0 && maximumVotes === BigInt(0)
      ? undefined
      : new AttestationsData({
          windows,
          maximumVotes,
        });

  return { attestations, participationRate };
}

/**
 * Build MEV data from relay and builder endpoints
 */
function buildMevData(data: TransformData): {
  relayBids: Record<string, RelayBids>;
  deliveredPayloads: Record<string, DeliveredPayloads>;
} {
  const relayBids: Record<string, RelayBids> = {};
  const deliveredPayloads: Record<string, DeliveredPayloads> = {};

  // Process MEV block data (delivered payloads)
  if (data.mevBlockResult.status === 'fulfilled') {
    data.mevBlockResult.value.blocks?.forEach(mevBlock => {
      // MevBlock has relayNames array, not a single relay field
      // We'll group by each relay that delivered the payload
      const relayNames = mevBlock.relayNames || [];

      if (relayNames.length === 0) {
        // If no relay names, put it under 'unknown'
        const relayName = 'unknown';
        if (!deliveredPayloads[relayName]) {
          deliveredPayloads[relayName] = new DeliveredPayloads({ payloads: [] });
        }

        deliveredPayloads[relayName].payloads.push(
          new DeliveredPayload({
            slot: BigInt(data.slot),
            blockHash: mevBlock.blockHash,
            blockNumber: BigInt(mevBlock.blockNumber || 0),
            proposerPubkey: mevBlock.proposerPubkey || '',
            proposerFeeRecipient: mevBlock.proposerFeeRecipient || '',
          }),
        );
      } else {
        // Add the payload to each relay that delivered it
        relayNames.forEach(relayName => {
          if (!deliveredPayloads[relayName]) {
            deliveredPayloads[relayName] = new DeliveredPayloads({ payloads: [] });
          }

          deliveredPayloads[relayName].payloads.push(
            new DeliveredPayload({
              slot: BigInt(data.slot),
              blockHash: mevBlock.blockHash,
              blockNumber: BigInt(mevBlock.blockNumber || 0),
              proposerPubkey: mevBlock.proposerPubkey || '',
              proposerFeeRecipient: mevBlock.proposerFeeRecipient || '',
            }),
          );
        });
      }
    });
  }

  // Process builder bid data to create relay bids
  // The builder endpoint gives us the highest bid per builder
  if (data.mevBuilderResult.status === 'fulfilled') {
    data.mevBuilderResult.value.builders?.forEach(builderBid => {
      // Builder bid has relayNames array
      const relayNames = builderBid.relayNames || [];

      if (relayNames.length === 0) {
        // If no relay names, put it under 'unknown'
        const relayName = 'unknown';
        if (!relayBids[relayName]) {
          relayBids[relayName] = new RelayBids({ bids: [] });
        }

        // Calculate slot time from earliest bid time if available
        let slotTime = 0;
        if (builderBid.earliestBidTime && data.genesisTime) {
          const bidTimestamp = new Date(builderBid.earliestBidTime).getTime() / 1000;
          const slotStartTime = calculateSlotStartTime(data.slot, data.genesisTime);
          slotTime = Math.floor((bidTimestamp - slotStartTime) * 1000); // Convert to ms
        }

        relayBids[relayName].bids.push(
          new RelayBid({
            slot: BigInt(data.slot),
            parentHash: '', // Not available from builder endpoint
            blockHash: builderBid.blockHash || '',
            builderPubkey: '', // Not available from builder endpoint
            proposerPubkey: '', // Not available from builder endpoint
            proposerFeeRecipient: '', // Not available from builder endpoint
            value: builderBid.value || '0',
            gasLimit: protoInt64.zero, // Not available
            gasUsed: protoInt64.zero, // Not available
            slotTime: slotTime,
            timeBucket: 100, // Default 100ms bucket
          }),
        );
      } else {
        // Add the bid to each relay that received it
        relayNames.forEach(relayName => {
          if (!relayBids[relayName]) {
            relayBids[relayName] = new RelayBids({ bids: [] });
          }

          // Calculate slot time from earliest bid time if available
          let slotTime = 0;
          if (builderBid.earliestBidTime && data.genesisTime) {
            const bidTimestamp = new Date(builderBid.earliestBidTime).getTime() / 1000;
            const slotStartTime = calculateSlotStartTime(data.slot, data.genesisTime);
            slotTime = Math.floor((bidTimestamp - slotStartTime) * 1000); // Convert to ms
          }

          relayBids[relayName].bids.push(
            new RelayBid({
              slot: BigInt(data.slot),
              parentHash: '', // Not available from builder endpoint
              blockHash: builderBid.blockHash || '',
              builderPubkey: '', // Not available from builder endpoint
              proposerPubkey: '', // Not available from builder endpoint
              proposerFeeRecipient: '', // Not available from builder endpoint
              value: builderBid.value || '0',
              gasLimit: protoInt64.zero, // Not available
              gasUsed: protoInt64.zero, // Not available
              slotTime: slotTime,
              timeBucket: 100, // Default 100ms bucket
            }),
          );
        });
      }
    });
  }

  // Also check MEV blocks for additional bid information
  // MEV blocks contain the actual delivered payloads with more complete data
  if (data.mevBlockResult.status === 'fulfilled') {
    data.mevBlockResult.value.blocks?.forEach(mevBlock => {
      const relayNames = mevBlock.relayNames || [];

      // Calculate slot time from earliest bid time if available
      let slotTime = 0;
      if (mevBlock.earliestBidTime && data.genesisTime) {
        const bidTimestamp = new Date(mevBlock.earliestBidTime).getTime() / 1000;
        const slotStartTime = calculateSlotStartTime(data.slot, data.genesisTime);
        slotTime = Math.floor((bidTimestamp - slotStartTime) * 1000); // Convert to ms
      }

      const bidToAdd = new RelayBid({
        slot: BigInt(data.slot),
        parentHash: mevBlock.parentHash || '',
        blockHash: mevBlock.blockHash || '',
        builderPubkey: mevBlock.builderPubkey || '',
        proposerPubkey: mevBlock.proposerPubkey || '',
        proposerFeeRecipient: mevBlock.proposerFeeRecipient || '',
        value: mevBlock.value || '0',
        gasLimit: BigInt(mevBlock.gasLimit || 0),
        gasUsed: BigInt(mevBlock.gasUsed || 0),
        slotTime: slotTime,
        timeBucket: 100, // Default 100ms bucket
      });

      if (relayNames.length === 0) {
        // If no relay names, put it under 'unknown'
        const relayName = 'unknown';
        if (!relayBids[relayName]) {
          relayBids[relayName] = new RelayBids({ bids: [] });
        }

        // Check if this bid already exists (by block hash)
        const existingBidIndex = relayBids[relayName].bids.findIndex(
          bid => bid.blockHash === mevBlock.blockHash,
        );

        if (existingBidIndex >= 0) {
          // Update existing bid with more complete data
          relayBids[relayName].bids[existingBidIndex] = bidToAdd;
        } else {
          relayBids[relayName].bids.push(bidToAdd);
        }
      } else {
        // Add/update the bid for each relay
        relayNames.forEach(relayName => {
          if (!relayBids[relayName]) {
            relayBids[relayName] = new RelayBids({ bids: [] });
          }

          // Check if this bid already exists (by block hash)
          const existingBidIndex = relayBids[relayName].bids.findIndex(
            bid => bid.blockHash === mevBlock.blockHash,
          );

          if (existingBidIndex >= 0) {
            // Update existing bid with more complete data
            relayBids[relayName].bids[existingBidIndex] = bidToAdd;
          } else {
            relayBids[relayName].bids.push(bidToAdd);
          }
        });
      }
    });
  }

  // Note: The relay endpoint (data.mevRelayResult) only provides bid counts,
  // not individual bid details, so we don't use it for building RelayBids

  return { relayBids, deliveredPayloads };
}

/**
 * Calculate slot start time based on slot number and network genesis time
 * Uses network-specific genesis time from beacon context when available
 */
function calculateSlotStartTime(slot: number, genesisTime?: number): number {
  // Use provided genesis time or fall back to mainnet
  // Mainnet genesis time: 1606824023 (Dec 1, 2020, 12:00:23 PM UTC)
  const GENESIS_TIME = genesisTime || 1606824023;
  const SECONDS_PER_SLOT = 12;
  return GENESIS_TIME + slot * SECONDS_PER_SLOT;
}
