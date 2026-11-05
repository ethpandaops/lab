import clsx from 'clsx';
import { Fragment, type JSX, type ReactNode, useMemo, useState } from 'react';
import { Card } from '@/components/Layout/Card';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { Stats } from '@/components/DataDisplay/Stats';
import { InfoBox } from '@/components/Feedback/InfoBox';
import { MultiLineChart } from '@/components/Charts/MultiLine';
import { SegmentedControl } from '@/components/Forms/SegmentedControl';
import type { DimClientRelease, FctHeadFirstSeenByNodeDaily } from '@/api/types.gen';
import { formatClientName } from '@/utils/graffiti';
import { formatDailyDate } from '@/pages/ethereum/execution/overview/overview.utils';
import { CENSUS_TABLES, RESOLVED_STATUSES, type FctPeerCountByElClientDaily } from '../../api/client-models';
import { useCensus, useClientNodes, useNodeVersions, useVersionCounts } from '../../hooks';
import { ANGLE_COLORS } from '../../utils/angle-colors';
import { censusVersionCounts, PEER_SOURCE, sum } from '../../utils/census';
import type { ClientLayer } from '../../utils/client-share';
import {
  adoptionByDay,
  countVersionsByDay,
  formatDataDate,
  last24hStart,
  matchReleaseVersion,
  type AdoptionPoint,
  type VersionCount,
  type VersionDay,
} from '../../utils/client-versions';

/** Whether the chart draws the share on exactly the version or on it or newer */
type ShareMode = 'atLeast' | 'exact';

const SHARE_MODE_OPTIONS: ReadonlyArray<{ value: ShareMode; label: string }> = [
  { value: 'atLeast', label: 'Or newer' },
  { value: 'exact', label: 'Exactly' },
];

/** Formats a share (0-100), or a dash */
function shareText(share: number | null | undefined): string {
  return share == null ? '-' : `${share.toFixed(1)}%`;
}

/**
 * Stat for a share on a version or newer now, with its change since the first day of the range with counts, e.g.
 * "50.8%" and "+48.2 pts over 30d". `fromRangeStart` is false when the counts start inside the range.
 */
function shareNowStat(
  now: number | null | undefined,
  points: AdoptionPoint[],
  window: string,
  fromRangeStart = true
): { value: string; delta?: { value: string; type: 'neutral' } } {
  const counted = points.filter(point => point.atLeast !== null);
  if (now == null || counted.length < 2 || !fromRangeStart) return { value: shareText(now) };
  const change = Math.round((now - counted[0].atLeast!) * 10) / 10;
  return {
    value: shareText(now),
    delta: { value: `${change > 0 ? '+' : ''}${change.toFixed(1)} pts over ${window}`, type: 'neutral' },
  };
}

/** Counts of the given rows as one day */
function asOneDay(rows: VersionCount[]): VersionDay | undefined {
  return countVersionsByDay(rows.map(row => ({ ...row, day: 'now' })))[0];
}

/** Last day with a resolved count */
function lastCounted(days: VersionDay[]): VersionDay | undefined {
  return [...days].reverse().find(day => day.resolved > 0);
}

/** Xatu node days as version counts: one per node, day and the release its consensus version names */
function nodeVersionCounts(rows: FctHeadFirstSeenByNodeDaily[], releases: DimClientRelease[]): VersionCount[] {
  return rows
    .filter(row => row.day_start_date)
    .map(row => ({
      time: Date.parse(`${row.day_start_date}T00:00:00Z`) / 1000,
      day: row.day_start_date!,
      version: matchReleaseVersion(row.meta_consensus_version, releases)?.version ?? null,
      status: '',
      count: 1,
    }));
}

/** One version's shares from one angle */
interface AngleFacts {
  exact: number | null;
  atLeast: number | null;
}

/** Shares now of a version, from one angle's current counts */
function angleFacts(version: string | undefined, current: VersionDay | undefined): AngleFacts | null {
  if (!version) return null;
  const point = current ? adoptionByDay([current], version)[0] : undefined;
  return { exact: point?.exact ?? null, atLeast: point?.atLeast ?? null };
}

/** The rows every angle shares */
function angleRows(current: AngleFacts | null, previous: AngleFacts | null): AngleRow[] {
  return [
    { metric: 'Exactly this version', current: shareText(current?.exact), previous: shareText(previous?.exact) },
    {
      metric: 'This version or newer',
      current: shareText(current?.atLeast),
      previous: shareText(previous?.atLeast),
    },
  ];
}

