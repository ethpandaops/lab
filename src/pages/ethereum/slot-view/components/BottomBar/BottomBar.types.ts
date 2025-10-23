import type { ContinentalPropagationSeries } from '../BlobDataAvailability/BlobDataAvailability.types';

export interface BottomBarProps {
  blockVersion?: string;
  blobCount: number;
  dataColumnBlobCount: number;
  currentTime: number; // milliseconds from slot start (0-12000)
  deduplicatedBlobData: Array<{ blobId: string; time: number; color?: string }>;
  visibleContinentalPropagationData: ContinentalPropagationSeries[];
  attestationChartValues: (number | null)[];
  attestationTotalExpected: number;
  mode: 'live' | 'static';
}
