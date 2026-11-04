import { type JSX, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { Card } from '@/components/Layout/Card';
import { Table } from '@/components/Lists/Table';
import { ClientLabel } from '@/components/Ethereum/ClientLabel';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { SegmentedControl } from '@/components/Forms/SegmentedControl';
import { fctBlockGraffitiClientVersionPairDailyServiceList } from '@/api/sdk.gen';
import type { FctBlockGraffitiClientVersionPairDaily } from '@/api/types.gen';
import { RESOLVED_STATUSES } from '../../api/client-models';
import { SHARE_WINDOW_DAYS, SHARE_WINDOW_OPTIONS, UNKNOWN_CLIENT } from '../../constants';
import { useDailyByClient } from '../../hooks';
import { windowStart } from '../../utils/client-versions';
import { PartnerShares } from '../PartnerBreakdown';
import type { ClientTabProps } from './ClientTabs.types';

interface VersionPairing {
  version: string;
  partner: string;
  /** The partner's release, when its graffiti resolves to one */
  partnerVersion?: string;
  /** The version the partner's graffiti states, when it resolves to no release */
  partnerStated?: string;
  blocks: number;
  share: number;
}

/**
 * Which clients of the other layer this client runs with: by blocks and IP addresses, and by version.
 */
export function PairingsTab({ client, layer, shareWindow, onShareWindowChange }: ClientTabProps): JSX.Element {
  const otherLayer = layer === 'consensus' ? 'execution' : 'consensus';
  const days = SHARE_WINDOW_DAYS[shareWindow];
  const { rows, isLoading: blocksLoading } = useDailyByClient<FctBlockGraffitiClientVersionPairDaily>(
    fctBlockGraffitiClientVersionPairDailyServiceList,
    'fct_block_graffiti_client_version_pair_daily',
    { [`${layer}_client_eq`]: client },
    days === null ? undefined : windowStart(days)
  );

  const versionPairs = useMemo(() => {
    const byPair = new Map<string, VersionPairing>();
    let total = 0;
    for (const row of rows) {
      const version = row[`${layer}_version`];
      if (!version || !RESOLVED_STATUSES.has(row[`${layer}_release_status`] ?? '')) continue;
      const partner = row[`${otherLayer}_client`]?.trim().toLowerCase() || UNKNOWN_CLIENT;
      const partnerResolved = RESOLVED_STATUSES.has(row[`${otherLayer}_release_status`] ?? '');
      const partnerVersion = partnerResolved ? row[`${otherLayer}_version`] || undefined : undefined;
      const partnerStated = partnerResolved ? undefined : row[`${otherLayer}_version`] || undefined;
      const key = `${version}|${partner}|${partnerVersion ?? partnerStated ?? ''}`;
      const entry = byPair.get(key) ?? { version, partner, partnerVersion, partnerStated, blocks: 0, share: 0 };
      entry.blocks += row.block_count ?? 0;
      total += row.block_count ?? 0;
      byPair.set(key, entry);
    }
    return [...byPair.values()]
      .map(pair => ({ ...pair, share: total > 0 ? (pair.blocks / total) * 100 : 0 }))
      .sort((a, b) => b.blocks - a.blocks)
      .slice(0, 20);
  }, [rows, layer, otherLayer]);

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
        subtitle="Its versions with the other client's release, or the version its graffiti states when that names no release"
      >
        {blocksLoading ? (
          <LoadingContainer className="h-64 rounded-sm" />
        ) : versionPairs.length === 0 ? (
          <p className="text-sm text-muted">No block in this window resolved to a release.</p>
        ) : (
          <Table
            variant="nested"
            data={versionPairs}
            getRowKey={row => `${row.version}|${row.partner}|${row.partnerVersion ?? row.partnerStated ?? ''}`}
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
                    detail={row.partner === UNKNOWN_CLIENT ? undefined : row.partnerStated}
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
