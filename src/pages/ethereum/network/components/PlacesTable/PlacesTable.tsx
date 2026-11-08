import type { JSX } from 'react';
import { Link } from '@tanstack/react-router';
import { Table } from '@/components/Lists/Table';
import type { Column } from '@/components/Lists/Table/Table.types';
import { CountryFlag } from '@/components/Elements/CountryFlag';
import { networkTypeLabel } from '@/pages/ethereum/clients/utils/census';
import type {
  FctPeerCountByClientAsnDaily,
  FctPeerCountByClientCountryDaily,
} from '@/pages/ethereum/clients/api/client-models';
import { countDelta, rankPlaces, type PlaceRow } from '../../utils/network-census';

/** Key of the census's bucket of countries too small to list */
export const OTHER_COUNTRY = 'other';
/** Key of the census's bucket of networks too small to list */
export const OTHER_NETWORK = '0';

const numberColumn = 'text-right tabular-nums';
const wideOnly = 'hidden sm:table-cell';

/** Columns every place table ends with */
function countColumns(): Array<Column<PlaceRow>> {
  return [
    {
      header: 'Peers',
      accessor: row => row.peers.toLocaleString(),
      cellClassName: `${numberColumn} text-foreground`,
      headerClassName: 'text-right',
    },
    {
      header: 'Share',
      accessor: row => (row.share > 0 && row.share < 0.05 ? '<0.1%' : `${row.share.toFixed(1)}%`),
      cellClassName: `${numberColumn} font-medium text-foreground`,
      headerClassName: 'text-right',
    },
    {
      header: 'Change',
      accessor: row => countDelta(row.startPeers, row.peers)?.value ?? '-',
      cellClassName: `${numberColumn} text-muted`,
      headerClassName: 'text-right',
    },
  ];
}

export interface CountriesTableProps {
  end: FctPeerCountByClientCountryDaily[];
  start: FctPeerCountByClientCountryDaily[] | null;
  /** Rows to show; all when omitted */
  limit?: number;
}

/**
 * Countries by consensus peers on the range's last day, with their share and change since the range's first day.
 * Rows link to each country's page.
 */
export function CountriesTable({ end, start, limit }: CountriesTableProps): JSX.Element {
  const names = new Map(end.map(row => [row.country_code ?? '', row.country ?? '']));
  const rows = rankPlaces(end, start, row => row.country_code ?? '', OTHER_COUNTRY).slice(0, limit);

  return (
    <Table
      variant="nested"
      data={rows}
      getRowKey={row => row.key}
      columns={[
        {
          header: 'Country',
          accessor: row => (
            <Link
              to="/ethereum/network/countries/$country"
              params={{ country: row.key.toLowerCase() }}
              className="inline-flex max-w-48 items-center gap-2 text-foreground hover:text-primary sm:max-w-none"
            >
              <CountryFlag code={row.key} />
              <span className="truncate">{names.get(row.key) || row.key}</span>
            </Link>
          ),
        },
        ...countColumns(),
      ]}
    />
  );
}

export interface NetworksTableProps {
  end: FctPeerCountByClientAsnDaily[];
  start: FctPeerCountByClientAsnDaily[] | null;
  /** Rows to show; all when omitted */
  limit?: number;
}

/**
 * Networks (autonomous systems) by consensus peers on the range's last day, with their share and change since the
 * range's first day. Rows link to each network's page.
 */
export function NetworksTable({ end, start, limit }: NetworksTableProps): JSX.Element {
  const meta = new Map(
    end.map(row => [
      String(row.autonomous_system_number ?? 0),
      { name: row.autonomous_system_organization ?? '', type: row.network_type },
    ])
  );
  const rows = rankPlaces(end, start, row => String(row.autonomous_system_number ?? 0), OTHER_NETWORK).slice(0, limit);

  return (
    <Table
      variant="nested"
      data={rows}
      getRowKey={row => row.key}
      columns={[
        {
          header: 'Network',
          accessor: row => (
            <Link
              to="/ethereum/network/asn/$asn"
              params={{ asn: row.key }}
              className="group flex max-w-32 flex-col sm:max-w-64"
              title={meta.get(row.key)?.name}
            >
              <span className="truncate text-foreground group-hover:text-primary">
                {meta.get(row.key)?.name || `AS${row.key}`}
              </span>
              <span className="text-xs/4 text-muted tabular-nums">AS{row.key}</span>
            </Link>
          ),
        },
        {
          header: 'Type',
          accessor: row => networkTypeLabel(meta.get(row.key)?.type),
          cellClassName: `${wideOnly} text-muted`,
          headerClassName: wideOnly,
        },
        ...countColumns(),
      ]}
    />
  );
}
