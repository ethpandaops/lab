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
import type { DimClientRelease } from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { getClientColor, normalizeClientName } from '@/utils/ethereum';
import { formatClientName } from '@/utils/graffiti';
import { formatDailyDate } from '@/pages/ethereum/execution/overview/overview.utils';
import { VERSION_WINDOW_DAYS, VERSION_WINDOW_OPTIONS, type VersionWindow } from './constants';
import {
  ClientHeader,
  EntityVersionBars,
  ForkReadinessCard,
  NodeTable,
  PendingSource,
  ReferenceEngine,
} from './components';
import { useClientBlocks, useClientNodes, useClientReleases, usePeerSupport, useReferenceEngine } from './hooks';
import { PENDING_SOURCES } from './pending';
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
  summariseBuildLines,
  timeToAdoption,
  OTHER_VERSION_COLOR,
  type AdoptionLag,
  type ResolvedBlock,
} from './utils/client-versions';
import { forkRequirements } from './utils/fork-requirements';
import type { ClientLayer } from './utils/client-share';

/** Formats a share, or a dash when nothing was counted */
function percent(part: number, total: number): string {
  return total > 0 ? `${((part / total) * 100).toFixed(1)}%` : '-';
}

/** Value and note for an adoption lag */
function lagValue(lag: AdoptionLag | null): { value: string; note?: string } {
  if (!lag) return { value: '-' };
  if (lag.status === 'reached') return { value: formatLag(lag.seconds) };
  if (lag.status === 'not-reached') return { value: 'Not yet' };
  return { value: '-', note: 'Released before the window' };
}

/** Blocks, entities and Xatu nodes on one version */
interface VersionFacts {
  release?: DimClientRelease;
  blocks: number;
  entities: number;
  nodes: number;
  lag50: AdoptionLag | null;
  lag90: AdoptionLag | null;
}

/** Facts about one version over the loaded blocks and Xatu nodes */
function versionFacts(
  release: DimClientRelease | undefined,
  version: string,
  blocks: ResolvedBlock[],
  nodeVersions: string[]
): VersionFacts {
  const mine = blocks.filter(block => block.version === version);
  const releaseTime = release?.release_date ?? null;
  return {
    release,
    blocks: mine.length,
    entities: new Set(mine.map(block => block.entity).filter(Boolean)).size,
    nodes: nodeVersions.filter(nodeVersion => nodeVersion === version).length,
    lag50: releaseTime !== null ? timeToAdoption(blocks, version, releaseTime, 50) : null,
    lag90: releaseTime !== null ? timeToAdoption(blocks, version, releaseTime, 90) : null,
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

  const { blocks, isLoading: blocksLoading } = useClientBlocks(client, layer, VERSION_WINDOW_DAYS[window], releases);
  const { nodes, isLoading: nodesLoading } = useClientNodes(client, layer);
  const peers = usePeerSupport(client, layer === 'consensus');
  const reference = useReferenceEngine(client, layer === 'execution');

  const days = useMemo(() => countVersionsByDay(blocks), [blocks]);
  const adoption = useMemo(() => adoptionByDay(days, version), [days, version]);
  const previousAdoption = useMemo(
    () => (previous?.version ? adoptionByDay(days, previous.version) : []),
    [days, previous?.version]
  );
  const nodeVersions = useMemo(
    () => (layer === 'consensus' ? nodes.map(node => displayVersion(node.meta_consensus_version, releases)) : []),
    [nodes, layer, releases]
  );
  const facts = useMemo(
    () => versionFacts(release, version, blocks, nodeVersions),
    [release, version, blocks, nodeVersions]
  );
  const previousFacts = useMemo(
    () => (previous?.version ? versionFacts(previous, previous.version, blocks, nodeVersions) : null),
    [previous, blocks, nodeVersions]
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
  const lastPoint = [...adoption].reverse().find(point => point.exact !== null);
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
            blocks={blocks}
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
                  value: lastPoint?.exact != null ? `${lastPoint.exact.toFixed(1)}%` : '-',
                },
                {
                  id: 'at-least',
                  name: 'Blocks on it or newer, today',
                  value: lastPoint?.atLeast != null ? `${lastPoint.atLeast.toFixed(1)}%` : '-',
                },
                { id: 'lag50', name: 'Time to 50% of blocks', value: lag50.value, subtitle: lag50.note },
                { id: 'lag90', name: 'Time to 90% of blocks', value: lag90.value, subtitle: lag90.note },
                { id: 'entities', name: 'Entities proposing with it', value: facts.entities.toLocaleString() },
                {
                  id: 'nodes',
                  name: 'Xatu nodes on it',
                  value: layer === 'consensus' ? facts.nodes.toLocaleString() : '-',
                },
              ]}
            />

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <div className="xl:col-span-2">
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
                layer={layer}
                version={version}
                facts={facts}
                previous={previous}
                previousFacts={previousFacts}
                probes={peers.probes}
                releases={releases}
              />
            </div>

            <EntityVersionBars
              client={client}
              blocks={blocks}
              latestVersion={latest?.version}
              focusVersion={version}
              title="Entities running it"
              subtitle="Each entity's blocks by version, this version first"
            />
          </>
        )}

        {layer === 'execution' && (
          <section className="flex flex-col gap-3">
            <h2 className="text-base/7 font-semibold text-foreground">On reference hardware</h2>
            <ReferenceEngine client={client} releases={releases} {...reference} focus={referenceFocus} />
          </section>
        )}

        {layer === 'consensus' && (
          <Card rounded title="Xatu nodes on this version">
            {nodesLoading ? (
              <LoadingContainer className="h-32 rounded-sm" />
            ) : facts.nodes === 0 ? (
              <p className="text-sm text-muted">No Xatu node ran this version in the last 24 hours.</p>
            ) : (
              <NodeTable
                client={client}
                layer={layer}
                nodes={nodes.filter((_, index) => nodeVersions[index] === version)}
                releases={releases}
              />
            )}
          </Card>
        )}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {layer === 'consensus' && <PendingSource {...PENDING_SOURCES.nodeCensus} />}
          <PendingSource {...PENDING_SOURCES.enrCrawl} />
        </div>
      </div>
    </Container>
  );
}

