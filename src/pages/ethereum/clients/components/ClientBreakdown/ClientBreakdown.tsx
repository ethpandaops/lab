import type { JSX } from 'react';
import clsx from 'clsx';
import { Card } from '@/components/Layout/Card';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import { getClientColor } from '@/utils/ethereum';
import { UNKNOWN_CLIENT } from '../../constants';
import { formatClientName, type ClientSummary } from '../../utils/client-share';

export interface ClientBreakdownProps {
  /** Card title */
  title: string;
  /** Per-client totals, unknown last */
  summaries: ClientSummary[];
  /** Show shares of identified blocks instead of all blocks */
  identifiedOnly: boolean;
  /** Client the page is filtered by */
  selectedClient?: string;
  /** Called with a client to filter the page by, or undefined to clear */
  onSelect: (client: string | undefined) => void;
}

/** Ranked clients with share bars; rows filter the page and unknown keeps its own row. */
export function ClientBreakdown({
  title,
  summaries,
  identifiedOnly,
  selectedClient,
  onSelect,
}: ClientBreakdownProps): JSX.Element {
  return (
    <Card rounded title={title}>
      {summaries.length === 0 ? (
        <p className="text-sm text-muted">No blocks in this window.</p>
      ) : (
        <ul className="-mx-2 flex flex-col gap-0.5">
          {summaries.map((summary, index) => {
            const isUnknown = summary.client === UNKNOWN_CLIENT;
            const share = identifiedOnly ? summary.identifiedShare : summary.share;
            const isSelected = selectedClient === summary.client;
            return (
              <li key={summary.client}>
                <button
                  type="button"
                  onClick={() => onSelect(isSelected ? undefined : summary.client)}
                  aria-pressed={isSelected}
                  className={clsx(
                    'flex w-full items-center gap-3 rounded-sm px-2 py-1.5 text-left transition-colors hover:bg-primary/10',
                    isSelected && 'bg-primary/10 ring-1 ring-primary/30'
                  )}
                >
                  <ClientLogo client={summary.client} size={20} />
                  <span
                    className={clsx(
                      'w-28 shrink-0 truncate text-sm/6 font-medium',
                      isUnknown ? 'text-muted' : 'text-foreground'
                    )}
                  >
                    {formatClientName(summary.client)}
                  </span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-border/50">
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${share ?? summary.share}%`,
                        backgroundColor: getClientColor(summary.client, index),
                        opacity: isUnknown || share === null ? 0.5 : 1,
                      }}
                    />
                  </span>
                  <span className="w-14 shrink-0 text-right text-sm/6 font-medium text-foreground tabular-nums">
                    {share === null ? '-' : `${share.toFixed(1)}%`}
                  </span>
                  <span className="hidden w-16 shrink-0 text-right text-xs/6 text-muted tabular-nums sm:block">
                    {summary.blocks.toLocaleString()}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
