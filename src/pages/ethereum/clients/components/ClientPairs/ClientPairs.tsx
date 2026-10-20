import type { JSX } from 'react';
import { Card } from '@/components/Layout/Card';
import { Table } from '@/components/Lists/Table';
import type { Column } from '@/components/Lists/Table/Table.types';
import { ClientLabel } from '@/components/Ethereum/ClientLabel';
import type { ClientPairSummary } from '../../utils/client-share';

export interface ClientPairsProps {
  /** Pair totals, largest first */
  pairs: ClientPairSummary[];
  /** How many pairs to show */
  limit?: number;
  /** Called with a pair to filter the page by */
  onSelect: (pair: ClientPairSummary) => void;
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
 * Most common consensus and execution client pairs over the selected window.
 */
export function ClientPairs({ pairs, limit = 10, onSelect }: ClientPairsProps): JSX.Element {
  return (
    <Card rounded header={<h3 className="text-sm/6 font-semibold text-foreground">Client pairs</h3>}>
      <Table
        variant="nested"
        data={pairs.slice(0, limit)}
        columns={columns}
        getRowKey={row => `${row.consensusClient}|${row.executionClient}`}
        onRowClick={row => onSelect(row)}
        getRowClassName={() => 'cursor-pointer'}
      />
    </Card>
  );
}
