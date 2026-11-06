import { useQuery } from '@tanstack/react-query';
import { intExecutionBlockByDateServiceList } from '@/api/sdk.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { SECONDS_PER_SLOT, timestampToSlot } from '@/utils/beacon';

/** Share of slots that may have no block, used to widen the window the block's time is looked for in */
const MISSED_SLOT_MARGIN = 0.1;

/** `block_date_time` is in microseconds */
const MICROS = 1_000_000;

/**
 * Beacon slot of an execution block, for linking to its slot page. Blocks sit at most one per slot, so the block's
 * time lies within a window counted back from the latest block; the lookup reads only that window of
 * `int_execution_block_by_date`. Undefined until found, or when the block is not canonical yet.
 */
export function useBlockSlot(blockNumber: number | null): number | undefined {
  const { currentNetwork } = useNetwork();
  const genesisTime = currentNetwork?.genesis_time;

  const { data } = useQuery({
    queryKey: ['gas-profiler', 'block-slot', currentNetwork?.name, blockNumber],
    queryFn: async ({ signal }): Promise<number | null> => {
      const now = Math.floor(Date.now() / 1000);
      const latest = await intExecutionBlockByDateServiceList({
        query: { block_date_time_gte: (now - 6 * 3600) * MICROS, order_by: 'block_date_time desc', page_size: 1 },
        signal,
        throwOnError: true,
      });
      const head = latest.data.int_execution_block_by_date?.[0];
      if (head?.block_number === undefined || head.block_date_time === undefined) return null;
      const behind = head.block_number - blockNumber!;
      if (behind < 0) return null;
      const headTime = Math.floor(head.block_date_time / MICROS);
      const latestTime = headTime - behind * SECONDS_PER_SLOT;
      const earliestTime = headTime - Math.ceil(behind * SECONDS_PER_SLOT * (1 + MISSED_SLOT_MARGIN)) - 60;
      const match = await intExecutionBlockByDateServiceList({
        query: {
          block_date_time_gte: earliestTime * MICROS,
          block_date_time_lte: latestTime * MICROS,
          block_number_eq: blockNumber!,
          page_size: 1,
        },
        signal,
        throwOnError: true,
      });
      const time = match.data.int_execution_block_by_date?.[0]?.block_date_time;
      return time === undefined ? null : timestampToSlot(Math.floor(time / MICROS), genesisTime!);
    },
    enabled: blockNumber !== null && genesisTime !== undefined,
    staleTime: Infinity,
  });

  return data ?? undefined;
}
