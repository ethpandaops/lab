import type { JSX } from 'react';
import { useNavigate } from '@tanstack/react-router';
import clsx from 'clsx';
import { Card } from '@/components/Layout/Card';
import { Table } from '@/components/Lists/Table';
import type { Column } from '@/components/Lists/Table/Table.types';
import { NetworkIcon } from '@/components/Ethereum/NetworkIcon';
import type { Network } from '@/hooks/useConfig/useConfig.types';
import { useNetworksBounds } from '@/hooks/useBounds';
import { useNetwork } from '@/hooks/useNetwork';
import { SECONDS_PER_SLOT, SLOTS_PER_EPOCH, timestampToSlot } from '@/utils/beacon';
import { getActiveFork } from '@/utils/forks';
import { getNetworkShortLabel, type NetworkGroup } from '@/utils/networks';

/** Indexing lag beyond which the newest indexed block is flagged */
const STALE_AFTER_SECONDS = 10 * 60;

/** "45s", "12m", "3h", "2d" */
function formatAge(seconds: number): string {
  if (seconds < 60) return `${Math.max(0, Math.round(seconds))}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
}

interface Row {
  network: Network;
  headSlot: number;
  headEpoch: number;
  fork: string;
  /** Newest indexed block's slot start, or undefined while loading / unavailable */
  indexedAt: number | undefined;
  boundsState: 'loading' | 'error' | 'ready';
}

export interface NetworksTableProps {
  group: NetworkGroup;
  /** Current unix time, ticking every second */
  now: number;
}

/**
 * One table per network group: the wall-clock head slot and epoch, the active fork, and the newest
 * block the Lab has indexed with how far behind the head it is. A row opens the network's live view.
 */
export function NetworksTable({ group, now }: NetworksTableProps): JSX.Element {
  const navigate = useNavigate();
  const { setCurrentNetwork } = useNetwork();
  const bounds = useNetworksBounds(group.networks.map(network => network.name));

  const rows: Row[] = group.networks.map(network => {
    const headSlot = now > network.genesis_time ? Math.floor((now - network.genesis_time) / SECONDS_PER_SLOT) : 0;
    const headEpoch = Math.floor(headSlot / SLOTS_PER_EPOCH);
    const activeFork = getActiveFork(network, headEpoch);
    const result = bounds[network.name];
    return {
      network,
      headSlot,
      headEpoch,
      fork: activeFork?.combinedName ?? activeFork?.displayName ?? '–',
      indexedAt: result?.data?.fct_block_head?.max,
      boundsState: result?.isError ? 'error' : result?.data ? 'ready' : 'loading',
    };
  });

  const open = (network: Network): void => {
    setCurrentNetwork(network);
    navigate({ to: '/ethereum/live', search: { network: network.name === 'mainnet' ? undefined : network.name } });
  };

  const columns: Column<Row>[] = [
    {
      header: 'Network',
      headerClassName: 'w-[28%]',
      accessor: row => (
        <span className="flex items-center gap-2 font-medium text-foreground">
          <NetworkIcon networkName={row.network.name} className="size-5" />
          {getNetworkShortLabel(row.network)}
        </span>
      ),
    },
    { header: 'Fork', accessor: row => row.fork, headerClassName: 'w-[18%]', cellClassName: 'text-muted capitalize' },
    {
      header: 'Head slot',
      accessor: row => String(row.headSlot),
      headerClassName: 'w-[16%] text-right',
      cellClassName: 'text-right',
    },
    {
      header: 'Epoch',
      accessor: row => String(row.headEpoch),
      headerClassName: 'w-[14%] text-right',
      cellClassName: 'text-right text-muted',
    },
    {
      header: 'Indexed to',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      accessor: row => {
        if (row.boundsState === 'loading') return <span className="text-muted">–</span>;
        if (row.boundsState === 'error' || row.indexedAt === undefined)
          return <span className="text-muted">Unavailable</span>;
        const lag = now - row.indexedAt;
        return (
          <span className="inline-flex items-baseline gap-2">
            <span className="text-foreground">{timestampToSlot(row.indexedAt, row.network.genesis_time)}</span>
            <span className={clsx('w-16 text-xs', lag > STALE_AFTER_SECONDS ? 'text-warning' : 'text-success')}>
              {formatAge(lag)} behind
            </span>
          </span>
        );
      },
    },
  ];

  return (
    <Card title={group.id === 'public' ? 'Networks' : group.id === 'other' ? 'Devnets' : `${group.label} devnets`}>
      <Table
        variant="nested"
        data={rows}
        columns={columns}
        getRowKey={row => row.network.name}
        onRowClick={row => open(row.network)}
      />
    </Card>
  );
}
