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

  // Data column availability (PeerDAS) - placeholder
  dataColumnBlobCount: number;
  dataColumnFirstSeenData: Array<{ columnId: number; time: number; color?: string }>;

  // Attestation arrivals
  attestationData: AttestationDataPoint[];
  attestationTotalExpected: number;
  attestationActualCount: number; // Actual count of validators who attested
  attestationMaxCount: number; // Max count across all time points for yMax

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
