import { type JSX, useCallback, useMemo } from 'react';
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { ArrowTopRightOnSquareIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/16/solid';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { Card } from '@/components/Layout/Card';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { Alert } from '@/components/Feedback/Alert';
import { Badge } from '@/components/Elements/Badge';
import { Timestamp } from '@/components/DataDisplay/Timestamp';
import { Table } from '@/components/Lists/Table';
import { SegmentedControl } from '@/components/Forms/SegmentedControl';
import type { DimClientRelease, FctCustodyProbeByClientDaily, FctHeadFirstSeenByNodeDaily } from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { normalizeClientName } from '@/utils/ethereum';
import { formatClientName } from '@/utils/graffiti';
import { completeBucketEnd } from '@/utils/time';
import { InspectSection } from '@/pages/ethereum/validators/components/InspectSection';
import { VERSION_WINDOW_DAYS, VERSION_WINDOW_OPTIONS, type VersionWindow } from './constants';
import {
  ClientHeader,
  EntityVersionBars,
  ForkReadinessCard,
  ReferenceEngine,
  VersionAdoption,
  VersionPeers,
} from './components';
import {
  useCensus,
  useClientNodes,
  useClientReleases,
  useNodeVersions,
  useReferenceEngine,
  useVersionCounts,
} from './hooks';
import { CENSUS_TABLES, RESOLVED_STATUSES } from './api/client-models';
import {
  buildMatchesRelease,
  clientLayerOf,
  displayVersion,
  findRelease,
  nextRelease,
  previousRelease,
  releaseName,
  releaseUrl as releasePageUrl,
  summariseBuildLines,
  last24hStart,
  windowStart,
} from './utils/client-versions';
import { forkRequirements } from './utils/fork-requirements';

/** Formats a share, or a dash when nothing was counted */
function percent(part: number, total: number): string {
  return total > 0 ? `${((part / total) * 100).toFixed(1)}%` : '-';
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
 * One release of a client: its adoption by proposed blocks, P2P peers and Xatu nodes against the release before,
 * then who proposes with it, how its P2P peers connect and which Xatu nodes run it.
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
  const window: VersionWindow = search.w ?? 'all';
  const version = release?.version ?? params.version;
  const previous = release ? previousRelease(releases, release) : undefined;
  const next = release ? nextRelease(releases, release) : undefined;

  // Everything below the range control covers the range. Neither this version nor the one before it has blocks
  // before its release, so All starts on the day the earlier of the two was released, or with each table's data.
  const windowDays = VERSION_WINDOW_DAYS[window];
  const releasedFrom = Math.min(release?.release_date ?? Infinity, previous?.release_date ?? Infinity);
  const rangeStart =
    windowDays !== null
      ? windowStart(windowDays)
      : Number.isFinite(releasedFrom)
        ? Math.floor(releasedFrom / 86400) * 86400
        : 0;
  const rangeEnd = completeBucketEnd('day');
  const ready = !!layer && !releasesLoading;
  const entityCounts = useVersionCounts({ grain: 'entity-daily', client, layer, from: rangeStart, enabled: ready });
  // The fork card above the control reads the last 24 hours and the nodes active now
  const recent24h = useVersionCounts({ grain: 'hourly', client, layer, from: last24hStart(), enabled: !!layer });
  const { nodes } = useClientNodes(client, layer);
  const nodeDays = useNodeVersions(client, null, ready && layer === 'consensus', { from: rangeStart, to: rangeEnd });
  const probes = useCensus<FctCustodyProbeByClientDaily>(
    CENSUS_TABLES.custody,
    ready && layer === 'consensus' ? { client_eq: client } : null,
    rangeStart
  );
  const reference = useReferenceEngine(client, ready && layer === 'execution', windowDays ?? undefined);
  const versionNodes = useMemo(() => nodesByVersion(nodeDays.rows, releases), [nodeDays.rows, releases]);

  const requirement = forkRequirements(currentNetwork, client).find(item => item.fork === search.fork);

  const onWindowChange = useCallback(
    (value: VersionWindow) =>
      navigate({ search: prev => ({ ...prev, w: value as '30d' | '90d' | 'all' }), replace: true, resetScroll: false }),
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
  const isLatest = !!release && release.version === latest?.version;
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
              value: release?.release_date ? <Timestamp timestamp={release.release_date} format="date" /> : '-',
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
            ...(latest?.version && !isLatest
              ? [{ label: 'Latest release', value: <VersionLink client={client} version={latest.version} /> }]
              : []),
          ]}
          actions={
            <>
              {previous?.version && (
                <Link
                  to="/ethereum/clients/$client/$version"
                  params={{ client, version: previous.version }}
                  search={{ w: search.w, fork: search.fork }}
                  className="inline-flex items-center gap-1 rounded-sm border border-border px-2 py-1 text-sm text-foreground hover:bg-muted-20"
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
                  className="inline-flex items-center gap-1 rounded-sm border border-border px-2 py-1 text-sm text-foreground hover:bg-muted-20"
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
            description="Blocks and P2P peers reporting this version are still shown."
          />
        )}

        {search.fork && (
          <ForkReadinessCard
            client={client}
            layer={layer}
            fork={search.fork}
            requirement={requirement}
            blocks={recent24h.rows}
            nodes={nodes}
            releases={releases}
            version={version}
          />
        )}

        <div className="self-start">
          <SegmentedControl
            options={VERSION_WINDOW_OPTIONS}
            value={window}
            onChange={onWindowChange}
            ariaLabel="Window"
          />
        </div>

        <InspectSection title="Adoption">
          {releasesLoading ? (
            <LoadingContainer className="h-160 rounded-sm" />
          ) : (
            <VersionAdoption
              client={client}
              layer={layer}
              version={version}
              release={release}
              previous={previous}
              releases={releases}
              window={window === 'all' ? 'all time' : window}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
            />
          )}
        </InspectSection>

        <InspectSection title="Proposed blocks">
          {!ready || entityCounts.isLoading ? (
            <LoadingContainer className="h-64 rounded-sm" />
          ) : (
            <EntityVersionBars
              client={client}
              blocks={entityCounts.rows}
              latestVersion={latest?.version}
              focusVersion={version}
              title="Entities running it"
              subtitle="Each entity's blocks by version, this version first"
            />
          )}
        </InspectSection>

        <InspectSection title="P2P peers">
          <VersionPeers client={client} layer={layer} version={version}>
            {layer === 'consensus' && (
              <ProbeCard
                version={version}
                previous={previous?.version}
                rows={probes.rows}
                isLoading={!ready || probes.isLoading}
              />
            )}
          </VersionPeers>
        </InspectSection>

        {layer === 'consensus' && (
          <InspectSection title="Xatu nodes">
            <Card rounded title="Xatu nodes on this version">
              {!ready || nodeDays.isLoading ? (
                <LoadingContainer className="h-32 rounded-sm" />
              ) : (
                <VersionNodeTable nodes={versionNodes.filter(node => node.version === version)} />
              )}
            </Card>
          </InspectSection>
        )}

        {layer === 'execution' && (
          <InspectSection title="On reference hardware">
            <ReferenceEngine
              client={client}
              releases={releases}
              {...reference}
              isLoading={!ready || reference.isLoading}
              focus={referenceFocus}
            />
          </InspectSection>
        )}
      </div>
    </Container>
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
          header: 'Xatu node',
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

/** Row of a table comparing a version with the release before it */
interface ComparisonRow {
  metric: string;
  current: string;
  previous: string;
}

interface ComparisonTableProps {
  rows: ComparisonRow[];
  version: string;
  /** The release before; its column is left out when there is none */
  previous?: string;
}

/**
 * Metrics down the side, a version and the release before it across.
 */
function ComparisonTable({ rows, version, previous }: ComparisonTableProps): JSX.Element {
  return (
    <Table
      variant="nested"
      data={rows}
      getRowKey={row => row.metric}
      columns={[
        { header: 'Metric', accessor: row => row.metric, cellClassName: 'text-muted max-sm:whitespace-normal' },
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

interface ProbeCardProps {
  version: string;
  previous?: string;
  rows: FctCustodyProbeByClientDaily[];
  isLoading: boolean;
}

/** Custody probes of peers on this version and the previous one over the window */
function ProbeCard({ version, previous, rows, isLoading }: ProbeCardProps): JSX.Element {
  const probeStats = (target: string | undefined): { probes: string; peers: string; success: string } => {
    const mine = target
      ? rows.filter(row => row.version === target && RESOLVED_STATUSES.has(row.release_status ?? ''))
      : [];
    const probeCount = mine.reduce((total, row) => total + (row.probe_count ?? 0), 0);
    const success = mine.reduce((total, row) => total + (row.success_count ?? 0), 0);
    const days = new Set(mine.map(row => row.day_start_date)).size;
    const peerDays = mine.reduce((total, row) => total + (row.peer_count ?? 0), 0);
    return {
      probes: probeCount.toLocaleString(),
      peers: days > 0 ? Math.round(peerDays / days).toLocaleString() : '-',
      success: percent(success, probeCount),
    };
  };
  const current = probeStats(version);
  const before = probeStats(previous);

  return (
    <Card rounded title="Custody probes">
      {isLoading ? (
        <LoadingContainer className="h-32 rounded-sm" />
      ) : (
        <ComparisonTable
          rows={[
            { metric: 'Probes', current: current.probes, previous: before.probes },
            { metric: 'P2P peers probed per day', current: current.peers, previous: before.peers },
            { metric: 'Probe success', current: current.success, previous: before.success },
          ]}
          version={version}
          previous={previous}
        />
      )}
    </Card>
  );
}
