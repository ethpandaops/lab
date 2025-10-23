import { useMemo } from 'react';
import type { FctAttestationFirstSeenChunked50Ms } from '@/api/types.gen';
import type { AttestationDataPoint } from '../../components/AttestationArrivals/AttestationArrivals.types';

export function useAttestationData(chunkedData: FctAttestationFirstSeenChunked50Ms[]): {
  data: AttestationDataPoint[];
  totalExpected: number;
} {
  const data = useMemo<AttestationDataPoint[]>(() => {
    return chunkedData.map(chunk => ({
      time: chunk.chunk_slot_start_diff ?? 0,
      count: chunk.attestation_count ?? 0,
    }));
  }, [chunkedData]);

  // totalExpected should be the sum of all attestation counts
  // since each chunk contains the count of attestations received in that time interval
  const totalExpected = useMemo(() => {
    return chunkedData.reduce((sum, chunk) => sum + (chunk.attestation_count ?? 0), 0);
  }, [chunkedData]);

  return { data, totalExpected };
}
