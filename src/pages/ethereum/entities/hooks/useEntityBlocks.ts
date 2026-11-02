import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { fctBlockGraffitiClientByEntityDailyServiceList } from '@/api/sdk.gen';
import type { FctBlockGraffitiClientByEntityDaily } from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { fetchAllPages } from '@/utils/api-pagination';
import { UNKNOWN_CLIENT } from '@/utils/graffiti';

import { daysBack } from '../utils/overview';

/** Windows longer than this match every day instead of listing them, to keep the URL short */
const MAX_LISTED_DAYS = 400;

export interface EntityBlocks {
  entity: string;
  blocks: number;
  /** Blocks per consensus client, from graffiti; unidentified blocks count under "unknown" */
  consensus: Record<string, number>;
  /** Blocks per execution client, from graffiti; unidentified blocks count under "unknown" */
  execution: Record<string, number>;
}

export interface UseEntityBlocksResult {
  /** Blocks per requested entity over the window, in the order requested */
  entities: EntityBlocks[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * Blocks each of `entities` proposed from `firstDay` to `latestDay`, split by the clients their graffiti names.
 */
export function useEntityBlocks(
  entities: string[],
  firstDay: string | undefined,
  latestDay: string | undefined
): UseEntityBlocksResult {
  const { currentNetwork } = useNetwork();
  const days = firstDay && latestDay ? daysBack(firstDay, latestDay, 1) : [];
  const dayFilter =
    days.length > MAX_LISTED_DAYS ? { day_start_date_like: '20%' } : { day_start_date_in_values: days.join(',') };

  const query = useQuery({
    queryKey: ['entities', 'blocks', currentNetwork?.name, entities.join(','), firstDay, latestDay],
    queryFn: ({ signal }) =>
      fetchAllPages<FctBlockGraffitiClientByEntityDaily>(
        fctBlockGraffitiClientByEntityDailyServiceList,
        { query: { ...dayFilter, entity_in_values: entities.join(','), page_size: 10_000 } },
        'fct_block_graffiti_client_by_entity_daily',
        signal
      ),
    enabled: days.length > 0 && entities.length > 0,
  });

  // Memoised so consumers get stable references between renders
  const entityKey = entities.join(',');
  const result = useMemo(() => {
    const byEntity = new Map<string, EntityBlocks>(
      entityKey.split(',').map(entity => [entity, { entity, blocks: 0, consensus: {}, execution: {} }])
    );
    for (const row of query.data ?? []) {
      const item = byEntity.get(row.entity ?? '');
      const day = row.day_start_date ?? '';
      // The match-all filter returns days before the window too
      if (!item || !firstDay || !latestDay || day < firstDay || day > latestDay) continue;
      const count = row.block_count ?? 0;
      const cl = row.consensus_client || UNKNOWN_CLIENT;
      const el = row.execution_client || UNKNOWN_CLIENT;
      item.blocks += count;
      item.consensus[cl] = (item.consensus[cl] ?? 0) + count;
      item.execution[el] = (item.execution[el] ?? 0) + count;
    }
    return [...byEntity.values()];
  }, [query.data, entityKey, firstDay, latestDay]);

  return {
    entities: result,
    isLoading: query.isLoading,
    error: (query.error ?? null) as Error | null,
  };
}
