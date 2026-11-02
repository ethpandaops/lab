import { type JSX, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { Card } from '@/components/Layout/Card';
import { Table } from '@/components/Lists/Table';
import { ClientLabel } from '@/components/Ethereum/ClientLabel';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { SegmentedControl } from '@/components/Forms/SegmentedControl';
import { CLIENT_WINDOW_OPTIONS, VERSION_WINDOW_DAYS, SHARE_WINDOW_OPTIONS, UNKNOWN_CLIENT } from '../../constants';
import { useClientBlocks } from '../../hooks';
import { PartnerShares } from '../PartnerBreakdown';
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
 * Which clients of the other layer this client runs with: by blocks and IP addresses, and by version.
 */
export function PairingsTab({
  client,
  layer,
  window,
  onWindowChange,
  shareWindow,
  onShareWindowChange,
}: ClientTabProps): JSX.Element {
  const { blocks, isLoading: blocksLoading } = useClientBlocks(client, layer, VERSION_WINDOW_DAYS[window]);
  const otherLayer = layer === 'consensus' ? 'execution' : 'consensus';

  const versionPairs = useMemo(() => {
    const byPair = new Map<string, VersionPairing>();
    for (const block of blocks) {
      if (!block.version) continue;
      const partner = block.partner ?? UNKNOWN_CLIENT;
      const key = `${block.version}|${partner}|${block.partnerVersion ?? block.partnerCommit ?? ''}`;
      const entry = byPair.get(key) ?? {
        version: block.version,
        partner,
        partnerVersion: block.partnerVersion,
        partnerCommit: block.partnerCommit,
        blocks: 0,
        share: 0,
      };
      entry.blocks += block.count;
      byPair.set(key, entry);
    }
    const total = blocks.filter(block => block.version).reduce((sum, block) => sum + block.count, 0);
    return [...byPair.values()]
      .map(pair => ({ ...pair, share: total > 0 ? (pair.blocks / total) * 100 : 0 }))
      .sort((a, b) => b.blocks - a.blocks)
      .slice(0, 20);
  }, [blocks]);

  return (
    <div className="flex flex-col gap-4">
      <div className="self-start">
        <SegmentedControl
          options={SHARE_WINDOW_OPTIONS}
          value={shareWindow}
          onChange={onShareWindowChange}
          ariaLabel="Share window"
        />
      </div>
      <PartnerShares client={client} layer={layer} shareWindow={shareWindow} />

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
