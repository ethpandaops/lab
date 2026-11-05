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
  entityQuery,
  summariseClients,
  toClientCountRecords,
  type ClientLayer,
  type ClientSummary,
} from '@/pages/ethereum/clients/utils/client-share';
import { useVersionCounts } from '@/pages/ethereum/clients/hooks/useVersionCounts';

export interface EntityClientsProps {
  entity: string;
  /** Days the window spans; all history when null */
  days: number | null;
  /** The window as text, e.g. "last 30 days" */
  window: string;
}

interface VersionRow {
  client: string;
  version: string;
  blocks: number;
  /** Share of the entity's blocks naming a client of this layer */
  share: number;
}

/** Versions shown per layer */
const VERSION_ROWS = 10;

/** One layer: the share of its blocks each client has, then the releases behind them */
function LayerCard({
  layer,
  summaries,
  versions,
  versionsLoading,
  window,
}: {
  layer: ClientLayer;
  summaries: ClientSummary[];
  versions: VersionRow[];
  versionsLoading: boolean;
  window: string;
}): JSX.Element {
  return (
    <Card
      rounded
      title={layer === 'consensus' ? 'Consensus clients' : 'Execution clients'}
      subtitle={`Share of its canonical blocks whose graffiti names a client, ${window}`}
    >
      <div className="flex flex-col gap-6">
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
        {versionsLoading ? (
          <LoadingContainer className="h-32 rounded-sm" />
        ) : (
          versions.length > 0 && (
            <Table
              variant="nested"
              data={versions.slice(0, VERSION_ROWS)}
              getRowKey={row => `${row.client}-${row.version}`}
              columns={[
                { header: 'Release', accessor: row => <ClientLabel client={row.client} version={row.version} /> },
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
          )
        )}
      </div>
    </Card>
  );
}

/**
 * Which clients and releases an entity proposes with over the window, from block graffiti, linked to the client and
 * version pages.
 */
export function EntityClients({ entity, days, window }: EntityClientsProps): JSX.Element {
  const { currentNetwork } = useNetwork();
  // Whole UTC days ending yesterday, so today's partial count never sits beside complete days
  const today = useMemo(() => Math.floor(Date.now() / 1000 / 86400) * 86400, []);
  const since = days === null ? undefined : today - days * 86400;
  const todayDay = new Date(today * 1000).toISOString().slice(0, 10);
  const sinceDay = since === undefined ? '' : new Date(since * 1000).toISOString().slice(0, 10);

  const counts = useQuery({
    queryKey: ['entity-clients', 'counts', currentNetwork?.name, entity],
    queryFn: ({ signal }) =>
      fetchAllPages<FctBlockGraffitiClientByEntityDaily>(
        fctBlockGraffitiClientByEntityDailyServiceList,
        // The daily table only filters its date key by value; every date starts with 20
        { query: { ...entityQuery(entity), day_start_date_like: '20%', page_size: 10000 } },
        'fct_block_graffiti_client_by_entity_daily',
        signal
      ),
    enabled: !!currentNetwork,
  });
  const blocks = useVersionCounts({ grain: 'entity-daily', entity, from: since, to: today });

  const shares = useMemo(() => {
    const inWindow = (counts.data ?? []).filter(row => {
      const day = row.day_start_date ?? '';
      return day >= sinceDay && day < todayDay;
    });
    const records = toClientCountRecords(inWindow, true);
    const identified = (layer: ClientLayer): ClientSummary[] =>
      summariseClients(records, layer).filter(summary => summary.client !== UNKNOWN_CLIENT);
    return { consensus: identified('consensus'), execution: identified('execution') };
  }, [counts.data, sinceDay, todayDay]);

  const versions = useMemo(() => {
    const named = { consensus: 0, execution: 0 };
    const byVersion = { consensus: new Map<string, VersionRow>(), execution: new Map<string, VersionRow>() };
    for (const row of blocks.rows) {
      const layer = row.layer === 'execution' ? 'execution' : 'consensus';
      if (!row.client || row.client === UNKNOWN_CLIENT) continue;
      named[layer] += row.count;
      if (!row.version) continue;
      const key = `${row.client}|${row.version}`;
      const entry = byVersion[layer].get(key) ?? { client: row.client, version: row.version, blocks: 0, share: 0 };
      entry.blocks += row.count;
      byVersion[layer].set(key, entry);
    }
    const ranked = (layer: ClientLayer): VersionRow[] =>
      [...byVersion[layer].values()]
        .map(row => ({ ...row, share: named[layer] > 0 ? (row.blocks / named[layer]) * 100 : 0 }))
        .sort((a, b) => b.blocks - a.blocks);
    return { consensus: ranked('consensus'), execution: ranked('execution') };
  }, [blocks.rows]);

  if (counts.isLoading) return <LoadingContainer className="h-96 rounded-sm" />;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {(['consensus', 'execution'] as const).map(layer => (
          <LayerCard
            key={layer}
            layer={layer}
            summaries={shares[layer]}
            versions={versions[layer]}
            versionsLoading={blocks.isLoading}
            window={window}
          />
        ))}
      </div>
      <Link to="/ethereum/clients" search={{ entity }} className="self-start text-sm text-primary hover:underline">
        Client shares over time
      </Link>
    </div>
  );
}
