import { type JSX, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dimClientReleaseServiceList } from '@/api/sdk.gen';
import type { DimClientRelease } from '@/api/types.gen';
import { fetchAllPages } from '@/utils/api-pagination';
import { Link } from '@tanstack/react-router';
import { Card } from '@/components/Layout/Card';
import { Table } from '@/components/Lists/Table';
import { ClientLabel } from '@/components/Ethereum/ClientLabel';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { SegmentedControl } from '@/components/Forms/SegmentedControl';
import { getClientColor } from '@/utils/ethereum';
import {
  CLIENT_WINDOW_OPTIONS,
  PAGE_SIZE,
  SHARE_WINDOW_OPTIONS,
  SHARE_WINDOW_TEXT,
  UNKNOWN_CLIENT,
} from '../../constants';
import { resolveDetail } from '../../utils/client-versions';
import { useClientCounts } from '../../hooks';
import { clientOf, summariseClients } from '../../utils/client-share';
import { PENDING_SOURCES } from '../../pending';
import { PendingSource } from '../PendingSource';
import { ShareTable } from '../ShareTable';
import type { ClientTabProps } from './ClientTabs.types';

interface VersionPairing {
  version: string;
  partner: string;
  /** The partner's release, when its graffiti resolves to one */
  partnerVersion?: string;
  /** The partner's commit, when it does not */
  partnerCommit?: string;
  blocks: number;
  share: number;
}

/**
 * Which clients of the other layer this client runs with: by blocks, and by version.
 */
export function PairingsTab({
  client,
  layer,
  blocks,
  blocksLoading,
  window,
  onWindowChange,
  shareWindow,
  onShareWindowChange,
}: ClientTabProps): JSX.Element {
  const counts = useClientCounts(shareWindow);
  const otherLayer = layer === 'consensus' ? 'execution' : 'consensus';
  const partners = useMemo(
    () =>
      summariseClients(
        counts.records.filter(record => clientOf(record, layer) === client),
        otherLayer
      ),
    [counts.records, layer, client, otherLayer]
  );

  const partnerClients = useMemo(
    () => [...new Set(blocks.map(block => block.partner))].filter(partner => partner !== UNKNOWN_CLIENT).sort(),
    [blocks]
  );
  const partnerReleases = useQuery({
    queryKey: ['client-pages', 'partner-releases', partnerClients.join(',')],
    queryFn: ({ signal }) =>
      fetchAllPages<DimClientRelease>(
        dimClientReleaseServiceList,
        { query: { client_in_values: partnerClients.join(','), page_size: PAGE_SIZE } },
        'dim_client_release',
        signal
      ),
    enabled: partnerClients.length > 0,
    staleTime: 30 * 60 * 1000,
  });

  const versionPairs = useMemo(() => {
    const releasesByClient = new Map<string, DimClientRelease[]>();
    for (const release of partnerReleases.data ?? []) {
      const list = releasesByClient.get(release.client ?? '') ?? [];
      list.push(release);
      releasesByClient.set(release.client ?? '', list);
    }
    const byPair = new Map<string, VersionPairing>();
    for (const block of blocks) {
      if (!block.version) continue;
      const partnerVersion = resolveDetail(
        block.partnerDetail,
        releasesByClient.get(block.partner) ?? [],
        block.time
      )?.version;
      const partnerCommit = partnerVersion ? undefined : block.partnerDetail;
      const key = `${block.version}|${block.partner}|${partnerVersion ?? partnerCommit ?? ''}`;
      const entry = byPair.get(key) ?? {
        version: block.version,
        partner: block.partner,
        partnerVersion,
        partnerCommit,
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
  }, [blocks, partnerReleases.data]);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
        <Card
          rounded
          title={`${otherLayer === 'consensus' ? 'Consensus' : 'Execution'} clients it runs with`}
          subtitle={`Share of its blocks, ${SHARE_WINDOW_TEXT[shareWindow]}`}
          actions={
            <SegmentedControl
              options={SHARE_WINDOW_OPTIONS}
              value={shareWindow}
              onChange={onShareWindowChange}
              ariaLabel="Share window"
            />
          }
        >
          {counts.isLoading ? (
            <LoadingContainer className="h-48 rounded-sm" />
          ) : (
            <ShareTable
              labelHeader="Client"
              countHeader="Blocks"
              rows={partners.map(partner => ({
                key: partner.client,
                label: <ClientLabel client={partner.client} />,
                share: partner.share,
                count: partner.blocks,
                color: getClientColor(partner.client),
              }))}
            />
          )}
        </Card>
        <PendingSource {...PENDING_SOURCES.ipPairings} />
      </div>

      <Card
        rounded
        title="Version pairings"
        subtitle="Its versions with the other client's release, or its commit when that names no release"
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
            getRowKey={row => `${row.version}|${row.partner}|${row.partnerVersion ?? row.partnerCommit ?? ''}`}
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
                    version={row.partnerVersion}
                    detail={row.partner === UNKNOWN_CLIENT ? undefined : row.partnerCommit}
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
