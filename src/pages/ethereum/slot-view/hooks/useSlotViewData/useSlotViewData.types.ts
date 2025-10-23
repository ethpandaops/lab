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

  // State
  isLoading: boolean;
  errors: Array<{ endpoint: string; error: Error }>;
}
