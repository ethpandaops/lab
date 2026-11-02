import { type JSX, useCallback, useMemo } from 'react';
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { ArrowTopRightOnSquareIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/16/solid';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { Card } from '@/components/Layout/Card';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { Alert } from '@/components/Feedback/Alert';
import { Badge } from '@/components/Elements/Badge';
import { Stats } from '@/components/DataDisplay/Stats';
import { Timestamp } from '@/components/DataDisplay/Timestamp';
import { Table } from '@/components/Lists/Table';
import { MultiLineChart } from '@/components/Charts/MultiLine';
import { SegmentedControl } from '@/components/Forms/SegmentedControl';
import type { DimClientRelease, FctHeadFirstSeenByNodeDaily, IntCustodyProbe } from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { getClientColor, normalizeClientName } from '@/utils/ethereum';
import { formatClientName } from '@/utils/graffiti';
import { formatDailyDate } from '@/pages/ethereum/execution/overview/overview.utils';
import { InspectSection } from '@/pages/ethereum/validators/components/InspectSection';
import { VERSION_WINDOW_DAYS, VERSION_WINDOW_OPTIONS, type VersionWindow } from './constants';
import { ClientHeader, EntityVersionBars, ForkReadinessCard, ReferenceEngine, VersionNetwork } from './components';
import {
  PROBE_SLICE_SECONDS,
  PROBE_SLICES,
  useClientNodes,
  useClientReleases,
  useNodeVersions,
  useProbeSample,
  useReferenceEngine,
  useVersionCounts,
} from './hooks';
import {
  adoptionByDay,
  buildMatchesRelease,
  clientLayerOf,
  countVersionsByDay,
  displayVersion,
  findRelease,
  formatLag,
  nextRelease,
  previousRelease,
  releaseName,
  releaseUrl as releasePageUrl,
  shareStat,
  summariseBuildLines,
  timeToAdoption,
  OTHER_VERSION_COLOR,
  type AdoptionLag,
  type VersionCount,
  last24hStart,
  windowStart,
} from './utils/client-versions';
import { forkRequirements } from './utils/fork-requirements';
import type { ClientLayer } from './utils/client-share';

/** Formats a share, or a dash when nothing was counted */
function percent(part: number, total: number): string {
  return total > 0 ? `${((part / total) * 100).toFixed(1)}%` : '-';
}

/** Value and note for an adoption lag */
function lagValue(lag: MeasuredLag | null): { value: string; note?: string } {
  if (!lag) return { value: '-' };
  if (lag.status === 'reached') return { value: formatLag(lag.seconds) };
  if (lag.status === 'not-reached') return { value: lag.horizonPassed ? `Over ${LAG_HORIZON_DAYS} days` : 'Not yet' };
  return { value: '-', note: 'Released before the window' };
}

/** Days after release the time to adoption is measured over */
const LAG_HORIZON_DAYS = 60;

/** Lag with whether the measured horizon has passed, so not reaching a share reads as over it */
type MeasuredLag = AdoptionLag & { horizonPassed?: boolean };

/**
 * Hourly counts after a release within the page's range, for its time to adoption. A release before the range
 * reads as released before the window.
 */
function useReleaseHours(
  client: string,
  layer: ClientLayer | null,
  releaseTime: number | null | undefined,
  rangeStart: number
): { rows: VersionCount[]; horizonPassed: boolean } {
  const from = releaseTime ? Math.max(Math.floor(releaseTime / 3600) * 3600 - 24 * 3600, rangeStart) : undefined;
  const horizon = releaseTime ? releaseTime + LAG_HORIZON_DAYS * 86400 : undefined;
  const now = Math.floor(Date.now() / 1000 / 600) * 600;
  const { rows } = useVersionCounts({
    grain: 'hourly',
    client,
    layer,
    from,
    to: horizon && horizon < now ? Math.ceil(horizon / 3600) * 3600 : undefined,
    enabled: !!releaseTime && !!layer,
  });
  return { rows, horizonPassed: !!horizon && horizon < now };
}

/** Blocks, entities and Xatu nodes on one version over the page's range */
interface VersionFacts {
  release?: DimClientRelease;
  blocks: number;
  entities: number;
  nodes: number;
  lag50: MeasuredLag | null;
  lag90: MeasuredLag | null;
}

/**
 * Facts about one version over the page's range: blocks, entities, time to adoption from the hours after release,
 * and Xatu nodes that ran it on any day.
 */
function versionFacts(
  release: DimClientRelease | undefined,
  version: string,
  history: VersionCount[],
  entityRows: VersionCount[],
  hours: { rows: VersionCount[]; horizonPassed: boolean },
  nodes: VersionNode[]
): VersionFacts {
  const releaseTime = release?.release_date ?? null;
  const lag = (threshold: number): MeasuredLag | null =>
    releaseTime !== null && hours.rows.length > 0
      ? { ...timeToAdoption(hours.rows, version, releaseTime, threshold), horizonPassed: hours.horizonPassed }
      : null;
  return {
    release,
    blocks: history.filter(row => row.version === version).reduce((sum, row) => sum + row.count, 0),
    entities: new Set(
      entityRows
        .filter(row => row.version === version)
        .map(row => row.entity)
        .filter(Boolean)
    ).size,
    nodes: nodes.filter(node => node.version === version).length,
    lag50: lag(50),
    lag90: lag(90),
  };
}

/** Link to a version page */
function VersionLink({ client, version }: { client: string; version: string }): JSX.Element {
  return (
    <Link
      to="/ethereum/clients/$client/$version"
      params={{ client, version }}
      className="font-mono text-primary hover:underline"
    >
      {version}
    </Link>
  );
}

/**
 * One release of a client: adoption over time, how long it took to reach most blocks, who runs it and how it
 * compares with the release before.
 */
export function VersionPage(): JSX.Element {
  const params = useParams({ from: '/ethereum/clients/$client/$version' });
  const search = useSearch({ from: '/ethereum/clients/$client/$version' });
  const navigate = useNavigate({ from: '/ethereum/clients/$client/$version' });
  const { currentNetwork } = useNetwork();
  const client = normalizeClientName(params.client);
  const layer = clientLayerOf(client);

  const { releases, latest, isLoading: releasesLoading } = useClientReleases(layer ? client : undefined);
  const release = findRelease(releases, params.version);
  // Long enough by default to cover adoption since release
  const releaseAge = release?.release_date ? Date.now() / 1000 - release.release_date : 0;
  const window: VersionWindow = search.w ?? (releaseAge > 25 * 86400 ? '90d' : '30d');
  const version = release?.version ?? params.version;
  const previous = release ? previousRelease(releases, release) : undefined;
  const next = release ? nextRelease(releases, release) : undefined;

  // Everything below the range control covers the range
  const windowDays = VERSION_WINDOW_DAYS[window];
  const rangeStart = windowStart(windowDays);
  const history = useVersionCounts({ grain: 'daily', client, layer, from: rangeStart, enabled: !!layer });
  const entityCounts = useVersionCounts({ grain: 'entity-daily', client, layer, from: rangeStart, enabled: !!layer });
  const releaseHours = useReleaseHours(client, layer, release?.release_date, rangeStart);
  const previousHours = useReleaseHours(client, layer, previous?.release_date, rangeStart);
  const blocksLoading = history.isLoading;
  // The fork card above the control reads the last 24 hours and the nodes active now
  const recent24h = useVersionCounts({ grain: 'hourly', client, layer, from: last24hStart(), enabled: !!layer });
  const { nodes } = useClientNodes(client, layer);
  const nodeDays = useNodeVersions(client, windowDays, layer === 'consensus');
  const probeVersions = useMemo(
    () => [version, previous?.version].filter((item): item is string => !!item),
    [version, previous?.version]
  );
  const probes = useProbeSample(client, probeVersions, rangeStart, layer === 'consensus');
  const reference = useReferenceEngine(client, layer === 'execution', windowDays);

  const days = useMemo(() => countVersionsByDay(history.rows), [history.rows]);
  const adoption = useMemo(() => adoptionByDay(days, version), [days, version]);
  const previousAdoption = useMemo(
    () => (previous?.version ? adoptionByDay(days, previous.version) : []),
    [days, previous?.version]
  );
  const versionNodes = useMemo(() => nodesByVersion(nodeDays.rows, releases), [nodeDays.rows, releases]);
  const facts = useMemo(
    () => versionFacts(release, version, history.rows, entityCounts.rows, releaseHours, versionNodes),
    [release, version, history.rows, entityCounts.rows, releaseHours, versionNodes]
  );
  const previousFacts = useMemo(
    () =>
      previous?.version
        ? versionFacts(previous, previous.version, history.rows, entityCounts.rows, previousHours, versionNodes)
        : null,
    [previous, history.rows, entityCounts.rows, previousHours, versionNodes]
  );

  const requirement = forkRequirements(currentNetwork, client).find(item => item.fork === search.fork);

  const onWindowChange = useCallback(
    (value: VersionWindow) => navigate({ search: prev => ({ ...prev, w: value as '30d' | '90d' }), replace: true }),
    [navigate]
  );

  const referenceFocus = useMemo(() => {
    if (layer !== 'execution') return [];
    const lines = summariseBuildLines(reference.newPayload);
    const lineFor = (target?: DimClientRelease): string | undefined =>
      lines.filter(line => buildMatchesRelease(line.line, target)).sort((a, b) => b.observations - a.observations)[0]
        ?.line;
    const newest = [...lines].sort((a, b) => b.lastDay.localeCompare(a.lastDay) || b.observations - a.observations)[0];
    const focus: Array<{ label: string; line: string }> = [];
    const mine = lineFor(release);
    if (mine) focus.push({ label: 'This version', line: mine });
    const before = lineFor(previous);
    if (before) focus.push({ label: 'Previous', line: before });
    if (newest && !focus.some(item => item.line === newest.line)) focus.push({ label: 'Newest', line: newest.line });
    return focus;
  }, [layer, reference.newPayload, release, previous]);

  if (!layer) {
    return (
      <Container>
        <Header title={`${formatClientName(client)} ${params.version}`} />
        <Alert
          variant="warning"
          title="Unknown client"
          description={`"${params.client}" is not a consensus or execution client this site knows.`}
          link={{ label: 'All clients', to: '/ethereum/clients' }}
        />
      </Container>
    );
  }

  const name = formatClientName(client);
  const releaseUrl = releasePageUrl(release);
  const title = releaseName(release);
  const releaseDay = release?.release_date ? new Date(release.release_date * 1000).toISOString().slice(0, 10) : null;
  const lag50 = lagValue(facts.lag50);
  const lag90 = lagValue(facts.lag90);
  const loading = releasesLoading || blocksLoading;

  return (
    <Container>
      <div className="flex flex-col gap-6">
        <ClientHeader
          client={client}
          layer={layer}
          title={
            <>
              <Link to="/ethereum/clients/$client" params={{ client }} className="hover:underline">
                {name}
              </Link>{' '}
              <span className="font-mono">{version}</span>
            </>
          }
          badges={
            <>
              {release && release.version === latest?.version && (
                <Badge color="green" size="small" variant="flat">
                  Latest
                </Badge>
              )}
              {release?.prerelease && (
                <Badge color="yellow" size="small" variant="flat">
                  Prerelease
                </Badge>
              )}
            </>
          }
          details={[
            {
              label: 'Released',
              value: release?.release_date ? <Timestamp timestamp={release.release_date} format="short" /> : '-',
            },
            {
              label: 'Release',
              value: releaseUrl ? (
                <a
                  href={releaseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-primary hover:underline"
                >
                  {release?.tag}
                  <ArrowTopRightOnSquareIcon className="size-3" />
                </a>
              ) : (
                '-'
              ),
            },
            ...(title ? [{ label: 'Name', value: title }] : []),
            {
              label: 'Previous release',
              value: previous?.version ? <VersionLink client={client} version={previous.version} /> : '-',
            },
            {
              label: 'Latest release',
              value: latest?.version ? <VersionLink client={client} version={latest.version} /> : '-',
            },
          ]}
          actions={
            <>
              {previous?.version && (
                <Link
                  to="/ethereum/clients/$client/$version"
                  params={{ client, version: previous.version }}
                  search={{ w: search.w, fork: search.fork }}
                  className="inline-flex items-center gap-1 rounded-sm border border-border px-2 py-1 text-sm text-foreground hover:bg-muted/20"
                  aria-label="Previous release"
                >
                  <ChevronLeftIcon className="size-4" />
                  {previous.version}
                </Link>
              )}
              {next?.version && (
                <Link
                  to="/ethereum/clients/$client/$version"
                  params={{ client, version: next.version }}
                  search={{ w: search.w, fork: search.fork }}
                  className="inline-flex items-center gap-1 rounded-sm border border-border px-2 py-1 text-sm text-foreground hover:bg-muted/20"
                  aria-label="Next release"
                >
                  {next.version}
                  <ChevronRightIcon className="size-4" />
                </Link>
              )}
            </>
          }
        />

        {!releasesLoading && !release && (
          <Alert
            variant="warning"
            title="No published release"
            description="Blocks reporting this version are still shown."
          />
        )}

        {search.fork && (
          <ForkReadinessCard
            layer={layer}
            fork={search.fork}
            requirement={requirement}
            blocks={recent24h.rows}
            nodes={nodes}
            releases={releases}
            version={version}
          />
        )}

        <SegmentedControl
          options={VERSION_WINDOW_OPTIONS}
          value={window}
          onChange={onWindowChange}
          ariaLabel="Window"
        />

        <InspectSection title="Blocks">
          {loading ? (
            <LoadingContainer className="h-96 rounded-sm" />
          ) : (
            <>
              <Stats
                gridClassName="grid grid-cols-2 gap-4 lg:grid-cols-3 2xl:grid-cols-6"
                stats={[
                  {
                    id: 'exact',
                    name: 'Blocks on exactly this version, today',
                    ...shareStat(adoption, 'exact', window),
                  },
                  {
                    id: 'at-least',
                    name: 'Blocks on it or newer, today',
                    ...shareStat(adoption, 'atLeast', window),
                  },
                  { id: 'lag50', name: 'Time to 50% of blocks', value: lag50.value, subtitle: lag50.note },
                  { id: 'lag90', name: 'Time to 90% of blocks', value: lag90.value, subtitle: lag90.note },
                  { id: 'entities', name: 'Entities proposing with it', value: facts.entities.toLocaleString() },
                  {
                    id: 'nodes',
                    name: 'Xatu nodes on it',
                    value: layer === 'consensus' && !nodeDays.isLoading ? facts.nodes.toLocaleString() : '-',
                  },
                ]}
              />

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
                <div className="min-w-0">
                  <PopoutCard
                    title="Adoption"
                    subtitle="Daily share of this client's blocks with a resolved version"
                    anchorId="version-adoption"
                    modalSize="full"
                  >
                    {({ inModal }) => (
                      <MultiLineChart
                        series={[
                          {
                            name: `${version} or newer`,
                            data: adoption.map(point =>
                              point.atLeast === null ? null : Number(point.atLeast.toFixed(2))
                            ),
                            color: getClientColor(client),
                            showArea: true,
                            areaOpacity: 0.15,
                          },
                          {
                            name: `Exactly ${version}`,
                            data: adoption.map(point => (point.exact === null ? null : Number(point.exact.toFixed(2)))),
                            color: getClientColor(client),
                            lineStyle: 'dashed',
                          },
                          ...(previous?.version
                            ? [
                                {
                                  name: `Exactly ${previous.version}`,
                                  data: previousAdoption.map(point =>
                                    point.exact === null ? null : Number(point.exact.toFixed(2))
                                  ),
                                  color: OTHER_VERSION_COLOR,
                                  lineStyle: 'dotted' as const,
                                },
                              ]
                            : []),
                        ]}
                        xAxis={{
                          type: 'category',
                          labels: adoption.map(point => formatDailyDate(point.day)),
                          name: 'Date',
                        }}
                        yAxis={{ name: 'Share (%)', min: 0, max: 100 }}
                        height={inModal ? 600 : 320}
                        showLegend
                        legendPosition="top"
                        markLines={
                          releaseDay && adoption.some(point => point.day === releaseDay)
                            ? [{ xValue: formatDailyDate(releaseDay), label: 'Released', lineStyle: 'dashed' }]
                            : undefined
                        }
                      />
                    )}
                  </PopoutCard>
                </div>
                <ComparisonCard
                  consensus={layer === 'consensus'}
                  version={version}
                  facts={facts}
                  previous={previous}
                  previousFacts={previousFacts}
                />
              </div>

              <EntityVersionBars
                client={client}
                blocks={entityCounts.rows}
                latestVersion={latest?.version}
                focusVersion={version}
                title="Entities running it"
                subtitle="Each entity's blocks by version, this version first"
              />
            </>
          )}
        </InspectSection>

        {layer === 'execution' && (
          <InspectSection title="On reference hardware">
            <ReferenceEngine client={client} releases={releases} {...reference} focus={referenceFocus} />
          </InspectSection>
        )}

        <InspectSection title="Nodes and peers">
          {layer === 'consensus' && (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <div className="xl:col-span-2">
                <Card rounded title="Xatu nodes on this version">
                  {nodeDays.isLoading ? (
                    <LoadingContainer className="h-32 rounded-sm" />
                  ) : (
                    <VersionNodeTable nodes={versionNodes.filter(node => node.version === version)} />
                  )}
                </Card>
              </div>
              <ProbeCard
                version={version}
                previous={previous?.version}
                probes={probes.probes}
                isLoading={probes.isLoading}
                releases={releases}
              />
            </div>
          )}
          <VersionNetwork client={client} layer={layer} version={version} from={rangeStart} window={window} />
        </InspectSection>
      </div>
    </Container>
  );
}

/** Row of a table comparing this version with the release before it */
interface ComparisonRow {
  metric: string;
  current: string;
  previous: string;
}

/** Metrics down the side, this version and the previous one across */
function ComparisonTable({
  rows,
  version,
  previous,
}: {
  rows: ComparisonRow[];
  version: string;
  previous?: string;
}): JSX.Element {
  return (
    <Table
      variant="nested"
      data={rows}
      getRowKey={row => row.metric}
      columns={[
        { header: 'Metric', accessor: row => row.metric, cellClassName: 'text-muted' },
        {
          header: version,
          accessor: row => row.current,
          cellClassName: 'text-right tabular-nums font-medium text-foreground',
          headerClassName: 'text-right font-mono',
        },
        ...(previous
          ? [
              {
                header: previous,
                accessor: (row: ComparisonRow) => row.previous,
                cellClassName: 'text-right tabular-nums text-muted',
                headerClassName: 'text-right font-mono',
              },
            ]
          : []),
      ]}
    />
  );
}

interface ComparisonCardProps {
  consensus: boolean;
  version: string;
  facts: VersionFacts;
  previous?: DimClientRelease;
  previousFacts: VersionFacts | null;
}

/** This version against the release before it, row by row, over the window */
function ComparisonCard({ consensus, version, facts, previous, previousFacts }: ComparisonCardProps): JSX.Element {
  const gapDays =
    facts.release?.release_date && previous?.release_date
      ? Math.round((facts.release.release_date - previous.release_date) / 86400)
      : null;

  const rows: ComparisonRow[] = [
    {
      metric: 'Released',
      current: facts.release?.release_date
        ? new Date(facts.release.release_date * 1000).toISOString().slice(0, 10)
        : '-',
      previous: previous?.release_date ? new Date(previous.release_date * 1000).toISOString().slice(0, 10) : '-',
    },
    {
      metric: 'Blocks in window',
      current: facts.blocks.toLocaleString(),
      previous: previousFacts?.blocks.toLocaleString() ?? '-',
    },
    {
      metric: 'Entities',
      current: facts.entities.toLocaleString(),
      previous: previousFacts?.entities.toLocaleString() ?? '-',
    },
    {
      metric: 'Time to 50%',
      current: lagValue(facts.lag50).value,
      previous: lagValue(previousFacts?.lag50 ?? null).value,
    },
    {
      metric: 'Time to 90%',
      current: lagValue(facts.lag90).value,
      previous: lagValue(previousFacts?.lag90 ?? null).value,
    },
    ...(consensus
      ? [
          {
            metric: 'Xatu nodes',
            current: facts.nodes.toLocaleString(),
            previous: previousFacts?.nodes.toLocaleString() ?? '-',
          },
        ]
      : []),
  ];

  return (
    <Card
      rounded
      title="Against the previous release"
      subtitle={
        gapDays !== null
          ? `Released ${gapDays} ${gapDays === 1 ? 'day' : 'days'} after ${previous?.version}`
          : undefined
      }
    >
      {!previous?.version ? (
        <p className="text-sm text-muted">No earlier full release to compare with.</p>
      ) : (
        <ComparisonTable rows={rows} version={version} previous={previous.version} />
      )}
    </Card>
  );
}

/** A Xatu node on one version: the days in the window it reported that version */
interface VersionNode {
  nodeId: string;
  username?: string;
  version: string;
  days: number;
  lastDay: string;
}

/** Xatu nodes per version they ran, one entry per node and version, most recent first */
function nodesByVersion(rows: FctHeadFirstSeenByNodeDaily[], releases: DimClientRelease[]): VersionNode[] {
  const byKey = new Map<string, VersionNode>();
  for (const row of rows) {
    if (!row.node_id || !row.day_start_date) continue;
    const version = displayVersion(row.meta_consensus_version, releases);
    if (!version) continue;
    const key = `${row.node_id}|${version}`;
    const entry = byKey.get(key) ?? { nodeId: row.node_id, username: row.username, version, days: 0, lastDay: '' };
    entry.days++;
    if (row.day_start_date > entry.lastDay) entry.lastDay = row.day_start_date;
    byKey.set(key, entry);
  }
  return [...byKey.values()].sort((a, b) => b.lastDay.localeCompare(a.lastDay) || b.days - a.days);
}

/** Xatu nodes that ran a version on any day of the window, linked to their node and contributor pages */
function VersionNodeTable({ nodes }: { nodes: VersionNode[] }): JSX.Element {
  if (nodes.length === 0) return <p className="text-sm text-muted">No Xatu node ran this version in the window.</p>;
  return (
    <Table
      variant="nested"
      data={nodes}
      getRowKey={row => row.nodeId}
      columns={[
        {
          header: 'Node',
          accessor: row => (
            <Link
              to="/xatu/nodes/$nodeId"
              params={{ nodeId: row.nodeId }}
              className="block max-w-48 truncate font-mono text-xs/6 text-primary hover:underline"
              title={row.nodeId}
            >
              {row.nodeId}
            </Link>
          ),
        },
        {
          header: 'Contributor',
          accessor: row =>
            row.username ? (
              <Link
                to="/xatu/contributors/$id"
                params={{ id: row.username }}
                className="text-sm/6 text-foreground hover:underline"
              >
                {row.username}
              </Link>
            ) : (
              '-'
            ),
        },
        {
          header: 'Days on it',
          accessor: row => row.days.toLocaleString(),
          cellClassName: 'text-right tabular-nums text-foreground',
          headerClassName: 'text-right',
        },
        {
          header: 'Last day on it',
          accessor: row => row.lastDay,
          cellClassName: 'tabular-nums text-muted',
        },
      ]}
    />
  );
}

interface ProbeCardProps {
  version: string;
  previous?: string;
  probes: IntCustodyProbe[];
  isLoading: boolean;
  releases: DimClientRelease[];
}

/** Custody probes of peers on this version and the previous one, sampled across the window */
function ProbeCard({ version, previous, probes, isLoading, releases }: ProbeCardProps): JSX.Element {
  const probeStats = (target: string | undefined): { probes: string; peers: string; success: string } => {
    const mine = target ? probes.filter(probe => displayVersion(probe.meta_peer_version, releases) === target) : [];
    return {
      probes: mine.length.toLocaleString(),
      peers: new Set(mine.map(probe => probe.peer_id_unique_key)).size.toLocaleString(),
      success: percent(mine.filter(probe => probe.result === 'success').length, mine.length),
    };
  };
  const current = probeStats(version);
  const before = probeStats(previous);

  return (
    <Card
      rounded
      title="Custody probes"
      subtitle={`${PROBE_SLICES} × ${PROBE_SLICE_SECONDS} s spread across the window`}
    >
      {isLoading ? (
        <LoadingContainer className="h-32 rounded-sm" />
      ) : (
        <ComparisonTable
          rows={[
            { metric: 'Probes', current: current.probes, previous: before.probes },
            { metric: 'Peers probed', current: current.peers, previous: before.peers },
            { metric: 'Probe success', current: current.success, previous: before.success },
          ]}
          version={version}
          previous={previous}
        />
      )}
    </Card>
  );
}
