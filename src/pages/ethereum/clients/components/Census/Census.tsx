import { type JSX, type ReactNode, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { Card } from '@/components/Layout/Card';
import { Table } from '@/components/Lists/Table';
import { Stats } from '@/components/DataDisplay/Stats';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { MultiLineChart } from '@/components/Charts/MultiLine';
import { useNetwork } from '@/hooks/useNetwork';
import { useBeaconClock } from '@/hooks/useBeaconClock';
import { getCountryFlag } from '@/utils/country';
import { getClientColor } from '@/utils/ethereum';
import { formatClientName } from '@/utils/graffiti';
import { formatDailyDate } from '@/pages/ethereum/execution/overview/overview.utils';
import {
  CENSUS_TABLES,
  RESOLVED_STATUSES,
  type FctCustodyProbeByClientDaily,
  type FctPeerCountByClClientDaily,
  type FctPeerCountByClientAsnDaily,
  type FctPeerCountByClientCountryDaily,
  type FctPeerCountByElClientDaily,
  type FctPeerForkReadinessByClClientDaily,
  type FctPeerForkReadinessByElClientDaily,
  type FctPeerProtocolByClClientDaily,
} from '../../api/client-models';
import { useCensus } from '../../hooks/useCensus';
import { ANGLE_COLORS } from '../../utils/angle-colors';
import type { ClientLayer } from '../../utils/client-share';
import {
  CUSTODY_BUCKETS,
  censusVersions,
  groupForkIdNext,
  groupNextForkDigests,
  networkTypeLabel,
  PEER_SOURCE,
  sum,
  upcomingFork,
  type CensusVersion,
} from '../../utils/census';
import { countVersionsByDay, sinceSuffix, summariseVersions, type VersionCount } from '../../utils/client-versions';
import { ShareTable } from '../ShareTable';
import { VersionShareChart } from '../VersionShareChart';

/** Formats a share, or a dash when nothing was counted */
function percent(part: number, total: number): string {
  if (total <= 0) return '-';
  const share = (part / total) * 100;
  return share > 0 && share < 0.05 ? '<0.1%' : `${share.toFixed(1)}%`;
}

/** A req/resp protocol without its shared prefix and encoding, e.g. beacon_blocks_by_range/2 */
function protocolLabel(protocol: string): string {
  return protocol.replace(/^\/eth2\/beacon_chain\/req\//, '').replace(/\/ssz_snappy$/, '');
}

/** A census version: linked to its version page when it is a release */
function CensusVersionLabel({ client, version }: { client: string; version: CensusVersion }): JSX.Element {
  if (!version.version) return <span className="text-sm/6 text-muted">Version not advertised</span>;
  if (!version.resolved) {
    return (
      <span className="font-mono text-xs/6 text-muted" title="Matches no published release">
        {version.version}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2">
      <Link
        to="/ethereum/clients/$client/$version"
        params={{ client, version: version.version }}
        className="font-mono text-xs/6 text-primary hover:underline"
      >
        {version.version}
      </Link>
      {version.untagged > 0 && <span className="text-xs/5 text-muted">incl. builds after</span>}
    </span>
  );
}

/** Census rows as version counts, so the version share chart can draw them */
function toVersionCounts<T extends { day_start_date?: string; version?: string; release_status?: string }>(
  rows: T[],
  count: (row: T) => number | undefined
): VersionCount[] {
  // A version is drawn when any peer resolved it to a release, so forks naming made-up versions stay out
  const releases = new Set(
    rows.filter(row => row.version && RESOLVED_STATUSES.has(row.release_status ?? '')).map(row => row.version)
  );
  return rows.map(row => ({
    time: Date.parse(`${row.day_start_date}T00:00:00Z`) / 1000,
    day: row.day_start_date ?? '',
    version: releases.has(row.version) ? (row.version ?? null) : null,
    status: row.release_status || 'none',
    count: count(row) ?? 0,
  }));
}

export interface PeerCensusProps {
  client: string;
  layer: ClientLayer;
  /** Window start for the trends (unix seconds); 0 for all history, the latest days when omitted */
  from?: number;
  windowControl?: ReactNode;
}

/**
 * The client as peers on the P2P network: how many, on which versions, and for consensus clients how they connect
 * and how much they custody.
 */
export function PeerCensus({ client, layer, from, windowControl }: PeerCensusProps): JSX.Element {
  const table = layer === 'consensus' ? CENSUS_TABLES.clPeers : CENSUS_TABLES.elPeers;
  const own = useCensus<FctPeerCountByClClientDaily & FctPeerCountByElClientDaily>(table, { client_eq: client }, from);
  const all = useCensus<FctPeerCountByElClientDaily>(table, {});
  const peers = (row: { peer_count?: number }): number | undefined => row.peer_count;

  const days = useMemo(() => {
    const totals = new Map<string, number>();
    for (const row of own.rows)
      totals.set(row.day_start_date ?? '', (totals.get(row.day_start_date ?? '') ?? 0) + (row.peer_count ?? 0));
    return [...totals.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [own.rows]);
  const versionCounts = useMemo(() => toVersionCounts(own.rows, peers), [own.rows]);
  const versionDays = useMemo(() => countVersionsByDay(versionCounts), [versionCounts]);
  const versionSummaries = useMemo(() => summariseVersions(versionCounts), [versionCounts]);
  const latestVersions = useMemo(() => censusVersions(own.latest, peers), [own.latest]);

  const latestPeers = sum(own.latest, peers);
  const allPeers = sum(all.latest, peers);
  const advertised = sum(
    own.latest.filter(row => row.version),
    peers
  );
  const label = layer === 'consensus' ? 'consensus' : 'execution';

  if (own.isLoading) return <LoadingContainer className="h-96 rounded-sm" />;
  if (own.rows.length === 0) {
    return (
      <Card rounded title="P2P peers">
        <p className="text-sm text-muted">No P2P peer {PEER_SOURCE[layer]} runs this client.</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Stats
        gridClassName="grid grid-cols-2 gap-4 lg:grid-cols-4"
        stats={[
          { id: 'peers', name: `P2P peers, ${own.day}`, value: latestPeers.toLocaleString() },
          { id: 'share', name: `Share of ${label} P2P peers`, value: percent(latestPeers, allPeers) },
          {
            id: 'versions',
            name: 'Versions seen',
            value: latestVersions.filter(v => v.version).length.toLocaleString(),
          },
          { id: 'advertised', name: 'Advertising a version', value: percent(advertised, latestPeers) },
        ]}
      />
      <Card
        rounded
        title="P2P peers"
        subtitle={`P2P peers ${PEER_SOURCE[layer]} each day, node-weighted${sinceSuffix(own.dataStart, from)}`}
        actions={windowControl}
      >
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <MultiLineChart
            series={[
              {
                name: formatClientName(client),
                client,
                color: getClientColor(client),
                showArea: true,
                areaOpacity: 0.15,
                data: days.map(([, count]) => count),
              },
            ]}
            xAxis={{ type: 'category', labels: days.map(([day]) => formatDailyDate(day)), name: 'Date' }}
            yAxis={{ name: 'P2P peers', min: 0 }}
            height={300}
            showLegend
            legendPosition="top"
          />
          {versionSummaries.length > 0 ? (
            <VersionShareChart days={versionDays} height={300} />
          ) : (
            <p className="self-center text-sm text-muted">
              {advertised > 0 ? 'No P2P peer runs a published release.' : 'These P2P peers do not advertise a version.'}
            </p>
          )}
        </div>
      </Card>
      <Card
        rounded
        title="Versions on the P2P network"
        subtitle={`P2P peers per version their agent states on ${own.day}; Stated only counts peers whose build did not resolve to that release`}
      >
        <Table
          variant="nested"
          data={latestVersions.slice(0, 20)}
          getRowKey={row => `${row.resolved}|${row.version}`}
          columns={[
            { header: 'Version', accessor: row => <CensusVersionLabel client={client} version={row} /> },
            {
              header: 'P2P peers',
              accessor: row => row.count.toLocaleString(),
              cellClassName: 'text-right tabular-nums text-foreground',
              headerClassName: 'text-right',
            },
            {
              header: 'Share',
              accessor: row => percent(row.count, latestPeers),
              cellClassName: 'text-right tabular-nums font-medium text-foreground',
              headerClassName: 'text-right',
            },
            ...(latestVersions.some(row => row.statedOnly > 0 && row.resolved)
              ? [
                  {
                    header: 'Stated only',
                    accessor: (row: CensusVersion) =>
                      row.resolved && row.statedOnly > 0 ? row.statedOnly.toLocaleString() : '-',
                    cellClassName: 'text-right tabular-nums text-muted',
                    headerClassName: 'text-right',
                  },
                ]
              : []),
          ]}
        />
      </Card>
      {layer === 'consensus' && <ConsensusPeerDetail client={client} rows={own.latest} day={own.day} />}
      <PeerGeography client={client} layer={layer} />
    </div>
  );
}

/** Custody groups and QUIC of a consensus client's P2P peers, from one day's rows */
function CustodyBuckets({ client, rows }: { client: string; rows: FctPeerCountByClClientDaily[] }): JSX.Element {
  const known = sum(rows, row => row.custody_known_peer_count);
  const color = getClientColor(client);
  if (known === 0) return <p className="text-sm text-muted">No P2P peer reported its custody.</p>;
  return (
    <div className="flex flex-col gap-3">
      <ShareTable
        labelHeader="Custody"
        labelClassName="w-40 sm:w-48"
        countHeader="P2P peers"
        rows={CUSTODY_BUCKETS.map(bucket => {
          const count = sum(rows, row => row[bucket.key]);
          return {
            key: bucket.key,
            label: (
              <span className="flex flex-col">
                <span className="text-sm/5 text-foreground">{bucket.label}</span>
                <span className="text-xs/4 whitespace-normal text-muted">{bucket.meaning}</span>
              </span>
            ),
            share: (count / known) * 100,
            count,
            color,
          };
        })}
      />
      <dl className="grid grid-cols-2 gap-4 border-t border-border pt-3">
        <div>
          <dt className="text-xs/5 text-muted">Listening on QUIC</dt>
          <dd className="text-sm/6 font-semibold text-foreground tabular-nums">
            {percent(
              sum(rows, row => row.quic_listen_peer_count),
              sum(rows, row => row.peer_count)
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs/5 text-muted">Dialled over QUIC</dt>
          <dd className="text-sm/6 font-semibold text-foreground tabular-nums">
            {percent(
              sum(rows, row => row.quic_connected_peer_count),
              sum(rows, row => row.dialled_peer_count)
            )}
          </dd>
        </div>
      </dl>
    </div>
  );
}

/** Custody groups, QUIC and protocols of a consensus client's peers on one day */
function ConsensusPeerDetail({
  client,
  rows,
  day,
}: {
  client: string;
  rows: FctPeerCountByClClientDaily[];
  day: string | null;
}): JSX.Element {
  const protocols = useCensus<FctPeerProtocolByClClientDaily>(CENSUS_TABLES.clProtocol, { client_eq: client });
  const color = getClientColor(client);
  // Least-supported first: nearly every peer speaks the rest
  const protocolRows = [...protocols.latest]
    .sort(
      (a, b) =>
        (a.peer_count ?? 0) / (a.client_peer_count || 1) - (b.peer_count ?? 0) / (b.client_peer_count || 1) ||
        (a.protocol ?? '').localeCompare(b.protocol ?? '')
    )
    .slice(0, 12);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Card rounded title="Custody groups" subtitle={`P2P peers by the column groups they custody on ${day}`}>
        <CustodyBuckets client={client} rows={rows} />
      </Card>
      <Card
        rounded
        title="Protocols"
        subtitle={`Share of its P2P peers supporting each protocol on ${protocols.day ?? day}, least supported first`}
      >
        {protocolRows.length === 0 ? (
          <p className="text-sm text-muted">No protocols reported.</p>
        ) : (
          <ShareTable
            labelHeader="Protocol"
            labelClassName="w-44 sm:w-52"
            countHeader="P2P peers"
            rows={protocolRows.map(row => ({
              key: row.protocol ?? '',
              label: (
                <span className="font-mono text-xs/6" title={row.protocol}>
                  {protocolLabel(row.protocol ?? '')}
                </span>
              ),
              share: row.client_peer_count ? ((row.peer_count ?? 0) / row.client_peer_count) * 100 : 0,
              count: row.peer_count ?? 0,
              color,
            }))}
          />
        )}
      </Card>
    </div>
  );
}

/** Countries and networks of a client's peers on the latest day */
function PeerGeography({ client, layer }: { client: string; layer: ClientLayer }): JSX.Element {
  const countries = useCensus<FctPeerCountByClientCountryDaily>(
    layer === 'consensus' ? CENSUS_TABLES.clCountry : CENSUS_TABLES.elCountry,
    { client_eq: client }
  );
  const networks = useCensus<FctPeerCountByClientAsnDaily>(
    layer === 'consensus' ? CENSUS_TABLES.clAsn : CENSUS_TABLES.elAsn,
    { client_eq: client }
  );
  const color = getClientColor(client);
  const countryTotal = sum(countries.latest, row => row.peer_count);
  const networkTotal = sum(networks.latest, row => row.peer_count);
  const hosting = sum(
    networks.latest.filter(row => row.network_type === 'hosting'),
    row => row.peer_count
  );
  const topCountries = [...countries.latest].sort((a, b) => (b.peer_count ?? 0) - (a.peer_count ?? 0)).slice(0, 10);
  const topNetworks = [...networks.latest].sort((a, b) => (b.peer_count ?? 0) - (a.peer_count ?? 0)).slice(0, 10);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Card
        rounded
        title="Countries"
        subtitle={`P2P peers by country on ${countries.day ?? '-'}; small countries roll into Other`}
      >
        <ShareTable
          labelHeader="Country"
          countHeader="P2P peers"
          rows={topCountries.map(row => ({
            key: row.country_code || row.country || 'other',
            label: (
              <span className="inline-flex items-center gap-1.5 text-sm/6">
                <span>{getCountryFlag(row.country_code, '')}</span>
                <span className="truncate">{row.country || 'Other'}</span>
              </span>
            ),
            share: countryTotal > 0 ? ((row.peer_count ?? 0) / countryTotal) * 100 : 0,
            count: row.peer_count ?? 0,
            color,
          }))}
        />
      </Card>
      <Card
        rounded
        title="Networks"
        subtitle={`P2P peers by network on ${networks.day ?? '-'}; small networks roll into Smaller networks`}
        actions={
          <span className="text-sm/6 text-muted">
            Hosting <span className="font-semibold text-foreground tabular-nums">{percent(hosting, networkTotal)}</span>
          </span>
        }
      >
        <Table
          variant="nested"
          data={topNetworks}
          getRowKey={row => `${row.autonomous_system_number}-${row.autonomous_system_organization}`}
          columns={[
            {
              header: 'Network',
              accessor: row => (
                <span className="block max-w-56 truncate" title={row.autonomous_system_organization}>
                  {!row.autonomous_system_organization || row.autonomous_system_organization === 'other'
                    ? 'Smaller networks'
                    : row.autonomous_system_organization}
                </span>
              ),
            },
            {
              header: 'ASN',
              accessor: row => (row.autonomous_system_number ? `AS${row.autonomous_system_number}` : '-'),
              cellClassName: 'text-muted tabular-nums',
            },
            { header: 'Type', accessor: row => networkTypeLabel(row.network_type), cellClassName: 'text-muted' },
            {
              header: 'Share',
              accessor: row => percent(row.peer_count ?? 0, networkTotal),
              cellClassName: 'text-right tabular-nums font-medium text-foreground',
              headerClassName: 'text-right',
            },
          ]}
        />
        <p className="mt-3 text-xs/5 text-muted">Other is mostly residential and business ISPs.</p>
      </Card>
    </div>
  );
}

export interface EnrReadinessProps {
  client: string;
  layer: ClientLayer;
  /** Only this release's ENR records; those that only state it are counted apart */
  version?: string;
}

/**
 * Whether the client's nodes in the ENR crawl advertise the network's next fork, overall or for one release.
 */
export function EnrReadiness({ client, layer, version }: EnrReadinessProps): JSX.Element {
  const { currentNetwork } = useNetwork();
  const { epoch } = useBeaconClock();
  const cl = useCensus<FctPeerForkReadinessByClClientDaily>(
    CENSUS_TABLES.clReadiness,
    layer === 'consensus' ? { client_eq: client } : null
  );
  const el = useCensus<FctPeerForkReadinessByElClientDaily>(
    CENSUS_TABLES.elReadiness,
    layer === 'execution' ? { client_eq: client } : null
  );
  const next = upcomingFork(currentNetwork, epoch);
  const source = layer === 'consensus' ? cl : el;
  const isResolved = (row: { release_status?: string }): boolean => RESOLVED_STATUSES.has(row.release_status ?? '');
  const rows = version ? source.latest.filter(row => row.version === version && isResolved(row)) : source.latest;
  const statedOnly = version
    ? sum(
        source.latest.filter(row => row.version === version && !isResolved(row)),
        row => row.node_count
      )
    : 0;
  const groups = (
    layer === 'consensus'
      ? groupNextForkDigests(rows as FctPeerForkReadinessByClClientDaily[], next)
      : groupForkIdNext(rows as FctPeerForkReadinessByElClientDaily[], currentNetwork)
  ).filter(group => group.count > 0);
  const total = sum(groups, group => group.count);
  const ready = sum(
    groups.filter(group => group.isNext),
    group => group.count
  );
  const color = ANGLE_COLORS.enr;

  return (
    <Card
      rounded
      title="Next fork in ENRs"
      subtitle={`Node-weighted, from the ENR crawl${source.day ? ` on ${source.day}` : ''}`}
      actions={
        next && (
          <Link
            to="/ethereum/forks/$fork"
            params={{ fork: next.slug }}
            className="text-sm text-primary hover:underline"
          >
            {next.name}
          </Link>
        )
      }
    >
      {source.isLoading ? (
        <LoadingContainer className="h-40 rounded-sm" />
      ) : total === 0 ? (
        <p className="text-sm text-muted">
          No ENR record in the crawl runs {version ? 'this version' : 'this client'}.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-xs/5 text-muted">Nodes in the ENR crawl</dt>
              <dd className="text-sm/6 font-semibold text-foreground tabular-nums">{total.toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-xs/5 text-muted">{next ? `Advertising ${next.name}` : 'Advertising a next fork'}</dt>
              <dd className="text-sm/6 font-semibold text-foreground tabular-nums">
                {next ? percent(ready, total) : 'No fork scheduled'}
              </dd>
            </div>
          </dl>
          <ShareTable
            labelHeader="Next fork"
            countHeader="Records"
            rows={groups.map(group => ({
              key: group.label,
              label: (
                <span className={group.isNext ? 'text-sm/6 text-foreground' : 'font-mono text-xs/6 text-muted'}>
                  {group.label}
                </span>
              ),
              share: (group.count / total) * 100,
              count: group.count,
              color,
            }))}
          />
        </div>
      )}
      {statedOnly > 0 && (
        <p className="mt-3 text-xs/5 text-muted">
          Also stated by {statedOnly.toLocaleString()} ENR {statedOnly === 1 ? 'record' : 'records'} without a matching
          commit
        </p>
      )}
    </Card>
  );
}

export interface CustodyComplianceProps {
  client: string;
  /** Window start (unix seconds); 0 for all history, the latest days when omitted */
  from?: number;
  windowControl?: ReactNode;
}

/**
 * How often peers running the client served the columns they custody when probed, over time and by version.
 */
export function CustodyCompliance({ client, from, windowControl }: CustodyComplianceProps): JSX.Element {
  const probes = useCensus<FctCustodyProbeByClientDaily>(CENSUS_TABLES.custody, { client_eq: client }, from);
  const days = useMemo(() => {
    const byDay = new Map<string, { success: number; probes: number }>();
    for (const row of probes.rows) {
      const entry = byDay.get(row.day_start_date ?? '') ?? { success: 0, probes: 0 };
      entry.success += row.success_count ?? 0;
      entry.probes += row.probe_count ?? 0;
      byDay.set(row.day_start_date ?? '', entry);
    }
    return [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [probes.rows]);
  const versions = useMemo(() => {
    const byVersion = censusVersions(probes.latest, row => row.probe_count);
    return byVersion.map(entry => {
      const rows = probes.latest.filter(row => (row.version ?? '') === entry.version);
      return {
        ...entry,
        peers: sum(rows, row => row.peer_count),
        success: sum(rows, row => row.success_count),
        missingPeers: sum(rows, row => row.missing_peer_count),
      };
    });
  }, [probes.latest]);

  return (
    <Card
      rounded
      title="Custody compliance"
      subtitle={`Probes for columns a peer custodies, by the version it ran that day${sinceSuffix(probes.dataStart, from)}`}
      actions={windowControl}
    >
      {probes.isLoading ? (
        <LoadingContainer className="h-64 rounded-sm" />
      ) : days.length === 0 ? (
        <p className="text-sm text-muted">No peer running this client was probed.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <MultiLineChart
            series={[
              {
                name: formatClientName(client),
                client,
                color: getClientColor(client),
                data: days.map(([, day]) =>
                  day.probes > 0 ? Number(((day.success / day.probes) * 100).toFixed(2)) : null
                ),
              },
            ]}
            xAxis={{ type: 'category', labels: days.map(([day]) => formatDailyDate(day)), name: 'Date' }}
            yAxis={{ name: 'Probes answered (%)' }}
            height={280}
            showLegend
            legendPosition="top"
          />
          <Table
            variant="nested"
            data={versions.slice(0, 12)}
            getRowKey={row => `${row.resolved}|${row.version}`}
            columns={[
              { header: 'Version', accessor: row => <CensusVersionLabel client={client} version={row} /> },
              {
                header: 'Peers',
                accessor: row => row.peers.toLocaleString(),
                cellClassName: 'text-right tabular-nums text-muted',
                headerClassName: 'text-right',
              },
              {
                header: 'Answered',
                accessor: row => percent(row.success, row.count),
                cellClassName: 'text-right tabular-nums font-medium text-foreground',
                headerClassName: 'text-right',
              },
              {
                header: 'Peers missing columns',
                accessor: row => row.missingPeers.toLocaleString(),
                cellClassName: 'text-right tabular-nums text-muted',
                headerClassName: 'text-right',
              },
            ]}
          />
        </div>
      )}
    </Card>
  );
}

export interface VersionPeersProps {
  client: string;
  layer: ClientLayer;
  version: string;
  /** More cards for the grid */
  children?: ReactNode;
}

/**
 * One release on the P2P network on the latest full day: for consensus clients, the custody and QUIC of the P2P
 * peers whose build resolved to it, and the next fork its ENR records advertise. Countries and networks are
 * only counted per client, so they link to the client's Network tab.
 */
export function VersionPeers({ client, layer, version, children }: VersionPeersProps): JSX.Element {
  const own = useCensus<FctPeerCountByClClientDaily>(
    CENSUS_TABLES.clPeers,
    layer === 'consensus' ? { client_eq: client } : null
  );
  const rows = own.latest.filter(row => row.version === version && RESOLVED_STATUSES.has(row.release_status ?? ''));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {layer === 'consensus' && (
          <Card
            rounded
            title="Custody and connections"
            subtitle={`P2P peers on this version ${PEER_SOURCE.consensus} on ${own.day ?? '-'}`}
          >
            {own.isLoading ? (
              <LoadingContainer className="h-40 rounded-sm" />
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted">No P2P peer {PEER_SOURCE.consensus} runs this version.</p>
            ) : (
              <div className="flex flex-col gap-4">
                <dl>
                  <dt className="text-xs/5 text-muted">P2P peers</dt>
                  <dd className="text-sm/6 font-semibold text-foreground tabular-nums">
                    {sum(rows, row => row.peer_count).toLocaleString()}
                  </dd>
                </dl>
                <CustodyBuckets client={client} rows={rows} />
              </div>
            )}
          </Card>
        )}
        <EnrReadiness client={client} layer={layer} version={version} />
        {children}
      </div>
      <Link
        to="/ethereum/clients/$client"
        params={{ client }}
        search={{ tab: 'network' }}
        className="self-start text-sm text-primary hover:underline"
      >
        Countries and networks of all {formatClientName(client)} P2P peers
      </Link>
    </div>
  );
}
