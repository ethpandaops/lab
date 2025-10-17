import { type JSX } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fctBlockServiceListOptions } from '@/api/@tanstack/react-query.gen';
import { useTableBounds } from '@/hooks/useBounds';

export function BlockList(): JSX.Element {
  const { data: blockBounds } = useTableBounds('fct_block');

  const { data, error, isLoading } = useQuery({
    ...fctBlockServiceListOptions({
      query: {
        slot_start_date_time_gt: blockBounds ? blockBounds.max - 12 * 100 : 0,
        page_size: 10,
        order_by: 'slot_start_date_time DESC',
      },
    }),
    enabled: !!blockBounds,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-slate-400">Loading blocks...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-900/20 p-4">
        <p className="text-sm/6 text-red-200">Error: {error.message}</p>
      </div>
    );
  }

  if (!data || !data.fct_block || data.fct_block.length === 0) {
    return (
      <div className="rounded-lg bg-slate-800/50 p-8 text-center">
        <p className="text-slate-400">No blocks found</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h2 className="mb-6 text-2xl/8 font-bold text-slate-100">Recent Blocks</h2>
      <div className="flex flex-col gap-3">
        {data.fct_block.map(block => (
          <div
            key={block.slot}
            className="flex flex-col gap-2 rounded-lg bg-slate-800/50 p-6 shadow-sm outline-1 -outline-offset-1 outline-slate-600/50 backdrop-blur-sm transition-all hover:bg-slate-800/70 hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex flex-col gap-1">
              <div className="text-xs/5 font-semibold tracking-wide text-slate-400 uppercase">Slot</div>
              <div className="text-lg/7 font-bold text-slate-100">{block.slot}</div>
            </div>
            <div className="flex flex-col gap-1 sm:flex-1 sm:text-right">
              <div className="text-xs/5 font-semibold tracking-wide text-slate-400 uppercase">Block Root</div>
              <div className="font-mono text-sm/6 text-slate-300">{block.block_root}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
