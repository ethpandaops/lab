import type { BlockDetailsData } from '../useBlockDetailsData/useBlockDetailsData.types';
import type { MapPointWithTiming } from '../useMapData/useMapData';
import type { SlotPhase } from '@/utils/beacon';
import type { TimelineItem } from '@/components/Lists/ScrollingTimeline/ScrollingTimeline.types';
import type {
  BlobDataPoint,
  DataAvailabilityRatePoint,
  ContinentalPropagationSeries,
} from '../../components/BlobDataAvailability/BlobDataAvailability.types';
import type { AttestationDataPoint } from '../../components/AttestationArrivals/AttestationArrivals.types';
import type {
  FctBlockHead,
  FctBlockProposer,
  FctBlockMev,
  FctBlockFirstSeenByNode,
  FctAttestationFirstSeenChunked50Ms,
  IntBeaconCommitteeHead,
  FctMevBidHighestValueByBuilderChunked50Ms,
  FctMevBidCountByRelay,
} from '@/api/types.gen';

/** One EL client's engine_newPayload validation timing for a slot. */
export interface ClientValidationRow {
  /** Execution client implementation (e.g. Geth, Nethermind, Reth). */
  client: string;
  /** Median engine_newPayload duration in milliseconds. */
  medianMs: number;
  /** Number of node observations backing this row. */
  observations: number;
}

export interface SlotViewData {
  // Block details (for slim card)
  blockDetails: BlockDetailsData | null;

  // Map visualization - includes timing information for progressive rendering
  mapPoints: MapPointWithTiming[];

  // Sidebar
  sidebarPhases: SlotPhase[];
  sidebarItems: TimelineItem[];

  // Blob availability (Deneb/Electra)
  blobCount: number;
  blobFirstSeenData: BlobDataPoint[];
  blobAvailabilityRateData: DataAvailabilityRatePoint[];
  blobContinentalPropagationData: ContinentalPropagationSeries[];

  // Data column availability (PeerDAS)
  dataColumnBlobCount: number;
  dataColumnFirstSeenData: Array<{ columnId: number; time: number; color?: string }>;

  // Attestation arrivals
  attestationData: AttestationDataPoint[];
  attestationTotalExpected: number;
  attestationActualCount: number; // Actual count of validators who attested
  attestationMaxCount: number; // Max count across all time points for yMax

  // EL client block-validation race (engine_newPayload timing), sorted fastest first
  clientValidation: ClientValidationRow[];

  // Named staking entity that proposed the block, when known (e.g. Lido)
  proposerEntity: string | null;

  // Block propagation across the sentry network (arrival ms percentiles)
  propagationMinMs: number | null;
  propagationP50Ms: number | null;
  propagationP90Ms: number | null;
  propagationMaxMs: number | null;
  propagationNodeCount: number;

  // Attestation arrival timing (ms from slot start)
  attestationFirstMs: number | null;
  attestationPeakMs: number | null;

  // MEV auction depth for the slot
  auctionBuilders: number;
  auctionRelays: number;
  auctionBids: number;
  auctionTopRelay: string | null;
  auctionTopBidWei: string | null;

  // State
  isLoading: boolean;
  errors: Array<{ endpoint: string; error: Error }>;

  // Raw API data (for slot progress timeline)
  rawApiData: {
    blockHead?: FctBlockHead;
    blockProposer?: FctBlockProposer;
    blockMev?: FctBlockMev;
    blockPropagation: FctBlockFirstSeenByNode[];
    attestations: FctAttestationFirstSeenChunked50Ms[];
    committees: IntBeaconCommitteeHead[];
    mevBidding: FctMevBidHighestValueByBuilderChunked50Ms[];
    relayBids: FctMevBidCountByRelay[];
  };
}
