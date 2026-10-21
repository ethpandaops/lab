import type { ContinentalPropagationSeries } from '../BlobDataAvailability/BlobDataAvailability.types';
import type { ForkInfo } from '@/utils/forks';

export interface BottomBarProps {
  activeFork: ForkInfo | null;
  blockVersion?: string;
  blobCount: number;
  dataColumnBlobCount: number;
  /** Blobs in the block, or null while unknown */
  blockBlobCount?: number | null;
  dataColumnFirstSeenData: Array<{ columnId: number; time: number; color?: string }>;
  currentSlot: number;
  deduplicatedBlobData: Array<{ blobId: string; time: number; color?: string }>;
  visibleContinentalPropagationData: ContinentalPropagationSeries[];
  attestationChartValues: (number | null)[];
  /** Gloas (ePBS): PTC payload attestation arrivals, second stream. */
  payloadAttestationChartValues?: (number | null)[];
  attestationTotalExpected: number;
  attestationMaxCount: number;
  mode: 'live' | 'static';
}