/** Row of an angle's comparison: one metric for this version and the release before */
interface AngleRow {
  metric: string;
  current: string;
  previous: string;
}

interface AngleCardProps {
  title: string;
  /** The angle's colour from {@link ANGLE_COLORS} */
  color: string;
  subtitle?: string;
  version: string;
  previous?: string;
  rows: AngleRow[];
  children?: ReactNode;
}

/** An angle's name after a swatch of its colour, matching its line in the chart */
function AngleTitle({ title, color }: { title: string; color: string }): JSX.Element {
  return (
    <span className="flex items-center gap-2">
      <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      {title}
    </span>
  );
}

/**
 * One angle on adoption: metrics down the side, this version and the release before across. A grid rather than a
 * table so three fit side by side: labels and notes wrap instead of scrolling.
 */
function AngleCard({ title, color, subtitle, version, previous, rows, children }: AngleCardProps): JSX.Element {
  const cell = 'border-t border-border/60 py-2';
  return (
    <Card rounded title={<AngleTitle title={title} color={color} />} subtitle={subtitle}>
      <div className="flex flex-col gap-3">
        <div
          className={clsx(
            'grid items-baseline text-sm/5',
            previous ? 'grid-cols-[minmax(6rem,1fr)_auto_auto]' : 'grid-cols-[minmax(6rem,1fr)_auto]'
          )}
        >
          <span className="pb-2 text-xs/5 text-muted">Metric</span>
          <span className="pb-2 pl-4 text-right font-mono text-xs/5 text-muted">{version}</span>
          {previous && <span className="pb-2 pl-4 text-right font-mono text-xs/5 text-muted">{previous}</span>}
          {rows.map(row => (
            <Fragment key={row.metric}>
              <span className={clsx(cell, 'text-muted')}>{row.metric}</span>
              <span className={clsx(cell, 'pl-4 text-right font-medium text-foreground tabular-nums')}>
                {row.current}
              </span>
              {previous && (
                <span className={clsx(cell, 'pl-4 text-right text-muted tabular-nums')}>{row.previous}</span>
              )}
            </Fragment>
          ))}
        </div>
        {children}
      </div>
    </Card>
  );
}

export interface VersionAdoptionProps {
  client: string;
  layer: ClientLayer;
  version: string;
  release?: DimClientRelease;
  previous?: DimClientRelease;
  releases: DimClientRelease[];
  /** The range as it reads in copy, e.g. 30d */
  window: string;
  /** Start of the page's range (unix seconds) */
  rangeStart: number;
  /** End of the page's range (unix seconds, exclusive) */
  rangeEnd: number;
}

/**
 * Adoption of one version from three angles side by side: proposed blocks (stake-weighted), P2P peers
 * (node-weighted) and Xatu nodes. Each gives the share on exactly the version and on it or newer, and its share
 * over the range, against the release before.
 */
