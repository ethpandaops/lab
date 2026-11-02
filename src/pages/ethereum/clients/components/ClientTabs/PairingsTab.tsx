import { type JSX, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { Card } from '@/components/Layout/Card';
import { Table } from '@/components/Lists/Table';
import { ClientLabel } from '@/components/Ethereum/ClientLabel';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { SegmentedControl } from '@/components/Forms/SegmentedControl';
import { getClientColor } from '@/utils/ethereum';
import { CLIENT_WINDOW_OPTIONS, UNKNOWN_CLIENT } from '../../constants';
import { useClientCounts } from '../../hooks';
import { clientOf, summariseClients } from '../../utils/client-share';
import { PENDING_SOURCES } from '../../pending';
import { PendingSource } from '../PendingSource';
import { ShareBar } from '../ShareBar';
import type { ClientTabProps } from './ClientTabs.types';

interface VersionPairing {
  version: string;
  partner: string;
  partnerDetail?: string;
  blocks: number;
  share: number;
}

/**
 * Which clients of the other layer this client runs with: by blocks over 30 days, and by version.
 */
export function PairingsTab({
  client,
  layer,
  blocks,
  blocksLoading,
  window,
  onWindowChange,
}: ClientTabProps): JSX.Element {
  const counts = useClientCounts('30d');
  const otherLayer = layer === 'consensus' ? 'execution' : 'consensus';
  const partners = useMemo(
    () =>
      summariseClients(
        counts.records.filter(record => clientOf(record, layer) === client),
        otherLayer
      ),
    [counts.records, layer, client, otherLayer]
  );

  const versionPairs = useMemo(() => {
    const byPair = new Map<string, VersionPairing>();
    for (const block of blocks) {
      if (!block.version) continue;
      const key = `${block.version}|${block.partner}|${block.partnerDetail ?? ''}`;
      const entry = byPair.get(key) ?? {
        version: block.version,
        partner: block.partner,
        partnerDetail: block.partnerDetail,
        blocks: 0,
        share: 0,
      };
      entry.blocks++;
      byPair.set(key, entry);
    }
    const total = blocks.filter(block => block.version).length;
    return [...byPair.values()]
      .map(pair => ({ ...pair, share: total > 0 ? (pair.blocks / total) * 100 : 0 }))
      .sort((a, b) => b.blocks - a.blocks)
      .slice(0, 20);
  }, [blocks]);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card
          rounded
          title={`${otherLayer === 'consensus' ? 'Consensus' : 'Execution'} clients it runs with`}
          subtitle="Share of its blocks, 30 days"
        >
          {counts.isLoading ? (
            <LoadingContainer className="h-48 rounded-sm" />
          ) : (
            <ul className="flex flex-col gap-1.5">
              {partners.map(partner => (
                <li key={partner.client} className="flex items-center gap-3">
                  <span className="w-36 shrink-0">
                    <ClientLabel client={partner.client} />
                  </span>
                  <span className="flex-1">
                    <ShareBar share={partner.share} color={getClientColor(partner.client)} showThresholds={false} />
                  </span>
                  <span className="w-14 shrink-0 text-right text-sm/6 font-medium text-foreground tabular-nums">
                    {partner.share.toFixed(1)}%
                  </span>
                  <span className="hidden w-16 shrink-0 text-right text-xs/6 text-muted tabular-nums sm:block">
                    {partner.blocks.toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <PendingSource {...PENDING_SOURCES.ipPairings} />
      </div>

      <Card
        rounded
        title="Version pairings"
        subtitle="Its versions with the other client's version or commit, by blocks"
        actions={
          <SegmentedControl
            options={CLIENT_WINDOW_OPTIONS}
            value={window}
            onChange={onWindowChange}
            ariaLabel="Window"
          />
        }
      >
        {blocksLoading ? (
          <LoadingContainer className="h-64 rounded-sm" />
        ) : versionPairs.length === 0 ? (
          <p className="text-sm text-muted">No block in this window resolved to a release.</p>
        ) : (
          <Table
            variant="nested"
            data={versionPairs}
            getRowKey={row => `${row.version}|${row.partner}|${row.partnerDetail}`}
            columns={[
              {
                header: 'Version',
                accessor: row => (
                  <Link
                    to="/ethereum/clients/$client/$version"
                    params={{ client, version: row.version }}
                    className="font-mono text-xs/6 text-primary hover:underline"
                  >
                    {row.version}
                  </Link>
                ),
              },
              {
                header: otherLayer === 'consensus' ? 'Consensus client' : 'Execution client',
                accessor: row => (
                  <ClientLabel
                    client={row.partner}
                    detail={row.partner === UNKNOWN_CLIENT ? undefined : row.partnerDetail}
                  />
                ),
              },
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
            ]}
          />
        )}
      </Card>
    </div>
  );
}
