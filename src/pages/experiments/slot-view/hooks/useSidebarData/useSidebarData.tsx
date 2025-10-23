import { useMemo } from 'react';
import type {
  FctBlockFirstSeenByNode,
  FctBlockBlobFirstSeenByNode,
  FctAttestationFirstSeenChunked50Ms,
  FctBlockProposer,
} from '@/api/types.gen';
import type { SlotPhase } from '@/utils/beacon';
import type { TimelineItem } from '@/components/Lists/ScrollingTimeline/ScrollingTimeline.types';
import { DEFAULT_BEACON_SLOT_PHASES } from '@/utils/beacon';
import { Badge } from '@/components/Elements/Badge';

export interface UseSidebarDataParams {
  blockNodes: FctBlockFirstSeenByNode[];
  blobNodes: FctBlockBlobFirstSeenByNode[];
  attestationChunks: FctAttestationFirstSeenChunked50Ms[];
  proposer: FctBlockProposer | undefined;
  currentSlot: number;
}

export function useSidebarData({
  blockNodes,
  blobNodes,
  attestationChunks,
  proposer,
  currentSlot,
}: UseSidebarDataParams): {
  phases: SlotPhase[];
  items: TimelineItem[];
} {
  const phases = useMemo(() => DEFAULT_BEACON_SLOT_PHASES, []);

  const items = useMemo<TimelineItem[]>(() => {
    const allItems: TimelineItem[] = [];

    // 1. Slot start event - Proposer scheduled to create block (0ms)
    const proposerName = proposer?.proposer_validator_index ? proposer.proposer_validator_index.toString() : '?';
    allItems.push({
      id: `${currentSlot}-slot-start`,
      timestamp: 0,
      content: (
        <div className="flex items-center gap-1.5">
          <Badge color="blue" variant="border" size="small">
            Start
          </Badge>
          <span>Validator {proposerName}</span>
        </div>
      ),
    });

    // 2. Block seen in locations - Group by city and take earliest
    const cityFirstSeen = new Map<string, { timestamp: number; country: string }>();
    blockNodes.forEach(node => {
      const city = node.meta_client_geo_city ?? 'Unknown';
      const country = node.meta_client_geo_country ?? 'Unknown';
      const timestamp = node.seen_slot_start_diff ?? 0;

      const key = `${city}, ${country}`;
      if (!cityFirstSeen.has(key) || timestamp < cityFirstSeen.get(key)!.timestamp) {
        cityFirstSeen.set(key, { timestamp, country });
      }
    });

    cityFirstSeen.forEach((data, location) => {
      allItems.push({
        id: `${currentSlot}-block-seen-${location}-${data.timestamp}`,
        timestamp: data.timestamp,
        content: (
          <div className="flex items-center gap-1.5">
            <Badge color="green" variant="border" size="small">
              Block
            </Badge>
            <span>{location}</span>
          </div>
        ),
      });
    });

    // 3. Chunk attestations - Group by 50ms chunks
    attestationChunks.forEach((chunk, index) => {
      const count = chunk.attestation_count ?? 0;
      const timestamp = chunk.chunk_slot_start_diff ?? 0;

      if (count > 0) {
        allItems.push({
          id: `${currentSlot}-attestation-${timestamp}-${index}`,
          timestamp,
          content: (
            <div className="flex items-center gap-1.5">
              <Badge color="purple" variant="border" size="small">
                Attest
              </Badge>
              <span>{count} validators</span>
            </div>
          ),
        });
      }
    });

    // 4. Data available in continents - Calculate when ALL blobs are available per continent
    const continentBlobAvailability = new Map<
      string,
      Map<number, Set<string>> // continent -> blob_index -> Set of node_ids
    >();

    // Get total number of unique blobs
    const totalBlobs = new Set(blobNodes.map(n => n.blob_index ?? 0)).size;

    blobNodes.forEach(node => {
      const continent = node.meta_client_geo_continent_code ?? 'Unknown';
      const blobIndex = node.blob_index ?? 0;
      const nodeId = node.node_id ?? 'unknown';

      if (!continentBlobAvailability.has(continent)) {
        continentBlobAvailability.set(continent, new Map());
      }

      const continentBlobs = continentBlobAvailability.get(continent)!;
      if (!continentBlobs.has(blobIndex)) {
        continentBlobs.set(blobIndex, new Set());
      }

      continentBlobs.get(blobIndex)!.add(nodeId);
    });

    // For each continent, find when first node has ALL blobs
    const continentNames: Record<string, string> = {
      EU: 'Europe',
      NA: 'North America',
      AS: 'Asia',
      OC: 'Oceania',
      SA: 'South America',
      AF: 'Africa',
    };

    continentBlobAvailability.forEach((blobMap, continentCode) => {
      // Only proceed if continent has all blobs
      if (blobMap.size === totalBlobs && totalBlobs > 0) {
        // Find the earliest time when any single node in this continent had all blobs
        const nodeCompletionTimes = new Map<string, number>(); // node_id -> max timestamp for all blobs

        blobNodes
          .filter(n => n.meta_client_geo_continent_code === continentCode)
          .forEach(node => {
            const nodeId = node.node_id ?? 'unknown';
            const timestamp = node.seen_slot_start_diff ?? 0;

            if (!nodeCompletionTimes.has(nodeId)) {
              nodeCompletionTimes.set(nodeId, timestamp);
            } else {
              // Update to latest timestamp (this node needs all blobs)
              nodeCompletionTimes.set(nodeId, Math.max(nodeCompletionTimes.get(nodeId)!, timestamp));
            }
          });

        // Find node with earliest completion time
        let earliestCompletion = Infinity;
        nodeCompletionTimes.forEach(completionTime => {
          earliestCompletion = Math.min(earliestCompletion, completionTime);
        });

        if (earliestCompletion !== Infinity) {
          const continentName = continentNames[continentCode] ?? continentCode;
          allItems.push({
            id: `${currentSlot}-data-available-${continentCode}`,
            timestamp: earliestCompletion,
            content: (
              <div className="flex items-center gap-1.5">
                <Badge color="indigo" variant="border" size="small">
                  Data
                </Badge>
                <span>{continentName}</span>
              </div>
            ),
          });
        }
      }
    });

    // Sort all items by timestamp
    return allItems.sort((a, b) => a.timestamp - b.timestamp);
  }, [blockNodes, blobNodes, attestationChunks, proposer, currentSlot]);

  return { phases, items };
}
