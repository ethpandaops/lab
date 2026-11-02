import clsx from 'clsx';
import { type JSX, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { Card } from '@/components/Layout/Card';
import { Table } from '@/components/Lists/Table';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { Stats } from '@/components/DataDisplay/Stats';
import { MultiLineChart, type SeriesData } from '@/components/Charts/MultiLine';
import { getClientColor } from '@/utils/ethereum';
import { formatClientName } from '@/utils/graffiti';
import { compareVersions } from '@/utils/version';
import { formatDailyDate } from '@/pages/ethereum/execution/overview/overview.utils';
import { SHARE_WINDOW_DAYS, SHARE_WINDOW_OPTIONS, SHARE_WINDOW_TEXT, UNKNOWN_CLIENT } from '../../constants';
import { SegmentedControl } from '@/components/Forms/SegmentedControl';
import { useCensus, useClientCounts } from '../../hooks';
import { CENSUS_TABLES } from '../../api/client-models';
import { peerShareChart, unifiedClientRows } from '../../utils/census';
import { clientOf, summariseClients } from '../../utils/client-share';
import { displayVersion, windowStart } from '../../utils/client-versions';
import type { ClientTabProps } from './ClientTabs.types';

/** Formats a share, or a dash when nothing was counted */
function percent(part: number, total: number): string {
  return total > 0 ? `${((part / total) * 100).toFixed(1)}%` : '-';
}

/** A share (0-100) to one decimal, with tiny non-zero shares as <0.1% */
function shareText(share: number | null): string {
  if (share === null) return '-';
  return share > 0 && share < 0.05 ? '<0.1%' : `${share.toFixed(1)}%`;
}

type PeerRow = { day_start_date?: string; client?: string; peer_count?: number };

/**
 * The client at a glance: its share of proposed blocks and of P2P peers, Xatu nodes and adoption of its latest
 * release, both shares over time, and the forks that set a minimum version for it.
 */
export function OverviewTab({
  client,
  layer,
  latest,
  last24h,
  nodes,
  releases,
  requirements,
  shareWindow,
  onShareWindowChange,
}: ClientTabProps): JSX.Element {
  const counts = useClientCounts(shareWindow);
  const windowText = SHARE_WINDOW_TEXT[shareWindow];
  const windowDays = SHARE_WINDOW_DAYS[shareWindow];
  // 0 loads the census from its first day; undefined would load only the latest days
  const peerFrom = useMemo(() => (windowDays === null ? 0 : windowStart(windowDays)), [windowDays]);
  const peers = useCensus<PeerRow>(layer === 'consensus' ? CENSUS_TABLES.clPeers : CENSUS_TABLES.elPeers, {}, peerFrom);

  const blockShare = useMemo(() => {
    const summaries = summariseClients(counts.records, layer);
    return summaries.find(s => s.client === client)?.identifiedShare ?? null;
  }, [counts.records, layer, client]);
  const peerShare = useMemo(() => {
    const latestRows = peers.rows.filter(row => row.day_start_date === peers.day);
    return unifiedClientRows(layer, [], latestRows).rows.find(row => row.client === client)?.peerShare ?? null;
  }, [peers.rows, peers.day, layer, client]);

  const chart = useMemo(() => {
    const blocks = new Map<string, { named: number; mine: number }>();
    for (const record of counts.records) {
      const recordClient = clientOf(record, layer);
      if (recordClient === UNKNOWN_CLIENT) continue;
      const entry = blocks.get(record.key) ?? { named: 0, mine: 0 };
      entry.named += record.blocks;
      if (recordClient === client) entry.mine += record.blocks;
      blocks.set(record.key, entry);
    }
    const peerDays = peerShareChart(layer, peers.rows);
    const mine = peerDays.series.find(series => series.name === formatClientName(client));
    const peerByDay = new Map(peerDays.days.map((day, i) => [day, mine?.data[i] ?? 0]));
    const days = [...new Set([...counts.keys, ...peerDays.days])].sort();
    const color = getClientColor(client);
    const series: SeriesData[] = [
      {
        name: 'Proposed blocks',
        color,
        showArea: true,
        areaOpacity: 0.15,
        showSymbol: false,
        data: days.map(day => {
          const entry = blocks.get(day);
          return entry && entry.named > 0 ? Number(((entry.mine / entry.named) * 100).toFixed(2)) : null;
        }),
      },
    ];
    if (peerByDay.size > 0) {
      series.push({
        name: 'P2P peers',
        color,
        lineStyle: 'dashed',
        showSymbol: peerByDay.size < 30,
        data: days.map(day => (peerByDay.has(day) ? Number((peerByDay.get(day) as number).toFixed(2)) : null)),
      });
    }
    return { labels: days.map(formatDailyDate), series };
  }, [counts.records, counts.keys, peers.rows, layer, client]);

  const recent = last24h.filter(block => block.version);
  const recentTotal = recent.reduce((sum, row) => sum + row.count, 0);
  const onLatest = latest?.version
    ? recent
        .filter(block => compareVersions(block.version!, latest.version!) >= 0)
        .reduce((sum, row) => sum + row.count, 0)
    : 0;
  const nodesOnLatest = latest?.version
    ? nodes.filter(node => compareVersions(displayVersion(node.meta_consensus_version, releases), latest.version!) >= 0)
        .length
    : 0;

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
      <Stats
        gridClassName={clsx('grid grid-cols-2 gap-4', layer === 'consensus' ? 'lg:grid-cols-4' : 'lg:grid-cols-3')}
        stats={[
          {
            id: 'blocks',
            name: 'Proposed blocks',
            subtitle: `Share, ${windowText}`,
            value: shareText(blockShare),
            accentColor: getClientColor(client),
          },
          {
            id: 'peers',
            name: 'P2P peers',
            subtitle: peers.day ? `Share on ${peers.day}` : undefined,
            value: peers.isLoading ? '…' : shareText(peerShare),
          },
          {
            id: 'latest',
            name: 'On latest release',
            subtitle: `Blocks on ${latest?.version ?? 'it'} or newer, 24h`,
            value: percent(onLatest, recentTotal),
          },
          ...(layer === 'consensus'
            ? [
                {
                  id: 'nodes',
                  name: 'Xatu nodes',
                  value: nodes.length.toLocaleString(),
                  subtitle: nodes.length > 0 ? `${percent(nodesOnLatest, nodes.length)} on latest` : undefined,
                },
              ]
            : []),
        ]}
      />

      <PopoutCard
        title="Share over time"
        subtitle={`Of blocks naming a client (stake-weighted) and of P2P peers with an agent (node-weighted), ${windowText}`}
        anchorId="client-share"
        modalSize="full"
      >
        {({ inModal }) =>
          !counts.isLoading && blockShare === null && peerShare === null ? (
            <p className="text-sm text-muted">No block or P2P peer named this client in this window.</p>
          ) : (
            <MultiLineChart
              series={chart.series}
              xAxis={{ type: 'category', labels: chart.labels, name: 'Date' }}
              yAxis={{ name: 'Share (%)', min: 0 }}
              height={inModal ? 600 : 300}
              showLegend
              legendPosition="top"
            />
          )
        }
      </PopoutCard>

      {requirements.length > 0 && (
        <Card rounded title="Fork minimum versions" subtitle="From this network's config">
          <Table
            variant="nested"
            data={requirements}
            getRowKey={row => row.fork}
            columns={[
              {
                header: 'Fork',
                accessor: row => (
                  <Link
                    to="/ethereum/forks/$fork"
                    params={{ fork: row.fork }}
                    className="font-medium text-foreground capitalize hover:underline"
                  >
                    {row.fork}
                  </Link>
                ),
              },
              {
                header: 'Minimum version',
                accessor: row => <span className="font-mono text-xs/6">{row.minVersion}</span>,
              },
              {
                header: '',
                accessor: row => (
                  <Link
                    to="/ethereum/clients/$client"
                    params={{ client }}
                    search={{ fork: row.fork }}
                    className="text-primary hover:underline"
                  >
                    Readiness
                  </Link>
                ),
                cellClassName: 'text-right',
              },
            ]}
          />
        </Card>
      )}
    </div>
  );
}
