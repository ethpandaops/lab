import type { ContinentalPropagationSeries } from '../BlobDataAvailability/BlobDataAvailability.types';
import type { ForkInfo } from '@/utils/forks';

export interface BottomBarProps {
  activeFork: ForkInfo | null;
  blockVersion?: string;
  blobCount: number;
  dataColumnBlobCount: number;
  dataColumnFirstSeenData: Array<{ columnId: number; time: number; color?: string }>;
  currentSlot: number;
  deduplicatedBlobData: Array<{ blobId: string; time: number; color?: string }>;
  visibleContinentalPropagationData: ContinentalPropagationSeries[];
  attestationChartValues: (number | null)[];
  attestationTotalExpected: number;
  attestationMaxCount: number;
  mode: 'live' | 'static';
}
