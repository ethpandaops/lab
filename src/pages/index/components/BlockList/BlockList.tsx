import { type JSX } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fctBlockServiceListOptions } from '@/api/@tanstack/react-query.gen';

export function BlockList(): JSX.Element {
  const { data, error, isLoading } = useQuery(
    fctBlockServiceListOptions({
      query: {
        slot_gt: 1000000,
        page_size: 10,
      },
    })
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500 dark:text-gray-400">Loading blocks...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
        <p className="text-sm/6 text-red-800 dark:text-red-200">Error: {error.message}</p>
      </div>
    );
  }

  if (!data || !data.fct_block || data.fct_block.length === 0) {
    return (
      <div className="rounded-lg bg-gray-50 p-8 text-center dark:bg-gray-800/50">
        <p className="text-gray-500 dark:text-gray-400">No blocks found</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h2 className="mb-6 text-2xl/8 font-bold text-gray-900 dark:text-white">Blocks</h2>
      <div className="flex flex-col gap-3">
        {data.fct_block.map(block => (
          <div
            key={block.slot}
            className="flex flex-col gap-2 rounded-lg bg-white p-6 shadow-sm outline outline-black/5 transition-shadow hover:shadow-md dark:bg-gray-800 dark:shadow-none dark:-outline-offset-1 dark:outline-white/10 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex flex-col gap-1">
              <div className="text-xs/5 font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Slot
              </div>
              <div className="text-lg/7 font-bold text-gray-900 dark:text-white">{block.slot}</div>
            </div>
            <div className="flex flex-col gap-1 sm:flex-1 sm:text-right">
              <div className="text-xs/5 font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Block Root
              </div>
              <div className="font-mono text-sm/6 text-gray-700 dark:text-gray-300">{block.block_root}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
