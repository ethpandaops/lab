import type { JSX } from 'react';
import { Link } from '@tanstack/react-router';
import { Card } from '@/components/Layout/Card';
import { Table } from '@/components/Lists/Table';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import { formatClientName } from '@/utils/graffiti';
import { CONSENSUS_CLIENTS } from '@/utils/ethereum';
import type { FctPeerCountByClClientDaily } from '@/pages/ethereum/clients/api/client-models';
import { formatDataDate } from '@/pages/ethereum/clients/utils/client-versions';
import { dayStart, formatShare } from '../../utils/network-census';

/** One client's peers and how they connect */
interface ReachRow {
  client: string;
  peers: number;
  dialled: number;
  quic: number;
}

export interface ReachabilityCardProps {
  /** Consensus peer rows of one day */
  rows: FctPeerCountByClClientDaily[];
  day: string | null;
}

/**
 * How each consensus client's peers connect: whether a sentry dialled them and they answered, and whether they
 * listen on QUIC. Agents that are not consensus clients sum as Other.
 */
export function ReachabilityCard({ rows, day }: ReachabilityCardProps): JSX.Element {
  const known: readonly string[] = CONSENSUS_CLIENTS;
  const byClient = new Map<string, ReachRow>();
  for (const row of rows) {
    const client = row.client && known.includes(row.client) ? row.client : 'other';
    const entry = byClient.get(client) ?? { client, peers: 0, dialled: 0, quic: 0 };
    entry.peers += row.peer_count ?? 0;
    entry.dialled += row.dialled_peer_count ?? 0;
    entry.quic += row.quic_listen_peer_count ?? 0;
    byClient.set(client, entry);
  }
  const data = [...byClient.values()]
    .filter(row => row.peers > 0)
    .sort((a, b) => Number(a.client === 'other') - Number(b.client === 'other') || b.peers - a.peers);

  return (
    <Card rounded title="By client" subtitle={day ? `Consensus peers on ${formatDataDate(dayStart(day))}` : undefined}>
      <Table
        variant="nested"
        data={data}
        getRowKey={row => row.client}
        columns={[
          {
            header: 'Client',
            accessor: row =>
              row.client === 'other' ? (
                <span className="pl-7 text-muted">Other</span>
              ) : (
                <Link
                  to="/ethereum/clients/$client"
                  params={{ client: row.client }}
                  search={{ tab: 'network' }}
                  className="inline-flex items-center gap-2 font-medium text-foreground hover:text-primary"
                >
                  <ClientLogo client={row.client} size={20} noLink decorative />
                  {formatClientName(row.client)}
                </Link>
              ),
          },
          {
            header: 'Peers',
            accessor: row => row.peers.toLocaleString(),
            cellClassName: 'text-right tabular-nums text-muted',
            headerClassName: 'text-right',
          },
          {
            header: 'Dialled',
            accessor: row => formatShare(row.dialled, row.peers),
            cellClassName: 'text-right tabular-nums font-medium text-foreground',
            headerClassName: 'text-right',
          },
          {
            header: 'QUIC',
            accessor: row => formatShare(row.quic, row.peers),
            cellClassName: 'text-right tabular-nums font-medium text-foreground',
            headerClassName: 'text-right',
          },
        ]}
      />
      <p className="mt-3 text-xs/5 text-muted">
        Peers not dialled connected inbound only. Sentries fill their slots from inbound peers first, so that does not
        make them unreachable.
      </p>
    </Card>
  );
}
