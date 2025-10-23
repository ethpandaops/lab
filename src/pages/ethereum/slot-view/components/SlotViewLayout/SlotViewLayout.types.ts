import type { MapPointWithTiming } from '../../hooks/useMapData/useMapData';
import type { AttestationDataPoint } from '../AttestationArrivals/AttestationArrivals.types';
import type { ContinentalPropagationSeries } from '../BlobDataAvailability/BlobDataAvailability.types';

export interface SlotViewLayoutProps {
  mode: 'live' | 'static';
}

/**
 * Pre-computed time-filtered data to prevent child components from
 * performing expensive filtering operations on every render.
 */
export interface TimeFilteredData {
  // Map visualization
  visibleMapPoints: MapPointWithTiming[];

  // Attestation data for BlockDetailsCard
  visibleAttestationData: AttestationDataPoint[];
  attestationCount: number;
  attestationPercentage: number;

  // Blob data for BlobDataAvailability (deduplicated and filtered)
  deduplicatedBlobData: Array<{ blobId: string; time: number; color?: string }>;
  visibleContinentalPropagationData: ContinentalPropagationSeries[];

  // Attestation chart data for AttestationArrivals (pre-computed chart values)
  attestationChartValues: (number | null)[];
}
