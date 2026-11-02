import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fctPeerPartialMessageSupportByClientDailyServiceList, intCustodyProbeServiceList } from '@/api/sdk.gen';
import type { FctPeerPartialMessageSupportByClientDaily, IntCustodyProbe } from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { fetchAllPages } from '@/utils/api-pagination';
import { PAGE_SIZE } from '../constants';
import { dailyDateValues } from '../utils/client-share';
import { peerClient } from '../utils/client-versions';

/** Custody probes are dense; the latest hour is a few thousand per client */
export const PROBE_WINDOW_SECONDS = 3600;

export interface UsePeerSupportResult {
  /** Latest full day of partial-column support for the client's peers, one row per version */
  partial: FctPeerPartialMessageSupportByClientDaily[];
  partialDay?: string;
  /** Custody probes of the client's peers over the last hour, newest first */
  probes: IntCustodyProbe[];
  isLoading: boolean;
}

/**
 * What our sentries see of a consensus client's peers: partial-column support and custody probe results.
 */
export function usePeerSupport(client: string | undefined, enabled: boolean): UsePeerSupportResult {
  const { currentNetwork } = useNetwork();
  const dates = useMemo(() => dailyDateValues(3), []);
  // Ten-minute aligned so the probe query stays cached while the page is open
  const probeSince = useMemo(() => Math.floor(Date.now() / 1000 / 600) * 600 - PROBE_WINDOW_SECONDS, []);
  const on = !!currentNetwork && !!client && enabled;

  const partial = useQuery({
    queryKey: ['client-pages', 'partial-support', currentNetwork?.name, dates],
    queryFn: ({ signal }) =>
      fetchAllPages<FctPeerPartialMessageSupportByClientDaily>(
        fctPeerPartialMessageSupportByClientDailyServiceList,
        { query: { day_start_date_in_values: dates, page_size: PAGE_SIZE } },
        'fct_peer_partial_message_support_by_client_daily',
        signal
      ),
    enabled: on,
    staleTime: 30 * 60 * 1000,
  });

  const probes = useQuery({
    queryKey: ['client-pages', 'probes', currentNetwork?.name, client, probeSince],
    queryFn: async ({ signal }) => {
      const response = await intCustodyProbeServiceList({
        query: {
          meta_peer_implementation_eq: client === 'caplin' ? 'erigon' : client,
          probe_date_time_gte: probeSince,
          order_by: 'probe_date_time desc',
          page_size: PAGE_SIZE,
        },
        signal,
        throwOnError: true,
      });
      return response.data?.int_custody_probe ?? [];
    },
    enabled: on,
    staleTime: 10 * 60 * 1000,
  });

  return useMemo(() => {
    const rows = (partial.data ?? []).filter(row => peerClient(row.peer_implementation, row.peer_version) === client);
    // The newest day may still be filling; use the newest with a full day of hours when there is one
    const days = [...new Set(rows.map(row => row.day_start_date ?? ''))].sort().reverse();
    const full = days.find(day => rows.some(row => row.day_start_date === day && (row.hour_count ?? 0) >= 24));
    const partialDay = full ?? days[0];
    return {
      partial: rows.filter(row => row.day_start_date === partialDay),
      partialDay,
      probes: (probes.data ?? []).filter(
        probe => peerClient(probe.meta_peer_implementation, probe.meta_peer_version) === client
      ),
      isLoading: partial.isLoading || probes.isLoading,
    };
  }, [partial.data, partial.isLoading, probes.data, probes.isLoading, client]);
}
