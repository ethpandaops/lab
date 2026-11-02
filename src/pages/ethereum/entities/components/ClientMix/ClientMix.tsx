import { useState, type JSX } from 'react';

import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import { Entity } from '@/components/Ethereum/Entity';
import { SegmentedControl } from '@/components/Forms/SegmentedControl';
import { Card } from '@/components/Layout/Card';
import { getConsensusClientColor, getExecutionClientColor } from '@/utils/ethereum';
import { formatClientName, UNKNOWN_CLIENT } from '@/utils/graffiti';

import type { EntityBlocks } from '../../hooks';

type Layer = 'consensus' | 'execution';

export interface ClientMixProps {
  /** Entities in display order */
  entities: EntityBlocks[];
}

/**
 * The clients each entity runs, as a share of the blocks it proposed.
 */
export function ClientMix({ entities }: ClientMixProps): JSX.Element {
  const [layer, setLayer] = useState<Layer>('consensus');
  const colorOf = layer === 'consensus' ? getConsensusClientColor : getExecutionClientColor;

  const shown = entities.filter(e => e.blocks > 0);
  const totals = new Map<string, number>();
  for (const e of shown) {
    for (const [client, n] of Object.entries(e[layer])) totals.set(client, (totals.get(client) ?? 0) + n);
  }
  // Largest first, unidentified blocks last
  const clients = [...totals.keys()].sort((a, b) =>
    a === UNKNOWN_CLIENT ? 1 : b === UNKNOWN_CLIENT ? -1 : (totals.get(b) ?? 0) - (totals.get(a) ?? 0)
  );

  return (
    <Card
      title="Proposer clients by entity"
      actions={
        <SegmentedControl
          options={[
            { value: 'consensus', label: 'Consensus' },
            { value: 'execution', label: 'Execution' },
          ]}
          value={layer}
          onChange={setLayer}
          ariaLabel="Client layer"
        />
      }
    >
      {shown.length === 0 ? (
        <p className="text-sm text-muted">No blocks in this window.</p>
      ) : (
        <div className="flex flex-col gap-4">
          <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
            {clients.map((client, i) => (
              <li key={client} className="flex items-center gap-1.5 text-xs/5 text-muted">
                {client === UNKNOWN_CLIENT ? (
                  <span className="size-3 rounded-xs" style={{ backgroundColor: colorOf(client, i) }} />
                ) : (
                  <ClientLogo client={client} size={16} />
                )}
                {formatClientName(client)}
              </li>
            ))}
          </ul>

          <table className="w-full text-sm/6">
            <thead>
              <tr className="text-left text-xs/5 text-muted">
                <th className="w-48 pb-1 font-normal">Entity</th>
                <th className="pb-1 font-normal">Share of blocks</th>
                <th className="w-20 pb-1 text-right font-normal">Blocks</th>
              </tr>
            </thead>
            <tbody>
              {shown.map(e => (
                <tr key={e.entity}>
                  <td className="max-w-48 truncate py-1 pr-3">
                    <Entity entity={e.entity} className="text-foreground" />
                  </td>
                  <td className="py-1">
                    <div className="flex h-3 overflow-hidden rounded-xs bg-border/50">
                      {clients.map((client, i) => {
                        const n = e[layer][client] ?? 0;
                        if (!n) return null;
                        const share = (n / e.blocks) * 100;
                        return (
                          <span
                            key={client}
                            title={`${formatClientName(client)}: ${share.toFixed(1)}%`}
                            className="h-full"
                            style={{
                              width: `${share}%`,
                              backgroundColor: colorOf(client, i),
                              opacity: client === UNKNOWN_CLIENT ? 0.5 : 1,
                            }}
                          />
                        );
                      })}
                    </div>
                  </td>
                  <td className="py-1 pl-3 text-right text-foreground tabular-nums">{e.blocks.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
