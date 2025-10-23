import { useMemo } from 'react';
import type { FctAttestationFirstSeenChunked50Ms } from '@/api/types.gen';
import type { AttestationDataPoint } from '../../components/AttestationArrivals/AttestationArrivals.types';

export function useAttestationData(
  chunkedData: FctAttestationFirstSeenChunked50Ms[],
  totalExpectedValidators?: number
): {
  data: AttestationDataPoint[];
  totalExpected: number;
  maxCount: number;
} {
  const data = useMemo<AttestationDataPoint[]>(() => {
    return chunkedData.map(chunk => ({
      time: chunk.chunk_slot_start_diff ?? 0,
      count: chunk.attestation_count ?? 0,
    }));
  }, [chunkedData]);

  // Calculate max count across all time points for yMax calculation
  const maxCount = useMemo(() => {
    return chunkedData.reduce((max, chunk) => Math.max(max, chunk.attestation_count ?? 0), 0);
  }, [chunkedData]);

  // Use the total expected validators from the committee data if provided,
  // otherwise fall back to the sum of received attestations (old behavior)
  const totalExpected = useMemo(() => {
    if (totalExpectedValidators !== undefined && totalExpectedValidators > 0) {
      return totalExpectedValidators;
    }
    // Fallback: sum all attestation counts (NOT CORRECT but prevents breaking)
    return chunkedData.reduce((sum, chunk) => sum + (chunk.attestation_count ?? 0), 0);
  }, [chunkedData, totalExpectedValidators]);

  return { data, totalExpected, maxCount };
}
