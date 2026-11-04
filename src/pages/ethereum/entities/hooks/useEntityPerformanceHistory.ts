import { useMemo } from 'react';

import { useDailyByClient } from '@/pages/ethereum/clients/hooks/useDailyByClient';
import { useAttestationRows, useProposalRows } from '@/pages/ethereum/clients/hooks/usePerformanceRows';

import {
  ENTITY_TABLES,
  fctAttestationVoteCorrectnessByEntityDailyList,
  fctBlockProposalByEntityDailyList,
  type FctAttestationVoteCorrectnessByEntityDaily,
  type FctBlockProposalByEntityDaily,
} from '../api/entity-models';
import { addCounts, EMPTY_COUNTS, toCounts, type PerformanceCounts } from '../utils/performance';

export interface UseEntityPerformanceHistoryResult {
  /** Days from the start to the end, oldest first */
  days: string[];
  /** The entity's counts per day */
  entity: Map<string, PerformanceCounts>;
  /** Every validator's counts per day */
  network: Map<string, PerformanceCounts>;
  isLoading: boolean;
  error: Error | null;
}

/** Adds each row's counts to its day */
function byDay<T extends { day_start_date?: string }>(
  rows: T[],
  into: Map<string, PerformanceCounts>,
  from: string,
  to: string
): void {
  for (const row of rows) {
    const day = row.day_start_date ?? '';
    if (day < from || day >= to) continue;
    into.set(day, addCounts(into.get(day) ?? EMPTY_COUNTS, toCounts(row)));
  }
}

/**
 * An entity's attestation and proposal counts per day from `start` to `end` (Unix seconds, end exclusive), beside
 * the whole network's. Network days sum the per-client tables of one layer, which hold every validator once.
 */
export function useEntityPerformanceHistory(
  entity: string,
  start: number | undefined,
  end: number | undefined
): UseEntityPerformanceHistoryResult {
  const filters = start === undefined ? null : { entity_eq: entity };
  const attestations = useDailyByClient<FctAttestationVoteCorrectnessByEntityDaily & { day_start_date?: string }>(
    fctAttestationVoteCorrectnessByEntityDailyList,
    ENTITY_TABLES.attestationsDaily,
    filters,
    start,
    end
  );
  const proposals = useDailyByClient<FctBlockProposalByEntityDaily & { day_start_date?: string }>(
    fctBlockProposalByEntityDailyList,
    ENTITY_TABLES.proposalsDaily,
    filters,
    start,
    end
  );
  const networkAttestations = useAttestationRows('consensus', start);
  const networkProposals = useProposalRows('consensus', start);

  const result = useMemo(() => {
    const days: string[] = [];
    if (start !== undefined && end !== undefined) {
      for (let t = Math.floor(start / 86_400) * 86_400; t < end; t += 86_400) {
        days.push(new Date(t * 1000).toISOString().slice(0, 10));
      }
    }
    const from = days[0] ?? '';
    const to = end === undefined ? '' : new Date(end * 1000).toISOString().slice(0, 10);
    const own = new Map<string, PerformanceCounts>();
    const network = new Map<string, PerformanceCounts>();
    byDay(attestations.rows, own, from, to);
    byDay(proposals.rows, own, from, to);
    byDay(networkAttestations.rows, network, from, to);
    byDay(networkProposals.rows, network, from, to);
    return { days, entity: own, network };
  }, [start, end, attestations.rows, proposals.rows, networkAttestations.rows, networkProposals.rows]);

  return {
    ...result,
    isLoading:
      attestations.isLoading || proposals.isLoading || networkAttestations.isLoading || networkProposals.isLoading,
    error: attestations.error ?? proposals.error ?? networkAttestations.error ?? networkProposals.error ?? null,
  };
}
