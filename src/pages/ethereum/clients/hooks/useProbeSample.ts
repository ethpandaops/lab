import { useMemo } from 'react';
import { useQueries, type UseQueryResult } from '@tanstack/react-query';
import { intCustodyProbeServiceList } from '@/api/sdk.gen';
import type { IntCustodyProbe } from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { PAGE_SIZE } from '../constants';
import { peerClient } from '../utils/client-versions';

/** Slices of probes read across the window */
export const PROBE_SLICES = 24;

/** Length of each slice; a client version draws a few hundred probes in that time */
export const PROBE_SLICE_SECONDS = 15;

export interface UseProbeSampleResult {
  /** Probes of peers on the versions, from every slice */
  probes: IntCustodyProbe[];
  isLoading: boolean;
}

function combine(results: Array<UseQueryResult<IntCustodyProbe[]>>): UseProbeSampleResult {
  return {
    probes: results.flatMap(result => result.data ?? []),
    isLoading: results.some(result => result.isLoading),
  };
}

/**
 * Custody probes of the client's peers on each of `versions`, read in {@link PROBE_SLICES} slices of
 * {@link PROBE_SLICE_SECONDS} spread evenly from `since` to now. Probes run thousands a minute, too many to read
 * over a whole window.
 */
export function useProbeSample(
  client: string | undefined,
  versions: string[],
  since: number,
  enabled: boolean
): UseProbeSampleResult {
  const { currentNetwork } = useNetwork();
  // Minute aligned so the slices stay cached while the page is open
  const now = useMemo(() => Math.floor(Date.now() / 1000 / 60) * 60, []);
  const starts = useMemo(() => {
    const step = (now - since) / PROBE_SLICES;
    // The middle of each step, aligned to the slice length
    return Array.from(
      { length: PROBE_SLICES },
      (_, i) => Math.floor((since + (i + 0.5) * step) / PROBE_SLICE_SECONDS) * PROBE_SLICE_SECONDS
    );
  }, [since, now]);
  const implementation = client === 'caplin' ? 'erigon' : client;

  const { probes, isLoading } = useQueries({
    queries: versions.flatMap(version =>
      starts.map(start => ({
        queryKey: ['client-pages', 'probe-sample', currentNetwork?.name, client, version, start],
        queryFn: async ({ signal }: { signal: AbortSignal }) => {
          const response = await intCustodyProbeServiceList({
            query: {
              meta_peer_implementation_eq: implementation,
              meta_peer_version_contains: version,
              probe_date_time_gte: start,
              probe_date_time_lt: start + PROBE_SLICE_SECONDS,
              page_size: PAGE_SIZE,
            },
            signal,
            throwOnError: true,
          });
          return response.data?.int_custody_probe ?? [];
        },
        enabled: !!currentNetwork && !!client && enabled,
        staleTime: Infinity,
      }))
    ),
    combine,
  });

  return useMemo(
    () => ({
      probes: probes.filter(probe => peerClient(probe.meta_peer_implementation, probe.meta_peer_version) === client),
      isLoading,
    }),
    [probes, isLoading, client]
  );
}
