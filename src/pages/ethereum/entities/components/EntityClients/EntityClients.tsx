import { type JSX, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import {
  dimClientReleaseServiceList,
  fctBlockGraffitiClientByEntityDailyServiceList,
  fctBlockGraffitiServiceList,
} from '@/api/sdk.gen';
import type { DimClientRelease, FctBlockGraffiti, FctBlockGraffitiClientByEntityDaily } from '@/api/types.gen';
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
import { resolveBlocks } from '@/pages/ethereum/clients/utils/client-versions';

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
  const blocks = useQuery({
    queryKey: ['entity-clients', 'blocks', currentNetwork?.name, entity, since],
    queryFn: ({ signal }) =>
      fetchAllPages<FctBlockGraffiti>(
        fctBlockGraffitiServiceList,
        { query: { entity_eq: entity, slot_start_date_time_gte: since, page_size: 10000 } },
        'fct_block_graffiti',
        signal
      ),
    enabled: !!currentNetwork,
  });

  const clients = useMemo(() => {
    const names = new Set<string>();
    for (const row of blocks.data ?? []) {
      if (row.consensus_client && row.consensus_client !== UNKNOWN_CLIENT) names.add(row.consensus_client);
      if (row.execution_client && row.execution_client !== UNKNOWN_CLIENT) names.add(row.execution_client);
    }
    return [...names].sort();
  }, [blocks.data]);
  const releases = useQuery({
    queryKey: ['entity-clients', 'releases', clients.join(',')],
    queryFn: ({ signal }) =>
      fetchAllPages<DimClientRelease>(
        dimClientReleaseServiceList,
        { query: { client_in_values: clients.join(','), page_size: 10000 } },
        'dim_client_release',
        signal
      ),
    enabled: clients.length > 0,
    staleTime: 30 * 60 * 1000,
  });

  const shares = useMemo(() => {
    const records = toClientCountRecords(counts.data ?? [], true);
    const identified = (layer: ClientLayer): ClientSummary[] =>
      summariseClients(records, layer).filter(summary => summary.client !== UNKNOWN_CLIENT);
    return { consensus: identified('consensus'), execution: identified('execution') };
  }, [counts.data]);

  const versions = useMemo((): VersionRow[] => {
    const rows = blocks.data ?? [];
    const all = releases.data ?? [];
    const result: VersionRow[] = [];
    for (const layer of ['consensus', 'execution'] as const) {
      const byClient = new Map<string, FctBlockGraffiti[]>();
      for (const row of rows) {
        const client = layer === 'consensus' ? row.consensus_client : row.execution_client;
        if (!client || client === UNKNOWN_CLIENT) continue;
        byClient.set(client, [...(byClient.get(client) ?? []), row]);
      }
      const named = [...byClient.values()].reduce((sum, group) => sum + group.length, 0);
      for (const [client, group] of byClient) {
        const counts = new Map<string, number>();
        for (const block of resolveBlocks(
          group,
          layer,
          all.filter(release => release.client === client)
        )) {
          if (block.version) counts.set(block.version, (counts.get(block.version) ?? 0) + 1);
        }
        for (const [version, count] of counts) {
          result.push({ layer, client, version, blocks: count, share: named > 0 ? (count / named) * 100 : 0 });
        }
      }
    }
    return result.sort((a, b) => b.blocks - a.blocks);
  }, [blocks.data, releases.data]);

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
        {blocks.isLoading || releases.isLoading ? (
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
