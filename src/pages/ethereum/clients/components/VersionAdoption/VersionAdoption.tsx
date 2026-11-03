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
import { getClientColor } from '@/utils/ethereum';
import { formatDailyDate } from '@/pages/ethereum/execution/overview/overview.utils';
import { CENSUS_TABLES, RESOLVED_STATUSES, type FctPeerCountByElClientDaily } from '../../api/client-models';
import { useCensus, useClientNodes, useNodeVersions, useVersionCounts } from '../../hooks';
import { censusVersionCounts, sum } from '../../utils/census';
import type { ClientLayer } from '../../utils/client-share';
import {
  adoptionByDay,
  countVersionsByDay,
  formatDataDate,
  formatDayLag,
  formatLag,
  last24hStart,
  matchReleaseVersion,
  timeToAdoption,
  timeToDailyAdoption,
  type AdoptionLag,
  type AdoptionPoint,
  type VersionCount,
  type VersionDay,
} from '../../utils/client-versions';

/** Days after release the time to adoption is measured over */
const LAG_HORIZON_DAYS = 60;

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

/** Counts from each angle over the days after a release, for its time to adoption */
interface ReleaseCounts {
  /** Hourly block counts */
  hours: VersionCount[];
  peerDays: VersionDay[];
  /** First day the P2P census has data for */
  peerDataStart?: number;
  xatuDays: VersionDay[];
  isLoading: boolean;
}

/**
 * Counts from the day before a release to the horizon after it, whatever the page's range, so time to adoption is
 * measured for any release the tables reach back to.
 */
function useReleaseCounts(
  client: string,
  layer: ClientLayer,
  releaseTime: number | null | undefined,
  releases: DimClientRelease[]
): ReleaseCounts {
  const now = Math.floor(Date.now() / 1000 / 600) * 600;
  const horizon = releaseTime ? releaseTime + LAG_HORIZON_DAYS * 86400 : undefined;
  const end = horizon && horizon < now ? Math.ceil(horizon / 86400) * 86400 : undefined;
  const firstDay = releaseTime ? Math.floor(releaseTime / 86400) * 86400 : undefined;
  const blocks = useVersionCounts({
    grain: 'hourly',
    client,
    layer,
    from: releaseTime ? Math.floor(releaseTime / 3600) * 3600 - 24 * 3600 : undefined,
    to: end,
    enabled: !!releaseTime,
  });
  const peers = useCensus<FctPeerCountByElClientDaily>(
    layer === 'consensus' ? CENSUS_TABLES.clPeers : CENSUS_TABLES.elPeers,
    releaseTime ? { client_eq: client } : null,
    firstDay,
    end
  );
  const nodes = useNodeVersions(
    client,
    null,
    layer === 'consensus' && !!releaseTime,
    firstDay !== undefined ? { from: firstDay, to: end ?? Infinity } : undefined
  );
  const peerDays = useMemo(
    () => countVersionsByDay(censusVersionCounts(peers.rows, row => row.peer_count)),
    [peers.rows]
  );
  const xatuDays = useMemo(() => countVersionsByDay(nodeVersionCounts(nodes.rows, releases)), [nodes.rows, releases]);
  return {
    hours: blocks.rows,
    peerDays,
    peerDataStart: peers.dataStart,
    xatuDays,
    isLoading: !!releaseTime && (blocks.isLoading || peers.isLoading || nodes.isLoading),
  };
}

/** Where a lag comes from, to say why it could not be measured */
interface LagContext {
  releaseTime: number | null | undefined;
  /** First time the source table has data for */
  dataStart?: number;
  grain: 'hour' | 'day';
}

/** A time to adoption as it reads in a cell */
function lagText(lag: AdoptionLag | null, context: LagContext): string {
  const { releaseTime, dataStart, grain } = context;
  if (!lag || !releaseTime) return '-';
  if (lag.status === 'reached') return grain === 'hour' ? formatLag(lag.seconds) : formatDayLag(lag.seconds);
  if (lag.status === 'not-reached') {
    return releaseTime + LAG_HORIZON_DAYS * 86400 < Date.now() / 1000 ? `${LAG_HORIZON_DAYS}+ days` : 'Not yet';
  }
  if (dataStart !== undefined && dataStart > releaseTime) return `Data from ${formatDataDate(dataStart)}`;
  return '-';
}

/** One version's numbers from one angle */
interface AngleFacts {
  exact: number | null;
  atLeast: number | null;
  lag50: string;
  lag90: string;
}

