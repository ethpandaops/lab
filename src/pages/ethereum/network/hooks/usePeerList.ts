import { useEffect } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { intPeerDailyServiceList } from '@/api/sdk.gen';
import type { IntPeerDaily } from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { useCursorPagination } from '@/pages/ethereum/validators/hooks/useCursorPagination';

/** Peers a page of the list holds */
export const PEER_PAGE_SIZE = 50;

export interface UsePeerListResult {
  peers: IntPeerDaily[];
  pageIndex: number;
  hasNextPage: boolean;
  goTo: (pageIndex: number) => void;
  isLoading: boolean;
}

/**
 * One page of the peers our sentries saw on `day` that match `filters`, by peer ID: the peers the country and network
 * counts hold. Pass a null day to skip loading.
 */
export function usePeerList(day: string | null, filters: Record<string, unknown>): UsePeerListResult {
  const { currentNetwork } = useNetwork();
  const page = useCursorPagination(JSON.stringify([currentNetwork?.name, day, filters]), PEER_PAGE_SIZE);

  const result = useQuery({
    queryKey: ['network', 'peer-list', currentNetwork?.name, day, filters, page.pageToken],
    queryFn: async ({ signal }) => {
      const { data } = await intPeerDailyServiceList({
        query: {
          day_start_date_eq: day ?? '',
          seen_by_sentry_eq: true,
          ...filters,
          order_by: 'peer_id',
          page_size: PEER_PAGE_SIZE,
          ...(page.pageToken && { page_token: page.pageToken }),
        },
        signal,
        throwOnError: true,
      });
      return { rows: data.int_peer_daily ?? [], next: data.next_page_token || undefined };
    },
    enabled: !!currentNetwork && !!day,
    placeholderData: keepPreviousData,
  });

  const next = result.data?.next;
  const { recordNextToken } = page;
  useEffect(() => {
    if (!result.isPlaceholderData && result.isSuccess) recordNextToken(next);
  }, [result.isPlaceholderData, result.isSuccess, next, recordNextToken]);

  return {
    peers: result.data?.rows ?? [],
    pageIndex: page.pageIndex,
    hasNextPage: !!next && (result.data?.rows.length ?? 0) === PEER_PAGE_SIZE,
    goTo: index => page.onPaginationChange(index, PEER_PAGE_SIZE),
    isLoading: result.isLoading,
  };
}
