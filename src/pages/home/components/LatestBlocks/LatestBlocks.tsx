import { type JSX, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import clsx from 'clsx';
import { fctBlockHeadServiceList, fctBlockMevHeadServiceList, fctBlockProposerEntityServiceList } from '@/api/sdk.gen';
import { Card } from '@/components/Layout/Card';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { NetworkIcon } from '@/components/Ethereum/NetworkIcon';
import { useNetwork } from '@/hooks/useNetwork';
import { SECONDS_PER_SLOT } from '@/utils/beacon';
import { getNetworkShortLabel } from '@/utils/networks';

/** Blocks shown */
const FEED_SIZE = 12;

interface FeedBlock {
  slot: number;
  slotTime: number;
  entity?: string;
  proposerIndex?: number;
  /** Relays that delivered the block; empty when locally built */
  relays?: string[];
  /** MEV value paid to the proposer, in ETH */
  mevEth?: number;
  transactions?: number;
  gasUsed?: number;
  gasLimit?: number;
  blobGasUsed?: number;
}

/** Blob gas per blob (EIP-4844) */
const GAS_PER_BLOB = 131072;

/** "12s", "4m", "2h" */
function ago(seconds: number): string {
  if (seconds < 60) return `${Math.max(0, Math.round(seconds))}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h`;
}

export interface LatestBlocksProps {
  /** Current unix time, ticking every second */
  now: number;
}

/**
 * The newest blocks on the selected network, refreshed every slot: proposer, how the block was
 * built (relay and MEV value, or local), transactions, blobs and gas. Rows open the slot.
 */
export function LatestBlocks({ now }: LatestBlocksProps): JSX.Element {
  const { currentNetwork } = useNetwork();
  const navigate = useNavigate();
  const network = currentNetwork?.name;

  const query = useQuery({
    queryKey: ['home', 'latest-blocks', network],
    enabled: !!network,
    refetchInterval: SECONDS_PER_SLOT * 1000,
    queryFn: async ({ signal }): Promise<FeedBlock[]> => {
      const since = Math.floor(Date.now() / 1000) - 30 * 60;
      const common = { slot_start_date_time_gte: since, order_by: 'slot_start_date_time desc', page_size: FEED_SIZE };
      const [heads, entities, mev] = await Promise.all([
        fctBlockHeadServiceList({ query: common, signal, throwOnError: true }),
        fctBlockProposerEntityServiceList({ query: common, signal }).catch(() => undefined),
        fctBlockMevHeadServiceList({ query: { ...common, page_size: FEED_SIZE * 2 }, signal }).catch(() => undefined),
      ]);
      const entityBySlot = new Map(
        (entities?.data?.fct_block_proposer_entity ?? []).map(row => [row.slot, row.entity])
      );
      const mevBySlot = new Map((mev?.data?.fct_block_mev_head ?? []).map(row => [row.slot, row]));
      // The MEV table lags the head; a slot newer than its newest row is unknown, not locally built
      const mevNewestSlot = Math.max(-1, ...(mev?.data?.fct_block_mev_head ?? []).map(row => row.slot ?? -1));
      return (heads.data?.fct_block_head ?? []).map(head => {
        const bid = mevBySlot.get(head.slot);
        return {
          slot: head.slot ?? 0,
          slotTime: head.slot_start_date_time ?? 0,
          entity: entityBySlot.get(head.slot) ?? undefined,
          proposerIndex: head.proposer_index ?? undefined,
          relays: bid ? (bid.relay_names ?? []) : (head.slot ?? 0) < mevNewestSlot ? [] : undefined,
          mevEth: bid?.value ? Number(bid.value) / 1e18 : undefined,
          transactions: head.execution_payload_transactions_count ?? undefined,
          gasUsed: head.execution_payload_gas_used ?? undefined,
          gasLimit: head.execution_payload_gas_limit ?? undefined,
          blobGasUsed: head.execution_payload_blob_gas_used ?? undefined,
        };
      });
    },
  });

  const blocks = useMemo(() => query.data ?? [], [query.data]);
  const newest = blocks[0]?.slot;

  return (
    <Card
      title={
        <span className="inline-flex items-center gap-2">
          Latest blocks
          {currentNetwork && (
            <span className="inline-flex items-center gap-1 text-xs font-normal text-muted">
              <NetworkIcon networkName={currentNetwork.name} className="size-3.5" />
              {getNetworkShortLabel(currentNetwork)}
            </span>
          )}
        </span>
      }
    >
      {query.isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <LoadingContainer key={i} className="h-7 w-full" />
          ))}
        </div>
      ) : query.error ? (
        <p className="text-sm text-muted">Blocks are unavailable right now.</p>
      ) : blocks.length === 0 ? (
        <p className="text-sm text-muted">No blocks indexed in the last 30 minutes.</p>
      ) : (
        <div className="-mx-(--card-inset) -my-(--card-inset-y)">
          <div
            aria-hidden="true"
            className="hidden grid-cols-[5.5rem_minmax(0,1.2fr)_minmax(0,1fr)_7rem_3.5rem_3rem_7rem_3rem] gap-x-4 border-b border-border px-(--card-inset) py-2 text-xs font-medium text-muted sm:grid"
          >
            <span>Slot</span>
            <span>Proposer</span>
            <span>Relay</span>
            <span className="text-right">MEV value</span>
            <span className="text-right">Txs</span>
            <span className="text-right">Blobs</span>
            <span>Gas</span>
            <span className="text-right">Age</span>
          </div>
          <ul className="divide-y divide-border">
            {blocks.map(block => {
              const gasShare = block.gasUsed && block.gasLimit ? block.gasUsed / block.gasLimit : null;
              const blobs = block.blobGasUsed !== undefined ? Math.round(block.blobGasUsed / GAS_PER_BLOB) : null;
              return (
                <li key={block.slot}>
                  <button
                    type="button"
                    onClick={() => navigate({ to: '/ethereum/slots/$slot', params: { slot: String(block.slot) } })}
                    className={clsx(
                      'grid w-full grid-cols-[5.5rem_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-(--card-inset) py-2.5 text-left text-sm transition-colors hover:bg-foreground/[0.03] sm:grid-cols-[5.5rem_minmax(0,1.2fr)_minmax(0,1fr)_7rem_3.5rem_3rem_7rem_3rem]',
                      block.slot === newest && 'bg-primary/[0.04]'
                    )}
                  >
                    <span className="font-medium text-foreground tabular-nums">{block.slot}</span>
                    <span className="truncate text-foreground">
                      {block.entity ?? (block.proposerIndex !== undefined ? `Validator ${block.proposerIndex}` : '–')}
                    </span>
                    <span className="hidden truncate text-muted sm:inline" title={block.relays?.join(', ')}>
                      {block.relays === undefined ? '–' : block.relays.length === 0 ? 'Local' : block.relays.join(', ')}
                    </span>
                    <span className="hidden text-right text-foreground tabular-nums sm:inline">
                      {block.mevEth === undefined ? (
                        <span className="text-muted">–</span>
                      ) : (
                        `${block.mevEth.toFixed(4)} ETH`
                      )}
                    </span>
                    <span className="hidden text-right text-muted tabular-nums sm:inline" title="Transactions">
                      {block.transactions ?? '–'}
                    </span>
                    <span className="hidden text-right text-muted tabular-nums sm:inline" title="Blobs">
                      {blobs ?? '–'}
                    </span>
                    <span className="hidden items-center gap-2 sm:flex" title="Gas used of the block's gas limit">
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                        <span
                          className="block h-full rounded-full bg-muted"
                          style={{ width: `${Math.round((gasShare ?? 0) * 100)}%` }}
                        />
                      </span>
                      <span className="w-8 text-right text-xs text-muted tabular-nums">
                        {gasShare === null ? '–' : `${Math.round(gasShare * 100)}%`}
                      </span>
                    </span>
                    <span className="text-right text-xs text-muted tabular-nums">{ago(now - block.slotTime)}</span>
                    <span className="col-span-3 flex gap-3 text-xs text-muted sm:hidden">
                      {block.mevEth !== undefined && <span>{block.mevEth.toFixed(4)} ETH</span>}
                      {block.transactions !== undefined && (
                        <span>{block.transactions === 1 ? '1 tx' : `${block.transactions} txs`}</span>
                      )}
                      {blobs !== null && <span>{blobs === 1 ? '1 blob' : `${blobs} blobs`}</span>}
                      {gasShare !== null && <span>{Math.round(gasShare * 100)}% gas</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Card>
  );
}
