import type { JSX } from 'react';
import { Link } from '@tanstack/react-router';
import type { IntPeerDaily } from '@/api/types.gen';
import { Card } from '@/components/Layout/Card';
import { Table } from '@/components/Lists/Table';
import type { Column } from '@/components/Lists/Table/Table.types';
import { Button } from '@/components/Elements/Button';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import { CountryFlag } from '@/components/Elements/CountryFlag';
import { formatClientName } from '@/utils/graffiti';
import { formatDataDate } from '@/pages/ethereum/clients/utils/client-versions';
import type { UsePeerListResult } from '@/pages/ethereum/network/hooks/usePeerList';
import { countryName, dayStart } from '@/pages/ethereum/network/utils/network-census';
import { isHosting, shortPeerId } from '@/pages/ethereum/network/utils/network-peers';

export interface PeerTableProps {
  title: string;
  /** The day the peers were counted */
  day: string | null;
  list: UsePeerListResult;
  /** Show each peer's country, for lists that span countries */
  country?: boolean;
  /** Show each hosting peer's city */
  city?: boolean;
  /** Show each hosting peer's network */
  network?: boolean;
  /** What the card shows when the day has no peer */
  empty?: string;
}

const wideOnly = 'hidden sm:table-cell';

/**
 * A page of consensus peers on one day, linking to each peer's page. City and network show for hosting peers only;
 * other peers are never placed finer than their country.
 */
export function PeerTable({
  title,
  day,
  list,
  country = false,
  city = false,
  network = false,
  empty = 'No peer was counted here that day.',
}: PeerTableProps): JSX.Element {
  const columns: Array<Column<IntPeerDaily>> = [
    {
      header: 'Peer',
      accessor: row => (
        <Link
          to="/ethereum/network/peers/$peerId"
          params={{ peerId: row.peer_id ?? '' }}
          className="font-mono text-sm text-foreground hover:text-primary"
          title={row.peer_id}
        >
          {shortPeerId(row.peer_id ?? '')}
        </Link>
      ),
    },
    {
      header: 'Client',
      accessor: row =>
        row.client && row.client !== 'unknown' && row.client !== 'other' ? (
          <span className="inline-flex items-center gap-2 text-foreground">
            <ClientLogo client={row.client} size={18} noLink decorative />
            {formatClientName(row.client)}
          </span>
        ) : (
          <span className="pl-6.5 text-muted">{row.client === 'other' ? 'Other' : 'Unknown'}</span>
        ),
    },
    {
      header: 'Version',
      accessor: row => row.version || '-',
      cellClassName: `${wideOnly} font-mono text-xs text-muted`,
      headerClassName: wideOnly,
    },
  ];
  if (country) {
    columns.push({
      header: 'Country',
      accessor: row =>
        row.country_code && /^[A-Z]{2}$/.test(row.country_code) ? (
          <span className="inline-flex items-center gap-2 text-muted">
            <CountryFlag code={row.country_code} />
            {countryName(row.country_code)}
          </span>
        ) : (
          '-'
        ),
      cellClassName: wideOnly,
      headerClassName: wideOnly,
    });
  }
  if (city) {
    columns.push({
      header: 'City',
      accessor: row => (isHosting(row) && row.city ? row.city : '-'),
      cellClassName: `${wideOnly} text-muted`,
      headerClassName: wideOnly,
    });
  }
  if (network) {
    columns.push({
      header: 'Network',
      accessor: row =>
        isHosting(row) && row.autonomous_system_number ? (
          <Link
            to="/ethereum/network/asn/$asn"
            params={{ asn: String(row.autonomous_system_number) }}
            className="block max-w-48 truncate text-muted hover:text-primary"
            title={row.autonomous_system_organization}
          >
            {row.autonomous_system_organization || `AS${row.autonomous_system_number}`}
          </Link>
        ) : (
          '-'
        ),
      cellClassName: wideOnly,
      headerClassName: wideOnly,
    });
  }
  columns.push({
    header: 'Custody groups',
    accessor: row => row.custody_group_count ?? '-',
    cellClassName: 'text-right tabular-nums text-muted',
    headerClassName: 'text-right',
  });

  return (
    <Card rounded title={title} subtitle={day ? `On ${formatDataDate(dayStart(day))}` : undefined}>
      {!list.isLoading && list.peers.length === 0 && list.pageIndex === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <div className="flex flex-col gap-3">
          <Table variant="nested" data={list.peers} getRowKey={row => row.peer_id ?? ''} columns={columns} />
          {(list.pageIndex > 0 || list.hasNextPage) && (
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={list.pageIndex === 0}
                onClick={() => list.goTo(list.pageIndex - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted tabular-nums">Page {list.pageIndex + 1}</span>
              <Button
                variant="outline"
                size="sm"
                disabled={!list.hasNextPage}
                onClick={() => list.goTo(list.pageIndex + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