export function VersionAdoption({
  client,
  layer,
  version,
  release,
  previous,
  releases,
  window,
  rangeStart,
  rangeEnd,
}: VersionAdoptionProps): JSX.Element {
  const [mode, setMode] = useState<ShareMode>('atLeast');
  const consensus = layer === 'consensus';
  const previousVersion = previous?.version;

  // Proposed blocks: daily counts over the range, hourly counts for the last 24 hours
  const blocks = useVersionCounts({ grain: 'daily', client, layer, from: rangeStart });
  const blocks24h = useVersionCounts({ grain: 'hourly', client, layer, from: last24hStart() });
  const entityCounts = useVersionCounts({ grain: 'entity-daily', client, layer, from: rangeStart });
  // P2P peers: the daily census
  const peers = useCensus<FctPeerCountByElClientDaily>(
    consensus ? CENSUS_TABLES.clPeers : CENSUS_TABLES.elPeers,
    { client_eq: client },
    rangeStart
  );
  // Xatu nodes: those active in the last 24 hours now, and the versions they ran each day over the range
  const { nodes, isLoading: nodesLoading } = useClientNodes(client, layer);
  const nodeDays = useNodeVersions(client, null, consensus, { from: rangeStart, to: rangeEnd });

  const blockDays = useMemo(() => countVersionsByDay(blocks.rows), [blocks.rows]);
  const peerDays = useMemo(
    () => countVersionsByDay(censusVersionCounts(peers.rows, row => row.peer_count)),
    [peers.rows]
  );
  const xatuDays = useMemo(
    () => (consensus ? countVersionsByDay(nodeVersionCounts(nodeDays.rows, releases)) : []),
    [consensus, nodeDays.rows, releases]
  );
  const xatuNow = useMemo(
    () =>
      consensus
        ? asOneDay(
            nodes.map(node => ({
              time: 0,
              day: '',
              version: matchReleaseVersion(node.meta_consensus_version, releases)?.version ?? null,
              status: '',
              count: 1,
            }))
          )
        : undefined,
    [consensus, nodes, releases]
  );
  const blocksNowDay = useMemo(() => asOneDay(blocks24h.rows), [blocks24h.rows]);

  const blockPoints = useMemo(() => adoptionByDay(blockDays, version), [blockDays, version]);
  const peerPoints = useMemo(() => adoptionByDay(peerDays, version), [peerDays, version]);
  const xatuPoints = useMemo(() => adoptionByDay(xatuDays, version), [xatuDays, version]);

  const isLoading =
    blocks.isLoading ||
    blocks24h.isLoading ||
    entityCounts.isLoading ||
    peers.isLoading ||
    (consensus && (nodesLoading || nodeDays.isLoading));
  if (isLoading) return <LoadingContainer className="h-[40rem] rounded-sm" />;

  const blocksNow = angleFacts(version, blocksNowDay);
  const blocksBefore = angleFacts(previousVersion, blocksNowDay);
  const latestPeerDay = lastCounted(peerDays);
  const peersNow = angleFacts(version, latestPeerDay);
  const peersBefore = angleFacts(previousVersion, latestPeerDay);
  const xatuNowFacts = angleFacts(version, xatuNow);
  const xatuBefore = angleFacts(previousVersion, xatuNow);

  const blockCount = (target?: string): string =>
    target
      ? sum(
          blocks.rows.filter(row => row.version === target),
          row => row.count
        ).toLocaleString()
      : '-';
  const entityCount = (target?: string): string =>
    target
      ? new Set(
          entityCounts.rows.filter(row => row.version === target && row.entity).map(row => row.entity)
        ).size.toLocaleString()
      : '-';
  const isResolved = (row: { release_status?: string }): boolean => RESOLVED_STATUSES.has(row.release_status ?? '');
  const peerCount = (target?: string): string =>
    target
      ? sum(
          peers.latest.filter(row => row.version === target && isResolved(row)),
          row => row.peer_count
        ).toLocaleString()
      : '-';
  const statedOnly = sum(
    peers.latest.filter(row => row.version === version && !isResolved(row)),
    row => row.peer_count
  );
  const knownShare = blocksNowDay
    ? shareText((blocksNowDay.resolved / (blocksNowDay.resolved + blocksNowDay.unresolved)) * 100)
    : '-';
  const xatuCount = (target?: string): string => (target ? (xatuNow?.counts.get(target) ?? 0).toLocaleString() : '-');

  // A P2P census that starts inside the range has no change over the whole range to show
  const peersFromRange = peers.dataStart === undefined || peers.dataStart <= rangeStart;

  const days = [...new Set([...blockDays, ...peerDays, ...xatuDays].map(day => day.day))].sort();
  const seriesFor = (points: AdoptionPoint[]): Array<number | null> => {
    const byDay = new Map(points.map(point => [point.day, point[mode]]));
    return days.map(day => {
      const share = byDay.get(day);
      return share == null ? null : Number(share.toFixed(2));
    });
  };
  const releaseDay = release?.release_date ? new Date(release.release_date * 1000).toISOString().slice(0, 10) : null;
  const peerDataNote =
    peers.dataStart !== undefined && peers.dataStart > rangeStart
      ? `; P2P peers data from ${formatDataDate(peers.dataStart)}`
      : '';

  return (
    <div className="flex flex-col gap-4">
      <InfoBox summary="How adoption is measured">
        <p>
          <strong>Proposed blocks</strong> are stake-weighted: each block&apos;s graffiti version or commit is matched
          against the client&apos;s releases, and blocks that match none are left out of the shares.
        </p>
        <p>
          <strong>P2P peers</strong> are node-weighted: the peers {PEER_SOURCE[layer]} each day, by the version their
          agent states and the commit it resolves to. Peers stating a version without a matching commit are counted
          apart, outside its share.
        </p>
        <p>
          <strong>Xatu nodes</strong> are nodes running Xatu or contributoor that report to ethPandaOps. Only their
          consensus client&apos;s version is known.
        </p>
      </InfoBox>

      <Stats
        gridClassName={clsx('grid grid-cols-1 gap-4', consensus ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}
        stats={[
          {
            id: 'blocks',
            name: 'Proposed blocks',
            accentColor: ANGLE_COLORS.blocks,
            subtitle: `On ${version} or newer, known-release blocks, 24h`,
            ...shareNowStat(blocksNow?.atLeast, blockPoints, window),
          },
          {
            id: 'peers',
            name: 'P2P peers',
            accentColor: ANGLE_COLORS.peers,
            subtitle: `On ${version} or newer, ${peers.day ?? '-'}`,
            ...shareNowStat(peersNow?.atLeast, peerPoints, window, peersFromRange),
          },
          ...(consensus
            ? [
                {
                  id: 'nodes',
                  name: 'Xatu nodes',
                  accentColor: ANGLE_COLORS.xatu,
                  subtitle: `On ${version} or newer, last 24h`,
                  ...shareNowStat(xatuNowFacts?.atLeast, xatuPoints, window),
                },
              ]
            : []),
        ]}
      />

      <PopoutCard
        title="Adoption"
        subtitle={`Daily share on ${mode === 'exact' ? `exactly ${version}` : `${version} or newer`}${peerDataNote}`}
        anchorId="version-adoption"
        modalSize="full"
        headerActions={
          <SegmentedControl options={SHARE_MODE_OPTIONS} value={mode} onChange={setMode} ariaLabel="Share" />
        }
      >
        {({ inModal }) => (
          <MultiLineChart
            series={[
              {
                name: 'Proposed blocks',
                data: seriesFor(blockPoints),
                color: ANGLE_COLORS.blocks,
                showArea: true,
                areaOpacity: 0.12,
              },
              { name: 'P2P peers', data: seriesFor(peerPoints), color: ANGLE_COLORS.peers, lineStyle: 'dashed' },
              ...(consensus
                ? [
                    {
                      name: 'Xatu nodes',
                      data: seriesFor(xatuPoints),
                      color: ANGLE_COLORS.xatu,
                      lineStyle: 'dotted' as const,
                    },
                  ]
                : []),
            ]}
            xAxis={{ type: 'category', labels: days.map(formatDailyDate), name: 'Date' }}
            yAxis={{ name: 'Share (%)', min: 0, max: 100 }}
            height={inModal ? 600 : 320}
            showLegend
            legendPosition="top"
            connectNulls
            markLines={
              releaseDay && days.includes(releaseDay)
                ? [{ xValue: formatDailyDate(releaseDay), label: 'Released', lineStyle: 'dashed' }]
                : undefined
            }
          />
        )}
      </PopoutCard>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <AngleCard
          title="Proposed blocks"
          color={ANGLE_COLORS.blocks}
          subtitle="Stake-weighted, shares of blocks with a known release over the last 24 hours"
          version={version}
          previous={previousVersion}
          rows={[
            ...angleRows(blocksNow, blocksBefore),
            { metric: `Blocks, ${window}`, current: blockCount(version), previous: blockCount(previousVersion) },
            { metric: `Entities, ${window}`, current: entityCount(version), previous: entityCount(previousVersion) },
          ]}
        >
          <dl className="flex items-baseline justify-between gap-4 border-t border-border/60 pt-2 text-sm/5">
            <dt className="text-muted">{formatClientName(client)} blocks with a known release, last 24h</dt>
            <dd className="font-medium text-foreground tabular-nums">{knownShare}</dd>
          </dl>
        </AngleCard>
        <AngleCard
          title="P2P peers"
          color={ANGLE_COLORS.peers}
          subtitle={`Node-weighted, shares on ${peers.day ?? '-'}`}
          version={version}
          previous={previousVersion}
          rows={[
            ...angleRows(peersNow, peersBefore),
            { metric: 'P2P peers', current: peerCount(version), previous: peerCount(previousVersion) },
          ]}
        >
          {statedOnly > 0 && (
            <p className="text-xs/5 text-muted">
              Also stated by {statedOnly.toLocaleString()} P2P {statedOnly === 1 ? 'peer' : 'peers'} without a matching
              commit
            </p>
          )}
        </AngleCard>
        {consensus ? (
          <AngleCard
            title="Xatu nodes"
            color={ANGLE_COLORS.xatu}
            subtitle="Shares over the last 24 hours"
            version={version}
            previous={previousVersion}
            rows={[
              ...angleRows(xatuNowFacts, xatuBefore),
              { metric: 'Xatu nodes', current: xatuCount(version), previous: xatuCount(previousVersion) },
            ]}
          />
        ) : (
          <Card rounded title={<AngleTitle title="Xatu nodes" color={ANGLE_COLORS.xatu} />}>
            <p className="text-sm/6 text-muted">Xatu nodes report their consensus client&apos;s version only.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
