import type { JSX } from 'react';
import clsx from 'clsx';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import { type ClientSummary, formatDurationMs } from '../../fast-confirmation.utils';

export interface ClientTableProps {
  clients: ClientSummary[];
  selected: string;
  onSelect: (client: string) => void;
}

/**
 * One row per consensus client running the fast confirmation rule, over its whole history.
 */
export function ClientTable({ clients, selected, onSelect }: ClientTableProps): JSX.Element {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted">
            <th className="py-2 pr-4 font-medium">Client</th>
            <th className="py-2 pr-4 font-medium">Reporting since</th>
            <th className="py-2 pr-4 text-right font-medium">Blocks</th>
            <th className="py-2 pr-4 text-right font-medium">Fast confirmed</th>
            <th className="py-2 pr-4 text-right font-medium">Finalized</th>
            <th className="py-2 pr-4 text-right font-medium">Sooner</th>
            <th className="py-2 pr-4 text-right font-medium">Confirmed directly</th>
            <th className="py-2 text-right font-medium">Reverted</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {clients.map(c => (
            <tr
              key={c.client}
              onClick={() => onSelect(c.client)}
              className={clsx(
                'cursor-pointer transition-colors hover:bg-primary/5',
                selected === c.client && 'bg-primary/10'
              )}
            >
              <td className="py-2 pr-4">
                <span className="flex items-center gap-2 text-foreground capitalize">
                  <ClientLogo client={c.client} size={18} />
                  {c.client}
                </span>
              </td>
              <td className="py-2 pr-4 text-muted tabular-nums">{c.since}</td>
              <td className="py-2 pr-4 text-right text-foreground tabular-nums">{c.blocks.toLocaleString()}</td>
              <td className="py-2 pr-4 text-right text-success tabular-nums">{formatDurationMs(c.fastMs)}</td>
              <td className="py-2 pr-4 text-right text-foreground tabular-nums">{formatDurationMs(c.finalityMs)}</td>
              <td className="py-2 pr-4 text-right text-foreground tabular-nums">{Math.round(c.speedup)}×</td>
              <td className="py-2 pr-4 text-right text-foreground tabular-nums">{(c.directShare * 100).toFixed(2)}%</td>
              <td className={clsx('py-2 text-right tabular-nums', c.reverted ? 'text-danger' : 'text-success')}>
                {c.reverted}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
