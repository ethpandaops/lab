import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import {
  fctBlockGraffitiClientByEntityDailyServiceList,
  fctBlockGraffitiClientByEntityHourlyServiceList,
} from '@/api/sdk.gen';
import type { FctBlockGraffitiClientByEntityDaily, FctBlockGraffitiClientByEntityHourly } from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { fetchAllPages } from '@/utils/api-pagination';
import { UNKNOWN_CLIENT } from '@/utils/graffiti';

import { addDays, dayOf, daysBack } from '../utils/overview';

/** Windows longer than this match every day instead of listing them, to keep the URL short */
const MAX_LISTED_DAYS = 400;
/**
 * Ranges shorter than this (a week, plus slack for `from` being hour aligned) read hourly rows; daily rows would
 * overshoot a short range by up to a day
 */
const MAX_HOURLY_SECONDS = 8 * 86_400;

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

type BlockRow = FctBlockGraffitiClientByEntityDaily | FctBlockGraffitiClientByEntityHourly;

/**
 * Blocks each of `entities` proposed since `from` (Unix seconds; null for genesis), split by the clients their
 * graffiti names. Ranges up to a week read hourly rows from `from`; longer ones read the days after `firstDay` up
 * to `latestDay`, one per day of the range.
 */
export function useEntityBlocks(
  entities: string[],
  from: number | null,
  firstDay: string | undefined,
  latestDay: string | undefined
): UseEntityBlocksResult {
  const { currentNetwork } = useNetwork();
  const hourly = from !== null && Date.now() / 1000 - from < MAX_HOURLY_SECONDS;
  // `firstDay` is the stake snapshot the range starts from, so its blocks fall before the range, unless the range
  // reaches back past genesis
  const firstBlockDay = firstDay && from !== null && dayOf(from) >= firstDay ? addDays(firstDay, 1) : firstDay;
  const days = !hourly && firstBlockDay && latestDay ? daysBack(firstBlockDay, latestDay, 1) : [];
  const dayFilter =
    days.length > MAX_LISTED_DAYS ? { day_start_date_like: '20%' } : { day_start_date_in_values: days.join(',') };

  const query = useQuery({
    queryKey: ['entities', 'blocks', currentNetwork?.name, entities.join(','), hourly ? from : days.join(',')],
    queryFn: ({ signal }): Promise<BlockRow[]> =>
      hourly
        ? fetchAllPages<FctBlockGraffitiClientByEntityHourly>(
            fctBlockGraffitiClientByEntityHourlyServiceList,
            { query: { hour_start_date_time_gte: from!, entity_in_values: entities.join(','), page_size: 10_000 } },
            'fct_block_graffiti_client_by_entity_hourly',
            signal
          )
        : fetchAllPages<FctBlockGraffitiClientByEntityDaily>(
            fctBlockGraffitiClientByEntityDailyServiceList,
            { query: { ...dayFilter, entity_in_values: entities.join(','), page_size: 10_000 } },
            'fct_block_graffiti_client_by_entity_daily',
            signal
          ),
    enabled: (hourly || days.length > 0) && entities.length > 0,
  });

  // Memoised so consumers get stable references between renders
  const entityKey = entities.join(',');
  const result = useMemo(() => {
    const byEntity = new Map<string, EntityBlocks>(
      entityKey.split(',').map(entity => [entity, { entity, blocks: 0, consensus: {}, execution: {} }])
    );
    for (const row of query.data ?? []) {
      const item = byEntity.get(row.entity ?? '');
      if (!item) continue;
      if (!hourly) {
        const day = (row as FctBlockGraffitiClientByEntityDaily).day_start_date ?? '';
        // The match-all filter returns days before the window too
        if (!firstBlockDay || !latestDay || day < firstBlockDay || day > latestDay) continue;
      }
      const count = row.block_count ?? 0;
      const cl = row.consensus_client || UNKNOWN_CLIENT;
      const el = row.execution_client || UNKNOWN_CLIENT;
      item.blocks += count;
      item.consensus[cl] = (item.consensus[cl] ?? 0) + count;
      item.execution[el] = (item.execution[el] ?? 0) + count;
    }
    return [...byEntity.values()];
  }, [query.data, entityKey, hourly, firstBlockDay, latestDay]);

  return {
    entities: result,
    isLoading: query.isLoading,
    error: (query.error ?? null) as Error | null,
  };
}