interface ComparisonCardProps {
  layer: ClientLayer;
  version: string;
  facts: VersionFacts;
  previous?: DimClientRelease;
  previousFacts: VersionFacts | null;
  probes: ReturnType<typeof usePeerSupport>['probes'];
  releases: DimClientRelease[];
}

/** This version against the release before it, row by row */
function ComparisonCard({
  layer,
  version,
  facts,
  previous,
  previousFacts,
  probes,
  releases,
}: ComparisonCardProps): JSX.Element {
  const probeStats = (target: string | undefined): { peers: number; success: string } => {
    if (!target) return { peers: 0, success: '-' };
    const mine = probes.filter(probe => displayVersion(probe.meta_peer_version, releases) === target);
    return {
      peers: new Set(mine.map(probe => probe.peer_id_unique_key)).size,
      success: percent(mine.filter(probe => probe.result === 'success').length, mine.length),
    };
  };
  const thisProbes = probeStats(version);
  const previousProbes = probeStats(previous?.version);
  const gapDays =
    facts.release?.release_date && previous?.release_date
      ? Math.round((facts.release.release_date - previous.release_date) / 86400)
      : null;

  const rows: Array<{ metric: string; current: string; previous: string }> = [
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
    ...(layer === 'consensus'
      ? [
          {
            metric: 'Xatu nodes',
            current: facts.nodes.toLocaleString(),
            previous: previousFacts?.nodes.toLocaleString() ?? '-',
          },
          {
            metric: 'Peers probed, last hour',
            current: thisProbes.peers.toLocaleString(),
            previous: previousProbes.peers.toLocaleString(),
          },
          { metric: 'Probe success', current: thisProbes.success, previous: previousProbes.success },
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
            {
              header: previous.version,
              accessor: row => row.previous,
              cellClassName: 'text-right tabular-nums text-muted',
              headerClassName: 'text-right font-mono',
            },
          ]}
        />
      )}
    </Card>
  );
}
