import type { JSX } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import clsx from 'clsx';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import { fctBlockFastConfirmationByNodeServiceListOptions } from '@/api/@tanstack/react-query.gen';
import { formatEpoch, formatSlot } from '@/utils';
import {
  type FieldEpoch,
  EPOCH_SECONDS,
  formatDurationMs,
  summarizeSlots,
  tierForMs,
} from '../../fast-confirmation.utils';
import { toObservation } from '../../fast-confirmation.api';

export interface EpochDetailProps {
  epoch: FieldEpoch;
}

const TIER_CLASS = {
  ok: 'bg-success/20',
  late: 'bg-warning/50',
  slow: 'bg-warning/90',
  stalled: 'bg-danger/60',
  held: 'bg-danger',
  none: 'bg-transparent',
} as const;

/**
 * The 32 slots of one epoch, one row per consensus client, each cell showing how long
 * that client took to fast confirm the block.
 */
export function EpochDetail({ epoch }: EpochDetailProps): JSX.Element {
  const query = useQuery({
    ...fctBlockFastConfirmationByNodeServiceListOptions({
      query: {
        slot_start_date_time_gte: epoch.startTime,
        slot_start_date_time_lt: epoch.startTime + EPOCH_SECONDS,
        page_size: 1000,
      },
    }),
  });

  const slots = summarizeSlots((query.data?.fct_block_fast_confirmation_by_node ?? []).map(toObservation));
  const bySlot = new Map(slots.map(s => [s.slot, s]));
  const clients = [...new Set(slots.flatMap(s => s.byClient.map(c => c.client)))].sort();
  const firstSlot = epoch.epoch * 32;
  const finalized = slots.map(s => s.finalizedMs).filter((v): v is number => v !== null);

  return (
    <div className="flex flex-col gap-3 rounded-sm border border-border bg-background/50 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-sm text-foreground">
          <span className="font-semibold">Epoch {formatEpoch(epoch.epoch)}</span>
          <span className="text-muted"> {new Date(epoch.startTime * 1000).toUTCString().slice(5, 22)} UTC</span>
        </div>
        <div className="text-xs text-muted">
          {finalized.length > 0 && (
            <>
              Finalized {formatDurationMs(Math.min(...finalized))} to {formatDurationMs(Math.max(...finalized))} after
              each slot
            </>
          )}
        </div>
      </div>

      {query.isLoading && <div className="h-24 animate-pulse rounded-sm bg-border/40" />}

      {!query.isLoading && (
        <div className="grid grid-cols-[6rem_1fr] items-center gap-x-3 gap-y-1.5">
          <span />
          <div className="grid grid-cols-32 gap-0.5">
            {Array.from({ length: 32 }, (_, i) => (
              <Link
                key={i}
                to="/ethereum/slots/$slot"
                params={{ slot: String(firstSlot + i) }}
                className="text-center text-xs text-muted tabular-nums hover:text-foreground"
                title={`Slot ${formatSlot(firstSlot + i)}`}
              >
                {i}
              </Link>
            ))}
          </div>
          {clients.map(client => (
            <div key={client} className="contents">
              <span className="flex items-center gap-2 text-xs text-foreground capitalize">
                <ClientLogo client={client} size={16} />
                {client}
              </span>
              <div className="grid grid-cols-32 gap-0.5">
                {Array.from({ length: 32 }, (_, i) => {
                  const slot = bySlot.get(firstSlot + i);
                  const entry = slot?.byClient.find(c => c.client === client);
                  if (!slot) {
                    return (
                      <div key={i} className="h-6 rounded-xs border border-dashed border-border" title="No block" />
                    );
                  }
                  if (!entry) return <div key={i} className="h-6" />;
                  const tier =
                    entry.fastConfirmedMs === null
                      ? 'held'
                      : entry.fastConfirmedMs < 13_000
                        ? 'ok'
                        : tierForMs(entry.fastConfirmedMs);
                  return (
                    <div
                      key={i}
                      className={clsx('h-6 rounded-xs', TIER_CLASS[tier])}
                      title={`Slot ${formatSlot(slot.slot)}: ${entry.fastConfirmedMs === null ? 'not confirmed' : formatDurationMs(entry.fastConfirmedMs)}${entry.confirmationType === 'descendant' ? ' (via a later block)' : ''}`}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
