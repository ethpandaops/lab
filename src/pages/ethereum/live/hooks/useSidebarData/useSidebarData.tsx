import { useMemo } from 'react';
import type {
  FctBlockFirstSeenByNode,
  FctBlockBlobFirstSeenByNode,
  FctAttestationFirstSeenChunked50Ms,
  FctBlockPayloadFirstSeenByNode,
  FctPayloadAttestationFirstSeenChunked50Ms,
  FctBlockProposer,
} from '@/api/types.gen';
import type { SlotPhase } from '@/utils/beacon';
import type { TimelineItem } from '@/components/Lists/ScrollingTimeline/ScrollingTimeline.types';
import { getSlotPhases } from '@/utils/beacon';
import { useForks } from '@/hooks/useForks';
import { Badge } from '@/components/Elements/Badge';

/**
 * PERFORMANCE NOTE: These Badge components are created ONCE per hook call during useMemo.
 * They are NOT recreated on every render because the useMemo only re-runs when
 * blockNodes, blobNodes, attestationChunks, or currentSlot changes.
 * The TimelineItemComponent in ScrollingTimeline uses React.memo to prevent
 * unnecessary re-renders when only the status changes.
 */

export interface UseSidebarDataParams {
  blockNodes: FctBlockFirstSeenByNode[];
  blobNodes: FctBlockBlobFirstSeenByNode[];
  attestationChunks: FctAttestationFirstSeenChunked50Ms[];
  /** Gloas (ePBS): payload envelope sightings per sentry */
  payloadNodes?: FctBlockPayloadFirstSeenByNode[];
  /** Gloas (ePBS): PTC payload attestation arrivals, chunked */
  ptcChunks?: FctPayloadAttestationFirstSeenChunked50Ms[];
  proposer: FctBlockProposer | undefined;
  currentSlot: number;
}

export function useSidebarData({
  blockNodes,
  blobNodes,
  attestationChunks,
  payloadNodes,
  ptcChunks,
  proposer: _proposer,
  currentSlot,
}: UseSidebarDataParams): {
  phases: SlotPhase[];
  items: TimelineItem[];
} {
  const { activeFork } = useForks();
  const phases = useMemo(() => getSlotPhases(activeFork?.name), [activeFork?.name]);

  const items = useMemo<TimelineItem[]>(() => {
    const allItems: TimelineItem[] = [];

    // Location is the display convention (matching the map); node id rides
    // along muted so identical locations stay distinguishable.
    const nodeLocation = (node: { meta_client_geo_city?: string; meta_client_geo_country?: string }): string => {
      const city = node.meta_client_geo_city;
      const country = node.meta_client_geo_country ?? 'Unknown';
      return city ? `${city}, ${country}` : country;
    };

    // 2. Block sightings - one row per sentry node
    blockNodes.forEach((node, index) => {
      const nodeId = node.node_id ?? node.meta_client_name;

      allItems.push({
        id: `${currentSlot}-block-seen-${nodeId ?? index}-${index}`,
        timestamp: node.seen_slot_start_diff ?? 0,
        content: (
          <div className="flex items-center gap-1.5">
            <Badge color="green" variant="border" size="small">
              Block
            </Badge>
            <span className="truncate">{nodeLocation(node)}</span>
            {nodeId && <span className="truncate text-muted">{nodeId}</span>}
          </div>
        ),
      });
    });

    // 2b. Gloas (ePBS): payload envelope sightings - one row per sentry node
    (payloadNodes ?? []).forEach((node, index) => {
      const nodeId = node.node_id ?? node.meta_client_name;

      allItems.push({
        id: `${currentSlot}-payload-seen-${nodeId ?? index}-${index}`,
        timestamp: node.seen_slot_start_diff ?? 0,
        content: (
          <div className="flex items-center gap-1.5">
            <Badge color="indigo" variant="border" size="small">
              Payload
            </Badge>
            <span className="truncate">{nodeLocation(node)}</span>
            {nodeId && <span className="truncate text-muted">{nodeId}</span>}
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
              <span>
                {count} validator{count > 1 ? 's' : ''}
              </span>
            </div>
          ),
        });
      }
    });

    // 3b. Gloas (ePBS): PTC payload attestation arrivals, chunked
    (ptcChunks ?? []).forEach((chunk, index) => {
      const count = chunk.attestation_count ?? 0;
      const timestamp = chunk.chunk_slot_start_diff ?? 0;

      if (count > 0) {
        allItems.push({
          id: `${currentSlot}-ptc-${timestamp}-${index}`,
          timestamp,
          content: (
            <div className="flex items-center gap-1.5">
              <Badge color="yellow" variant="border" size="small">
                PTC
              </Badge>
              <span>
                {count} validator{count > 1 ? 's' : ''}
              </span>
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
  }, [blockNodes, blobNodes, attestationChunks, payloadNodes, ptcChunks, currentSlot]);

  return { phases, items };
}
