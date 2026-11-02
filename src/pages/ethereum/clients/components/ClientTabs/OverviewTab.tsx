import { type JSX, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { Card } from '@/components/Layout/Card';
import { Table } from '@/components/Lists/Table';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { Stats } from '@/components/DataDisplay/Stats';
import { Timestamp } from '@/components/DataDisplay/Timestamp';
import { MultiLineChart } from '@/components/Charts/MultiLine';
import { getClientColor } from '@/utils/ethereum';
import { formatClientName } from '@/utils/graffiti';
import { compareVersions } from '@/utils/version';
import { formatDailyDate } from '@/pages/ethereum/execution/overview/overview.utils';
import { SHARE_WINDOW_OPTIONS, SHARE_WINDOW_TEXT, UNKNOWN_CLIENT } from '../../constants';
import { SegmentedControl } from '@/components/Forms/SegmentedControl';
import { useClientCounts } from '../../hooks';
import { clientOf, summariseClients } from '../../utils/client-share';
import { crossedThreshold, displayVersion, nextThreshold } from '../../utils/client-versions';
import { SourceAngles } from '../SourceAngles';
import type { ClientTabProps } from './ClientTabs.types';

/** Formats a share, or a dash when nothing was counted */
function percent(part: number, total: number): string {
  return total > 0 ? `${((part / total) * 100).toFixed(1)}%` : '-';
}

/**
 * The client at a glance: its share counted each way, share of blocks over time, newest release and the forks
 * that set a minimum version for it.
 */
export function OverviewTab({
  client,
  layer,
  latest,
  last24h,
  nodes,
  allNodes,
  releases,
  requirements,
  shareWindow,
  onShareWindowChange,
}: ClientTabProps): JSX.Element {
  const counts = useClientCounts(shareWindow);
  const windowText = SHARE_WINDOW_TEXT[shareWindow];
  const name = formatClientName(client);

  const summary = useMemo(() => {
    const summaries = summariseClients(counts.records, layer).filter(s => s.client !== UNKNOWN_CLIENT);
    const index = summaries.findIndex(s => s.client === client);
    return {
      mine: index >= 0 ? summaries[index] : undefined,
      rank: index >= 0 ? index + 1 : undefined,
      of: summaries.length,
    };
  }, [counts.records, layer, client]);

  const shareChart = useMemo(() => {
    const totals = new Map<string, { identified: number; mine: number }>();
    for (const record of counts.records) {
      const recordClient = clientOf(record, layer);
      if (recordClient === UNKNOWN_CLIENT) continue;
      const entry = totals.get(record.key) ?? { identified: 0, mine: 0 };
      entry.identified += record.blocks;
      if (recordClient === client) entry.mine += record.blocks;
      totals.set(record.key, entry);
    }
    return {
      labels: counts.keys.map(formatDailyDate),
      series: [
        {
          name,
          client,
          color: getClientColor(client),
          showArea: true,
          areaOpacity: 0.2,
          data: counts.keys.map(key => {
            const entry = totals.get(key);
            return entry && entry.identified > 0 ? Number(((entry.mine / entry.identified) * 100).toFixed(2)) : null;
          }),
        },
      ],
    };
  }, [counts.records, counts.keys, layer, client, name]);

  const recent = last24h.filter(block => block.version);
  const recentTotal = recent.reduce((sum, row) => sum + row.count, 0);
  const onLatest = latest?.version
    ? recent
        .filter(block => compareVersions(block.version!, latest.version!) >= 0)
        .reduce((sum, row) => sum + row.count, 0)
    : 0;
  const nodesOnLatest =
    layer === 'consensus' && latest?.version
      ? nodes.filter(
          node => compareVersions(displayVersion(node.meta_consensus_version, releases), latest.version!) >= 0
        ).length
      : 0;

  const share = summary.mine?.identifiedShare ?? 0;
  const next = summary.mine ? nextThreshold(share) : null;

  return (
    <div className="flex flex-col gap-6">
      <SegmentedControl
        options={SHARE_WINDOW_OPTIONS}
        value={shareWindow}
        onChange={onShareWindowChange}
        ariaLabel="Share window"
      />
      <SourceAngles
        angles={[
          {
            id: 'stake',
            label: 'Stake-weighted (proposers)',
            value: summary.mine ? `${share.toFixed(1)}%` : '0%',
            detail: `Share of proposed blocks naming a client, ${windowText}`,
          },
          { id: 'p2p', label: 'Node-weighted (P2P peers)', detail: 'Share of peers seen on the P2P network' },
          { id: 'enr', label: 'ENR crawl', detail: 'Share of nodes found in discovery records' },
          layer === 'consensus'
            ? {
                id: 'contributoor',
                label: 'Xatu nodes',
                value: nodes.length.toLocaleString(),
                detail: `${percent(nodes.length, allNodes.length)} of ${allNodes.length.toLocaleString()} Xatu nodes`,
              }
            : {
                id: 'contributoor',
                label: 'Xatu nodes',
                value: nodes.length.toLocaleString(),
                detail: 'ethPandaOps nodes running it, by node name',
              },
        ]}
      />

      <Stats
        gridClassName="grid grid-cols-2 gap-4 lg:grid-cols-4"
        stats={[
          { id: 'blocks', name: `Blocks, ${windowText}`, value: (summary.mine?.blocks ?? 0).toLocaleString() },
          {
            id: 'rank',
            name: `Rank among ${layer === 'consensus' ? 'consensus' : 'execution'} clients`,
            value: summary.rank ? `${summary.rank} of ${summary.of}` : '-',
          },
          {
            id: 'threshold',
            name: next ? `Points below ${next.label}` : 'Diversity threshold',
            value: next ? next.distance.toFixed(1) : summary.mine ? `Over ${crossedThreshold(share)}` : '-',
          },
          {
            id: 'latest',
            name: 'Blocks on latest or newer, 24h',
            value: percent(onLatest, recentTotal),
          },
        ]}
      />

      {!counts.isLoading && !summary.mine ? (
        <Card rounded>
          <p className="text-sm text-muted">No block in this window named this client in its graffiti.</p>
        </Card>
      ) : (
        <PopoutCard
          title="Share of blocks"
          subtitle="Daily share of blocks whose graffiti names a client"
          anchorId="client-share"
          modalSize="full"
        >
          {({ inModal }) => (
            <MultiLineChart
              series={shareChart.series}
              xAxis={{ type: 'category', labels: shareChart.labels, name: 'Date' }}
              yAxis={{ name: 'Share (%)', min: 0 }}
              height={inModal ? 600 : 280}
              showLegend
              legendPosition="top"
            />
          )}
        </PopoutCard>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card rounded title="Latest release">
          {latest?.version ? (
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <dt className="text-xs/5 text-muted">Version</dt>
                <dd>
                  <Link
                    to="/ethereum/clients/$client/$version"
                    params={{ client, version: latest.version }}
                    className="font-mono text-sm/6 font-medium text-primary hover:underline"
                  >
                    {latest.version}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-xs/5 text-muted">Released</dt>
                <dd className="text-sm/6 text-foreground">
                  {latest.release_date ? <Timestamp timestamp={latest.release_date} format="short" /> : '-'}
                </dd>
              </div>
              <div>
                <dt className="text-xs/5 text-muted">Blocks on it or newer, 24h</dt>
                <dd className="text-sm/6 font-medium text-foreground tabular-nums">{percent(onLatest, recentTotal)}</dd>
              </div>
              <div>
                <dt className="text-xs/5 text-muted">Xatu nodes on it or newer</dt>
                <dd className="text-sm/6 font-medium text-foreground tabular-nums">
                  {layer === 'consensus' ? percent(nodesOnLatest, nodes.length) : '-'}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-muted">No published releases.</p>
          )}
        </Card>
        <Card rounded title="Fork minimum versions">
          {requirements.length === 0 ? (
            <p className="text-sm text-muted">No fork on this network sets a minimum version for this client.</p>
          ) : (
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
          )}
        </Card>
      </div>
    </div>
  );
}
