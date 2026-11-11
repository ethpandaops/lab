import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fctPeerPartialMessageSupportByClientDailyServiceList } from '@/api/sdk.gen';
import type { FctPeerPartialMessageSupportByClientDaily } from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { fetchAllPages } from '@/utils/api-pagination';
import { PAGE_SIZE } from '@/pages/ethereum/clients/constants';
import { completeUtcDays } from '@/utils/time';
import { peerClient } from '@/pages/ethereum/clients/utils/client-versions';

export interface UsePeerSupportResult {
  /** Latest full day of partial-column support for the client's peers, one row per version */
  partial: FctPeerPartialMessageSupportByClientDaily[];
  partialDay?: string;
  isLoading: boolean;
}

/**
 * What our sentries see of a consensus client's peers: partial-column support.
 */
export function usePeerSupport(client: string | undefined, enabled: boolean): UsePeerSupportResult {
  const { currentNetwork } = useNetwork();
  const dates = useMemo(() => completeUtcDays(3).join(','), []);
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

  return useMemo(() => {
    const rows = (partial.data ?? []).filter(row => peerClient(row.peer_implementation, row.peer_version) === client);
    // The newest day may still be filling; use the newest with a full day of hours when there is one
    const days = [...new Set(rows.map(row => row.day_start_date ?? ''))].sort().reverse();
    const full = days.find(day => rows.some(row => row.day_start_date === day && (row.hour_count ?? 0) >= 24));
    const partialDay = full ?? days[0];
    return {
      partial: rows.filter(row => row.day_start_date === partialDay),
      partialDay,
      isLoading: partial.isLoading,
    };
  }, [partial.data, partial.isLoading, client]);
}
