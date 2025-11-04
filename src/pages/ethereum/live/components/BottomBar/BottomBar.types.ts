import type { ContinentalPropagationSeries } from '../BlobDataAvailability/BlobDataAvailability.types';

export interface BottomBarProps {
  blockVersion?: string;
  blobCount: number;
  dataColumnBlobCount: number;
  dataColumnFirstSeenData: Array<{ columnId: number; time: number; color?: string }>;
  currentSlot: number;
  currentTime: number; // milliseconds from slot start (0-12000)
  deduplicatedBlobData: Array<{ blobId: string; time: number; color?: string }>;
  visibleContinentalPropagationData: ContinentalPropagationSeries[];
  attestationChartValues: (number | null)[];
  attestationTotalExpected: number;
  attestationMaxCount: number;
  mode: 'live' | 'static';
}
