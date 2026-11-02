import { type JSX, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { Card } from '@/components/Layout/Card';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { Table } from '@/components/Lists/Table';
import type { Column } from '@/components/Lists/Table/Table.types';
import { MultiLineChart, type SeriesData } from '@/components/Charts/MultiLine';
import { Badge } from '@/components/Elements/Badge';
import type {
  DimClientRelease,
  FctEngineGetBlobsByElClientDaily,
  FctEngineNewPayloadByElClientDaily,
  FctEngineNewPayloadWinrateDaily,
  FctOpcodeCostByElClientVersion,
} from '@/api/types.gen';
import { getDataVizColors } from '@/utils/dataVizColors';
import { getClientColor, normalizeClientName } from '@/utils/ethereum';
import { formatClientName } from '@/utils/graffiti';
import { compareVersions } from '@/utils/version';
import { formatDailyDate } from '@/pages/ethereum/execution/overview/overview.utils';
import {
  buildLine,
  buildMatchesRelease,
  compareOpcodeCosts,
  opcodeCosts,
  summariseBuildLines,
  type BuildLineStats,
} from '../../utils/client-versions';

export interface ReferenceEngineProps {
  client: string;
  releases: DimClientRelease[];
  newPayload: FctEngineNewPayloadByElClientDaily[];
  getBlobs: FctEngineGetBlobsByElClientDaily[];
  winrate: FctEngineNewPayloadWinrateDaily[];
  opcodes: FctOpcodeCostByElClientVersion[];
  isLoading: boolean;
  /** Build lines to compare, labelled, e.g. this version, the previous and the newest; all lines when omitted */
  focus?: Array<{ label: string; line: string }>;
}

/** Days with a value per build line, for an over-time chart */
function lineSeries(
  rows: FctEngineNewPayloadByElClientDaily[],
  lines: Array<{ name: string; line: string }>,
  value: (row: FctEngineNewPayloadByElClientDaily) => number | null
): { labels: string[]; series: SeriesData[] } {
  const { CHART_CATEGORICAL_COLORS } = getDataVizColors();
  const days = [...new Set(rows.map(row => row.day_start_date ?? ''))].filter(Boolean).sort();
  const byLineDay = new Map<string, { weighted: number; observations: number }>();
  for (const row of rows) {
    const observations = row.observation_count ?? 0;
    const v = value(row);
    if (!observations || v === null) continue;
    const key = `${buildLine(row.meta_execution_version ?? '')}|${row.day_start_date}`;
    const entry = byLineDay.get(key) ?? { weighted: 0, observations: 0 };
    entry.weighted += v * observations;
    entry.observations += observations;
    byLineDay.set(key, entry);
  }
  return {
    labels: days.map(formatDailyDate),
    series: lines.map(({ name, line }, index) => ({
      name,
      data: days.map(day => {
        const entry = byLineDay.get(`${line}|${day}`);
        return entry ? Number((entry.weighted / entry.observations).toFixed(1)) : null;
      }),
      color: CHART_CATEGORICAL_COLORS[index % CHART_CATEGORICAL_COLORS.length],
      showSymbol: true,
      symbolSize: 4,
    })),
  };
}

/** Release a build line reports, if one is published */
function releaseOf(line: string, releases: DimClientRelease[]): DimClientRelease | undefined {
  return releases.find(release => !release.prerelease && buildMatchesRelease(line, release));
}

/**
 * How the client's builds perform on the EIP-7870 reference nodes, which share standardised hardware, so builds
 * compare fairly: engine_newPayload latency and throughput, engine_getBlobs, newPayload wins and opcode costs.
 */
export function ReferenceEngine({
  client,
  releases,
  newPayload,
  getBlobs,
  winrate,
  opcodes,
  isLoading,
  focus,
}: ReferenceEngineProps): JSX.Element {
  const lines = useMemo(() => summariseBuildLines(newPayload), [newPayload]);
  const blobLines = useMemo(
    () => summariseBuildLines(getBlobs.map(row => ({ ...row, avg_gas_used: 0 }) as FctEngineNewPayloadByElClientDaily)),
    [getBlobs]
  );
  const implementation = newPayload[0]?.meta_execution_implementation;

  const shown = useMemo(
    () =>
      focus
        ? focus
            .filter(item => lines.some(line => line.line === item.line))
            .map(item => ({ name: item.label, line: item.line }))
        : [...lines]
            .sort((a, b) => b.lastDay.localeCompare(a.lastDay) || b.observations - a.observations)
            .slice(0, 5)
            .map(line => ({ name: line.line, line: line.line })),
    [focus, lines]
  );
  const latencyChart = useMemo(
    () => lineSeries(newPayload, shown, row => row.p50_duration_ms ?? null),
    [newPayload, shown]
  );
  const throughputChart = useMemo(
    () =>
      lineSeries(newPayload, shown, row =>
        row.avg_duration_ms ? (row.avg_gas_used ?? 0) / row.avg_duration_ms / 1000 : null
      ),
    [newPayload, shown]
  );

  const winShare = useMemo(() => {
    const days = [...new Set(winrate.map(row => row.day_start_date ?? ''))].filter(Boolean).sort();
    const totals = new Map<string, { all: number; mine: number }>();
    for (const row of winrate) {
      const entry = totals.get(row.day_start_date ?? '') ?? { all: 0, mine: 0 };
      entry.all += row.win_count ?? 0;
      if (normalizeClientName(row.meta_execution_implementation ?? '') === client) entry.mine += row.win_count ?? 0;
      totals.set(row.day_start_date ?? '', entry);
    }
    let all = 0;
    let mine = 0;
    for (const entry of totals.values()) {
      all += entry.all;
      mine += entry.mine;
    }
    return {
      share: all > 0 ? (mine / all) * 100 : null,
      labels: days.map(formatDailyDate),
      series: [
        {
          name: formatClientName(client),
          client,
          data: days.map(day => {
            const entry = totals.get(day);
            return entry && entry.all > 0 ? Number(((entry.mine / entry.all) * 100).toFixed(1)) : null;
          }),
          color: getClientColor(client),
        },
      ] as SeriesData[],
    };
  }, [winrate, client]);

  const opcodeChanges = useMemo(() => {
    const ordered = focus
      ? focus.map(item => item.line)
      : [...lines].sort((a, b) => b.lastDay.localeCompare(a.lastDay)).map(line => line.line);
    const byLine = new Map<string, FctOpcodeCostByElClientVersion[]>();
    for (const row of opcodes) {
      const line = buildLine(row.meta_execution_version ?? '');
      byLine.set(line, [...(byLine.get(line) ?? []), row]);
    }
    // Newer build first, so the change reads as what the newer build did
    const withCosts = ordered.filter(line => byLine.has(line)).sort((a, b) => compareVersions(b, a));
    if (withCosts.length < 2) return null;
    const [current, previous] = withCosts;
    return {
      current,
      previous,
      changes: compareOpcodeCosts(opcodeCosts(byLine.get(current)!), opcodeCosts(byLine.get(previous)!)),
    };
  }, [opcodes, lines, focus]);

  const visibleLines = focus
    ? focus.flatMap(item => {
        const stats = lines.find(line => line.line === item.line);
        return stats ? [{ ...stats, label: item.label }] : [];
      })
    : lines.map(line => ({ ...line, label: undefined as string | undefined }));

  const columns: Column<BuildLineStats & { label?: string }>[] = [
    ...(focus ? [{ header: '', accessor: (row: BuildLineStats & { label?: string }) => row.label ?? '' }] : []),
    {
      header: 'Build',
      accessor: row => {
        const release = releaseOf(row.line, releases);
        return (
          <span className="inline-flex items-center gap-2" title={row.builds.join('\n')}>
            <span className="font-mono text-xs/6 text-foreground">{row.line}</span>
            {release?.version && (
              <Link
                to="/ethereum/clients/$client/$version"
                params={{ client, version: release.version }}
                className="font-mono text-xs/6 text-primary hover:underline"
              >
                {release.version}
              </Link>
            )}
          </span>
        );
      },
    },
    {
      header: 'p50',
      accessor: row => `${row.p50.toFixed(0)} ms`,
      cellClassName: 'text-right tabular-nums font-medium text-foreground',
      headerClassName: 'text-right',
    },
    {
      header: 'p95',
      accessor: row => `${row.p95.toFixed(0)} ms`,
      cellClassName: 'text-right tabular-nums text-muted',
      headerClassName: 'text-right',
    },
    {
      header: 'MGas/s',
      accessor: row => row.mgasPerSecond.toFixed(0),
      cellClassName: 'text-right tabular-nums text-foreground',
      headerClassName: 'text-right',
    },
    {
      header: 'Calls',
      accessor: row => row.observations.toLocaleString(),
      cellClassName: 'text-right tabular-nums text-muted',
      headerClassName: 'text-right',
    },
    {
      header: 'Last day',
      accessor: row => row.lastDay,
      cellClassName: 'tabular-nums text-muted',
    },
  ];

  const blobColumns: Column<BuildLineStats>[] = [
    { header: 'Build', accessor: row => <span className="font-mono text-xs/6">{row.line}</span> },
    {
      header: 'p50',
      accessor: row => `${row.p50.toFixed(0)} ms`,
      cellClassName: 'text-right tabular-nums font-medium text-foreground',
      headerClassName: 'text-right',
    },
    {
      header: 'p95',
      accessor: row => `${row.p95.toFixed(0)} ms`,
      cellClassName: 'text-right tabular-nums text-muted',
      headerClassName: 'text-right',
    },
    {
      header: 'Calls',
      accessor: row => row.observations.toLocaleString(),
      cellClassName: 'text-right tabular-nums text-muted',
      headerClassName: 'text-right',
    },
  ];

  if (isLoading) return <p className="text-sm text-muted">Loading reference node data</p>;
  if (lines.length === 0) {
    return (
      <Card rounded title="Reference nodes">
        <p className="text-sm/6 text-muted">
          The EIP-7870 reference nodes have not run this client in the last 90 days.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <span className="text-muted">EIP-7870 reference nodes, last 90 days</span>
        {implementation && (
          <Link
            to="/ethereum/execution/payloads"
            search={{ elClient: implementation }}
            className="text-primary hover:underline"
          >
            Slow payloads
          </Link>
        )}
        <Link to="/ethereum/execution/timings" search={{ tab: 'clients' }} className="text-primary hover:underline">
          Engine timings
        </Link>
        <Link to="/ethereum/execution/performance" className="text-primary hover:underline">
          Opcode costs
        </Link>
      </div>

      <Card rounded title="engine_newPayload by build">
        {visibleLines.length === 0 ? (
          <p className="text-sm/6 text-muted">No reference node ran these builds.</p>
        ) : (
          <Table variant="nested" data={visibleLines} columns={columns} getRowKey={row => row.line} />
        )}
      </Card>

      {shown.length > 0 && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <PopoutCard
            title="newPayload p50"
            subtitle="Daily median per build"
            anchorId="reference-latency"
            modalSize="full"
          >
            {({ inModal }) => (
              <MultiLineChart
                series={latencyChart.series}
                xAxis={{ type: 'category', labels: latencyChart.labels, name: 'Date' }}
                yAxis={{ name: 'Duration (ms)', min: 0 }}
                height={inModal ? 600 : 300}
                showLegend
                legendPosition="top"
                syncGroup={inModal ? undefined : 'reference-engine'}
              />
            )}
          </PopoutCard>
          <PopoutCard
            title="Throughput"
            subtitle="Daily mean gas over mean newPayload duration per build"
            anchorId="reference-throughput"
            modalSize="full"
          >
            {({ inModal }) => (
              <MultiLineChart
                series={throughputChart.series}
                xAxis={{ type: 'category', labels: throughputChart.labels, name: 'Date' }}
                yAxis={{ name: 'MGas/s', min: 0 }}
                height={inModal ? 600 : 300}
                showLegend
                legendPosition="top"
                syncGroup={inModal ? undefined : 'reference-engine'}
              />
            )}
          </PopoutCard>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {opcodeChanges ? (
          <Card
            rounded
            title="Opcode cost changes"
            subtitle={`${opcodeChanges.current} against ${opcodeChanges.previous}; grey changes are within the fit's interval`}
          >
            <Table
              variant="nested"
              data={opcodeChanges.changes.slice(0, 12)}
              getRowKey={row => row.group}
              columns={[
                { header: 'Opcode', accessor: row => <span className="font-mono text-xs/6">{row.group}</span> },
                {
                  header: opcodeChanges.previous,
                  accessor: row => `${row.previous.toFixed(1)} ns`,
                  cellClassName: 'text-right tabular-nums text-muted',
                  headerClassName: 'text-right',
                },
                {
                  header: opcodeChanges.current,
                  accessor: row => `${row.current.toFixed(1)} ns`,
                  cellClassName: 'text-right tabular-nums text-foreground',
                  headerClassName: 'text-right',
                },
                {
                  header: 'Change',
                  accessor: row => (
                    <Badge
                      color={!row.significant ? 'gray' : row.change < 0 ? 'green' : 'red'}
                      size="small"
                      variant="flat"
                    >
                      {row.change > 0 ? '+' : ''}
                      {(row.change * 100).toFixed(1)}%
                    </Badge>
                  ),
                  cellClassName: 'text-right',
                  headerClassName: 'text-right',
                },
              ]}
            />
          </Card>
        ) : (
          <Card rounded title="Opcode cost changes">
            <p className="text-sm/6 text-muted">Opcode costs need a day of blocks on two builds to compare.</p>
          </Card>
        )}

        <div className="flex flex-col gap-4">
          {winShare.share !== null && (
            <PopoutCard
              title="newPayload wins"
              subtitle={`Share of slots where ${formatClientName(client)} had the fastest newPayload`}
              anchorId="reference-wins"
              modalSize="full"
            >
              {({ inModal }) => (
                <MultiLineChart
                  series={winShare.series}
                  xAxis={{ type: 'category', labels: winShare.labels, name: 'Date' }}
                  yAxis={{ name: 'Share (%)', min: 0 }}
                  height={inModal ? 600 : 220}
                />
              )}
            </PopoutCard>
          )}
          {blobLines.length > 0 && (
            <Card rounded title="engine_getBlobs by build">
              <Table variant="nested" data={blobLines.slice(0, 6)} columns={blobColumns} getRowKey={row => row.line} />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