/** Shares now and time to adoption of a version, from one angle's daily counts */
function angleFacts(
  version: string | undefined,
  release: DimClientRelease | undefined,
  current: VersionDay | undefined,
  lag: (version: string, releaseTime: number, threshold: number) => AdoptionLag | null,
  context: Omit<LagContext, 'releaseTime'>
): AngleFacts | null {
  if (!version) return null;
  const point = current ? adoptionByDay([current], version)[0] : undefined;
  const releaseTime = release?.release_date ?? null;
  const measure = (threshold: number): string =>
    lagText(releaseTime ? lag(version, releaseTime, threshold) : null, { ...context, releaseTime });
  return { exact: point?.exact ?? null, atLeast: point?.atLeast ?? null, lag50: measure(50), lag90: measure(90) };
}

/** The four rows every angle shares */
function angleRows(current: AngleFacts | null, previous: AngleFacts | null): AngleRow[] {
  return [
    { metric: 'Exactly this version', current: shareText(current?.exact), previous: shareText(previous?.exact) },
    {
      metric: 'This version or newer',
      current: shareText(current?.atLeast),
      previous: shareText(previous?.atLeast),
    },
    { metric: 'Time to 50%', current: current?.lag50 ?? '-', previous: previous?.lag50 ?? '-' },
    { metric: 'Time to 90%', current: current?.lag90 ?? '-', previous: previous?.lag90 ?? '-' },
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
  subtitle?: string;
  version: string;
  previous?: string;
  rows: AngleRow[];
  children?: ReactNode;
}

/**
 * One angle on adoption: metrics down the side, this version and the release before across. A grid rather than a
 * table so three fit side by side: labels and notes wrap instead of scrolling.
 */
function AngleCard({ title, subtitle, version, previous, rows, children }: AngleCardProps): JSX.Element {
  const cell = 'border-t border-border/60 py-2';
  return (
    <Card rounded title={title} subtitle={subtitle}>
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
  windowDays: number;
  /** Start of the page's range (unix seconds) */
  rangeStart: number;
}

/**
 * Adoption of one version from three angles side by side: proposed blocks (stake-weighted), P2P peers
 * (node-weighted) and Xatu nodes. Each gives the share on exactly the version and on it or newer, its share over
 * the range and how long it took to reach half and most of its population, against the release before.
 */
export function VersionAdoption({
  client,
  layer,
  version,
  release,
  previous,
  releases,
  window,
  windowDays,
  rangeStart,
}: VersionAdoptionProps): JSX.Element {
  const [mode, setMode] = useState<ShareMode>('atLeast');
  const consensus = layer === 'consensus';
  const previousVersion = previous?.version;

  // Proposed blocks: daily counts over the range, hourly counts after each release
  const blocks = useVersionCounts({ grain: 'daily', client, layer, from: rangeStart });
  const blocks24h = useVersionCounts({ grain: 'hourly', client, layer, from: last24hStart() });
  const entityCounts = useVersionCounts({ grain: 'entity-daily', client, layer, from: rangeStart });
  // Time to adoption reads the days after each release, whatever the range
  const releaseCounts = useReleaseCounts(client, layer, release?.release_date, releases);
  const previousCounts = useReleaseCounts(client, layer, previous?.release_date, releases);
  // P2P peers: the tysm crawler's daily census
  const peers = useCensus<FctPeerCountByElClientDaily>(
    consensus ? CENSUS_TABLES.clPeers : CENSUS_TABLES.elPeers,
    { client_eq: client },
    rangeStart
  );
  // Xatu nodes: those active in the last 24 hours now, and the versions they ran each day over the range
  const { nodes, isLoading: nodesLoading } = useClientNodes(client, layer);
  const nodeDays = useNodeVersions(client, windowDays, consensus);

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

  const blockFacts = (target: DimClientRelease | undefined, counts: ReleaseCounts): AngleFacts | null =>
    angleFacts(
      target?.version,
      target,
      blocksNowDay,
      (v, releaseTime, threshold) =>
        counts.hours.length > 0 ? timeToAdoption(counts.hours, v, releaseTime, threshold) : null,
      { dataStart: blocks.dataStart, grain: 'hour' }
    );
  const dailyFacts = (
    target: DimClientRelease | undefined,
    lagDays: VersionDay[],
    current: VersionDay | undefined,
    dataStart: number | undefined
  ): AngleFacts | null =>
    angleFacts(
      target?.version,
      target,
      current,
      (v, releaseTime, threshold) =>
        timeToDailyAdoption(lagDays, v, releaseTime, threshold, releaseTime + LAG_HORIZON_DAYS * 86400),
      { dataStart, grain: 'day' }
    );

  const isLoading =
    blocks.isLoading ||
    blocks24h.isLoading ||
    entityCounts.isLoading ||
    releaseCounts.isLoading ||
    previousCounts.isLoading ||
    peers.isLoading ||
    (consensus && (nodesLoading || nodeDays.isLoading));
  if (isLoading) return <LoadingContainer className="h-[40rem] rounded-sm" />;

  const thisRelease = release ?? ({ version } as DimClientRelease);
  const blocksNow = blockFacts(thisRelease, releaseCounts);
  const blocksBefore = previous ? blockFacts(previous, previousCounts) : null;
  const latestPeerDay = lastCounted(peerDays);
  const peersNow = dailyFacts(thisRelease, releaseCounts.peerDays, latestPeerDay, releaseCounts.peerDataStart);
  const peersBefore = previous
    ? dailyFacts(previous, previousCounts.peerDays, latestPeerDay, previousCounts.peerDataStart)
    : null;
  const xatuNowFacts = dailyFacts(thisRelease, releaseCounts.xatuDays, xatuNow, undefined);
  const xatuBefore = previous ? dailyFacts(previous, previousCounts.xatuDays, xatuNow, undefined) : null;

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
  const xatuCount = (target?: string): string => (target ? (xatuNow?.counts.get(target) ?? 0).toLocaleString() : '-');

  // A P2P census that starts inside the range has no change over the whole range to show
  const peersFromRange = peers.dataStart === undefined || peers.dataStart <= rangeStart;

  // Today is still filling, so the chart stops at the last full day
  const today = new Date().toISOString().slice(0, 10);
  const days = [...new Set([...blockDays, ...peerDays, ...xatuDays].map(day => day.day))]
    .filter(day => day < today)
    .sort();
  const seriesFor = (points: AdoptionPoint[]): Array<number | null> => {
    const byDay = new Map(points.map(point => [point.day, point[mode]]));
    return days.map(day => {
      const share = byDay.get(day);
      return share == null ? null : Number(share.toFixed(2));
    });
  };
  const color = getClientColor(client);
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
          <strong>P2P peers</strong> are node-weighted: the peers the tysm crawler saw each day, by the version their
          agent states and the commit it resolves to. Peers stating a version without a matching commit are counted
          apart, outside its share.
        </p>
        <p>
          <strong>Xatu nodes</strong> are nodes running Xatu or contributoor that report to ethPandaOps. Only their
          consensus client&apos;s version is known.
        </p>
        <p>
          <strong>Time to 50% and 90%</strong> runs from the release until that share of blocks over a trailing 24
          hours, or of a day&apos;s P2P peers or Xatu nodes, ran it or newer. It is checked over the {LAG_HORIZON_DAYS}{' '}
          days after the release, whatever the range.
        </p>
      </InfoBox>

      <Stats
        gridClassName={clsx('grid grid-cols-1 gap-4', consensus ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}
        stats={[
          {
            id: 'blocks',
            name: 'Proposed blocks',
            subtitle: `On ${version} or newer, last 24h`,
            ...shareNowStat(blocksNow?.atLeast, blockPoints, window),
          },
          {
            id: 'peers',
            name: 'P2P peers',
            subtitle: `On ${version} or newer, ${peers.day ?? '-'}`,
            ...shareNowStat(peersNow?.atLeast, peerPoints, window, peersFromRange),
          },
          ...(consensus
            ? [
                {
                  id: 'nodes',
                  name: 'Xatu nodes',
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
                color,
                showArea: true,
                areaOpacity: 0.12,
              },
              { name: 'P2P peers', data: seriesFor(peerPoints), color, lineStyle: 'dashed' },
              ...(consensus
                ? [{ name: 'Xatu nodes', data: seriesFor(xatuPoints), color, lineStyle: 'dotted' as const }]
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
          subtitle="Stake-weighted, shares over the last 24 hours"
          version={version}
          previous={previousVersion}
          rows={[
            ...angleRows(blocksNow, blocksBefore),
            { metric: `Blocks, ${window}`, current: blockCount(version), previous: blockCount(previousVersion) },
            { metric: `Entities, ${window}`, current: entityCount(version), previous: entityCount(previousVersion) },
          ]}
        />
        <AngleCard
          title="P2P peers"
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
            subtitle="Shares over the last 24 hours"
            version={version}
            previous={previousVersion}
            rows={[
              ...angleRows(xatuNowFacts, xatuBefore),
              { metric: 'Xatu nodes', current: xatuCount(version), previous: xatuCount(previousVersion) },
            ]}
          />
        ) : (
          <Card rounded title="Xatu nodes">
            <p className="text-sm/6 text-muted">Xatu nodes report their consensus client&apos;s version only.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
