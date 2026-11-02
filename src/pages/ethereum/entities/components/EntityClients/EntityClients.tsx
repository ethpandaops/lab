import { type JSX, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { fctBlockGraffitiClientByEntityDailyServiceList } from '@/api/sdk.gen';
import type { FctBlockGraffitiClientByEntityDaily } from '@/api/types.gen';
import { Card } from '@/components/Layout/Card';
import { Table } from '@/components/Lists/Table';
import { ClientLabel } from '@/components/Ethereum/ClientLabel';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { useNetwork } from '@/hooks/useNetwork';
import { fetchAllPages } from '@/utils/api-pagination';
import { getClientColor } from '@/utils/ethereum';
import { UNKNOWN_CLIENT } from '@/utils/graffiti';
import { ShareTable } from '@/pages/ethereum/clients/components/ShareTable';
import {
  summariseClients,
  toClientCountRecords,
  type ClientLayer,
  type ClientSummary,
} from '@/pages/ethereum/clients/utils/client-share';
import { useVersionCounts } from '@/pages/ethereum/clients/hooks/useVersionCounts';

export interface EntityClientsProps {
  entity: string;
}

/** Days of per-block graffiti for the versions */
const VERSION_DAYS = 30;

interface VersionRow {
  layer: ClientLayer;
  client: string;
  version: string;
  blocks: number;
  /** Share of the entity's blocks naming a client of this layer */
  share: number;
}

/** Ranked client shares for one layer */
function ShareList({ title, summaries }: { title: string; summaries: ClientSummary[] }): JSX.Element {
  return (
    <Card rounded title={title} subtitle="Share of blocks naming a client, all time">
      {summaries.length === 0 ? (
        <p className="text-sm text-muted">No block named a client.</p>
      ) : (
        <ShareTable
          labelHeader="Client"
          countHeader="Blocks"
          rows={summaries.map(summary => ({
            key: summary.client,
            label: <ClientLabel client={summary.client} />,
            share: summary.identifiedShare ?? 0,
            count: summary.blocks,
            color: getClientColor(summary.client),
          }))}
        />
      )}
    </Card>
  );
}

/**
 * Which clients and versions an entity proposes with, from block graffiti, linked to the client and version pages.
 */
export function EntityClients({ entity }: EntityClientsProps): JSX.Element {
  const { currentNetwork } = useNetwork();
  const since = useMemo(() => Math.floor(Date.now() / 1000 / 86400) * 86400 - (VERSION_DAYS - 1) * 86400, []);

  const counts = useQuery({
    queryKey: ['entity-clients', 'counts', currentNetwork?.name, entity],
    queryFn: ({ signal }) =>
      fetchAllPages<FctBlockGraffitiClientByEntityDaily>(
        fctBlockGraffitiClientByEntityDailyServiceList,
        // The daily table only filters its date key by value; every date starts with 20
        { query: { entity_eq: entity, day_start_date_like: '20%', page_size: 10000 } },
        'fct_block_graffiti_client_by_entity_daily',
        signal
      ),
    enabled: !!currentNetwork,
  });
  const blocks = useVersionCounts({ grain: 'entity-daily', entity, from: since });

  const shares = useMemo(() => {
    const records = toClientCountRecords(counts.data ?? [], true);
    const identified = (layer: ClientLayer): ClientSummary[] =>
      summariseClients(records, layer).filter(summary => summary.client !== UNKNOWN_CLIENT);
    return { consensus: identified('consensus'), execution: identified('execution') };
  }, [counts.data]);

  const versions = useMemo((): VersionRow[] => {
    const named = { consensus: 0, execution: 0 };
    const byVersion = new Map<string, VersionRow>();
    for (const row of blocks.rows) {
      const layer = row.layer === 'execution' ? 'execution' : 'consensus';
      if (!row.client || row.client === UNKNOWN_CLIENT) continue;
      named[layer] += row.count;
      if (!row.version) continue;
      const key = `${layer}|${row.client}|${row.version}`;
      const entry = byVersion.get(key) ?? { layer, client: row.client, version: row.version, blocks: 0, share: 0 };
      entry.blocks += row.count;
      byVersion.set(key, entry);
    }
    return [...byVersion.values()]
      .map(row => ({ ...row, share: named[row.layer] > 0 ? (row.blocks / named[row.layer]) * 100 : 0 }))
      .sort((a, b) => b.blocks - a.blocks);
  }, [blocks.rows]);

  if (counts.isLoading) return <LoadingContainer className="h-96 rounded-sm" />;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ShareList title="Consensus clients" summaries={shares.consensus} />
        <ShareList title="Execution clients" summaries={shares.execution} />
      </div>
      <Card
        rounded
        title="Versions"
        subtitle={`Blocks per release, ${VERSION_DAYS} days`}
        actions={
          <Link to="/ethereum/clients" search={{ entity }} className="text-sm text-primary hover:underline">
            Client shares over time
          </Link>
        }
      >
        {blocks.isLoading ? (
          <LoadingContainer className="h-48 rounded-sm" />
        ) : versions.length === 0 ? (
          <p className="text-sm text-muted">No block resolved to a client release.</p>
        ) : (
          <Table
            variant="nested"
            data={versions.slice(0, 25)}
            getRowKey={row => `${row.layer}-${row.client}-${row.version}`}
            columns={[
              { header: 'Client', accessor: row => <ClientLabel client={row.client} version={row.version} /> },
              {
                header: 'Layer',
                accessor: row => (row.layer === 'consensus' ? 'Consensus' : 'Execution'),
                cellClassName: 'text-muted',
              },
              {
                header: 'Blocks',
                accessor: row => row.blocks.toLocaleString(),
                cellClassName: 'text-right tabular-nums text-muted',
                headerClassName: 'text-right',
              },
              {
                header: 'Share of its blocks',
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
