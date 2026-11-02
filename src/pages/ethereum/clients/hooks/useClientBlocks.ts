import { useMemo } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fctBlockGraffitiServiceList } from '@/api/sdk.gen';
import type { DimClientRelease, FctBlockGraffiti } from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { fetchAllPages } from '@/utils/api-pagination';
import { PAGE_SIZE } from '../constants';
import type { ClientLayer } from '../utils/client-share';
import { resolveBlocks, type ResolvedBlock } from '../utils/client-versions';

export interface UseClientBlocksResult {
  /** Blocks whose graffiti names the client, oldest first, with the client's release resolved */
  blocks: ResolvedBlock[];
  /** Start of the window (unix seconds, UTC midnight) */
  since: number;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Every block over the last `days` UTC days whose graffiti names the client, with its release resolved
 * against `releases`.
 */
export function useClientBlocks(
  client: string | undefined,
  layer: ClientLayer | null,
  days: number,
  releases: DimClientRelease[]
): UseClientBlocksResult {
  const { currentNetwork } = useNetwork();
  const since = useMemo(() => Math.floor(Date.now() / 1000 / 86400) * 86400 - (days - 1) * 86400, [days]);

  const query = useQuery({
    queryKey: ['client-pages', 'blocks', currentNetwork?.name, client, layer, since],
    queryFn: ({ signal }) =>
      fetchAllPages<FctBlockGraffiti>(
        fctBlockGraffitiServiceList,
        {
          query: {
            ...(layer === 'consensus' ? { consensus_client_eq: client } : { execution_client_eq: client }),
            slot_start_date_time_gte: since,
            order_by: 'slot_start_date_time asc',
            page_size: PAGE_SIZE,
          },
        },
        'fct_block_graffiti',
        signal
      ),
    enabled: !!currentNetwork && !!client && !!layer,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });

  const blocks = useMemo(
    () => (query.data && layer ? resolveBlocks(query.data, layer, releases) : []),
    [query.data, layer, releases]
  );

  return { blocks, since, isLoading: query.isLoading, error: query.error };
}
