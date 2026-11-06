import type { JSX } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Card } from '@/components/Layout/Card';
import { Table } from '@/components/Lists/Table';
import type { Column } from '@/components/Lists/Table/Table.types';
import { ClientLabel } from '@/components/Ethereum/ClientLabel';
import { isKnownClient } from '@/utils/ethereum';
import type { ClientPairSummary } from '../../utils/client-share';

export interface ClientPairsProps {
  /** Pair totals, largest first */
  pairs: ClientPairSummary[];
  /** Which blocks the pairs count, e.g. "in the last 7 days" or "from coinbase in the last 7 days" */
  scope: string;
  /** How many pairs to show */
  limit?: number;
}

const columns: Column<ClientPairSummary>[] = [
  { header: 'Consensus', accessor: row => <ClientLabel client={row.consensusClient} /> },
  { header: 'Execution', accessor: row => <ClientLabel client={row.executionClient} /> },
  {
    header: 'Blocks',
    accessor: row => row.blocks.toLocaleString(),
    cellClassName: 'text-right tabular-nums text-muted',
    headerClassName: 'text-right',
  },
  {
    header: 'Share',
    accessor: row => `${row.share.toFixed(1)}%`,
    cellClassName: 'text-right tabular-nums font-medium text-foreground',
    headerClassName: 'text-right',
  },
];

/**
 * Most common consensus and execution client pairs over the selected window. A row opens the consensus client's
 * pairings.
 */
export function ClientPairs({ pairs, scope, limit = 10 }: ClientPairsProps): JSX.Element {
  const navigate = useNavigate();
  return (
    <Card
      rounded
      title="Client pairs"
      subtitle={`Proposed blocks ${scope} by the clients their graffiti names, stake-weighted`}
    >
      <Table
        variant="nested"
        data={pairs.slice(0, limit)}
        columns={columns}
        getRowKey={row => `${row.consensusClient}|${row.executionClient}`}
        onRowClick={row =>
          isKnownClient(row.consensusClient) &&
          navigate({
            to: '/ethereum/clients/$client',
            params: { client: row.consensusClient },
            search: { tab: 'pairings' },
          })
        }
        getRowClassName={row => (isKnownClient(row.consensusClient) ? 'cursor-pointer' : '')}
      />
    </Card>
  );
}
