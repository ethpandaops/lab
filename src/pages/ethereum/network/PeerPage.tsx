import { type JSX, type ReactNode, useMemo } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { intPeerDailyOrderByPeerIdServiceList } from '@/api/sdk.gen';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { Card } from '@/components/Layout/Card';
import { Table } from '@/components/Lists/Table';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import { CountryFlag } from '@/components/Elements/CountryFlag';
import { CopyToClipboard } from '@/components/Elements/CopyToClipboard';
import { useNetwork } from '@/hooks/useNetwork';
import { useNetworkChangeRedirect } from '@/hooks/useNetworkChangeRedirect';
import { SLOTS_PER_EPOCH } from '@/utils/beacon';
import { getDataVizColors } from '@/utils/dataVizColors';
import { fetchAllPages } from '@/utils/api-pagination';
import { formatClientName } from '@/utils/graffiti';
import { formatDataDate } from '@/pages/ethereum/clients/utils/client-versions';
import { CountsNote, PlaceSkeleton, SeriesCard } from './components';
import { countryName, dayStart } from './utils/network-census';
import { line } from './utils/network-series';
import { calendarDays, isHosting, peerDays, shortPeerId, versionSpans, type PeerDay } from './utils/network-peers';

type ListFn = Parameters<typeof fetchAllPages>[0];

const TABLE = 'int_peer_daily_order_by_peer_id';

const CONTINENTS: Record<string, string> = {
  AF: 'Africa',
  AN: 'Antarctica',
  AS: 'Asia',
  EU: 'Europe',
  NA: 'North America',
  OC: 'Oceania',
  SA: 'South America',
};

/** A labelled value of the peer's latest day */
function Fact({ label, children }: { label: string; children: ReactNode }): JSX.Element {
  return (
    <div>
      <dt className="text-xs/5 text-muted">{label}</dt>
      <dd className="text-sm/6 text-foreground">{children}</dd>
    </div>
  );
}

const yesNo = (value: boolean | null | undefined): string => (value == null ? '-' : value ? 'Yes' : 'No');

/** Which sources saw the peer */
function sources(row: PeerDay): string {
  if (row.seen_by_sentry && row.seen_by_enr) return 'Sentries and ENR crawl';
  return row.seen_by_sentry ? 'Sentries' : 'ENR crawl';
}

/**
 * One consensus peer over every day it was counted: its client and versions, where it runs, how it connects, and how
 * far behind it ran. Peers off hosting providers' networks are placed no finer than their country.
 */
export function PeerPage(): JSX.Element {
  const { peerId } = useParams({ from: '/ethereum/network/peers/$peerId' });
  useNetworkChangeRedirect('/ethereum/network');
  const { currentNetwork } = useNetwork();

  const query = useQuery({
    queryKey: ['network', 'peer', currentNetwork?.name, peerId],
    queryFn: ({ signal }) =>
      fetchAllPages<PeerDay>(
        intPeerDailyOrderByPeerIdServiceList as ListFn,
        { query: { peer_id_eq: peerId, page_size: 1000 } },
        TABLE,
        signal
      ),
    enabled: !!currentNetwork,
  });

  const days = useMemo(() => peerDays(query.data ?? []), [query.data]);
  const latest = days[days.length - 1];
  const first = days[0];
  const axis = useMemo(
    () => (first && latest ? calendarDays(first.day_start_date ?? '', latest.day_start_date ?? '') : []),
    [first, latest]
  );
  const byDay = useMemo(() => new Map(days.map(row => [row.day_start_date ?? '', row])), [days]);
  const value = (pick: (row: PeerDay) => number | null | undefined): Array<number | null> =>
    axis.map(day => {
      const row = byDay.get(day);
      return row ? (pick(row) ?? null) : null;
    });
  const { CHART_CATEGORICAL_COLORS: palette } = getDataVizColors();
  const spans = versionSpans(days);
  const hosting = latest ? isHosting(latest) : false;
  const code = latest?.country_code && /^[A-Z]{2}$/.test(latest.country_code) ? latest.country_code : null;

  return (
    <Container>
      <Header
        title={`Peer ${shortPeerId(peerId)}`}
        description={
          <span className="inline-flex max-w-full items-center gap-2">
            <span className="font-mono text-xs break-all">{peerId}</span>
            <CopyToClipboard content={peerId} ariaLabel="Copy peer ID" />
          </span>
        }
      />
      <div className="flex flex-col gap-6">
        {query.isLoading ? (
          <PlaceSkeleton />
        ) : !latest ? (
          <Card rounded>
            <h3 className="text-base/7 font-semibold text-foreground">No peer with this ID was counted</h3>
          </Card>
        ) : (
          <>
            <Card
              rounded
              title="Latest day"
              subtitle={`Counted on ${formatDataDate(dayStart(latest.day_start_date ?? ''))}`}
            >
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
                <Fact label="Client">
                  {latest.client && latest.client !== 'unknown' && latest.client !== 'other' ? (
                    <Link
                      to="/ethereum/clients/$client"
                      params={{ client: latest.client }}
                      search={{ tab: 'network' }}
                      className="inline-flex items-center gap-2 hover:text-primary"
                    >
                      <ClientLogo client={latest.client} size={18} noLink decorative />
                      {formatClientName(latest.client)}
                    </Link>
                  ) : latest.client === 'other' ? (
                    'Other'
                  ) : (
                    'Unknown'
                  )}
                </Fact>
                <Fact label="Version">
                  <span className="font-mono text-xs">{latest.version || latest.agent_version || '-'}</span>
                </Fact>
                <Fact label="Country">
                  {code ? (
                    <Link
                      to="/ethereum/network/countries/$country"
                      params={{ country: code.toLowerCase() }}
                      className="inline-flex items-center gap-2 hover:text-primary"
                    >
                      <CountryFlag code={code} />
                      {countryName(code)}
                    </Link>
                  ) : (
                    '-'
                  )}
                </Fact>
                <Fact label="Continent">{CONTINENTS[latest.continent_code ?? ''] ?? '-'}</Fact>
                <Fact label="Network type">{hosting ? 'Hosting provider' : 'Other'}</Fact>
                {hosting && code && latest.city && (
                  <Fact label="City">
                    <Link
                      to="/ethereum/network/countries/$country/$city"
                      params={{ country: code.toLowerCase(), city: latest.city }}
                      className="hover:text-primary"
                    >
                      {latest.city}
                    </Link>
                  </Fact>
                )}
                {hosting && !!latest.autonomous_system_number && (
                  <Fact label="Network">
                    <Link
                      to="/ethereum/network/asn/$asn"
                      params={{ asn: String(latest.autonomous_system_number) }}
                      className="hover:text-primary"
                    >
                      {latest.autonomous_system_organization || `AS${latest.autonomous_system_number}`}
                    </Link>
                  </Fact>
                )}
                <Fact label="Seen by">{sources(latest)}</Fact>
                <Fact label="Custody groups">{latest.custody_group_count ?? '-'}</Fact>
                <Fact label="Dialled">{yesNo(latest.dialled)}</Fact>
                <Fact label="QUIC">{yesNo(latest.quic_connected || latest.quic_listen)}</Fact>
                <Fact label="Advertises IPv6">{yesNo(latest.ipv6)}</Fact>
                <Fact label="First seen">{formatDataDate(dayStart(first.day_start_date ?? ''))}</Fact>
                <Fact label="Days seen">{days.length.toLocaleString()}</Fact>
              </dl>
            </Card>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <SeriesCard
                title="Head lag"
                days={axis}
                yName="Slots"
                empty="This peer never answered a status request."
                series={[
                  line(
                    'Median head lag',
                    value(row => row.head_lag_slots),
                    palette[0]
                  ),
                ]}
              />
              <SeriesCard
                title="Latency"
                days={axis}
                yName="ms"
                empty="No latency was measured for this peer."
                series={[
                  line(
                    'Median latency',
                    value(row => row.latency_ms),
                    palette[1]
                  ),
                ]}
              />
              <SeriesCard
                title="History served"
                days={axis}
                yName="Epochs"
                empty="This peer never reported its earliest available slot."
                series={[
                  line(
                    'History served',
                    value(row =>
                      row.served_history_slots == null ? null : Math.floor(row.served_history_slots / SLOTS_PER_EPOCH)
                    ),
                    palette[2]
                  ),
                ]}
              />
              <SeriesCard
                title="Custody groups"
                days={axis}
                yName="Groups"
                empty="This peer never reported its custody."
                series={[
                  {
                    ...line(
                      'Custody groups',
                      value(row => row.custody_group_count),
                      palette[3]
                    ),
                    step: 'end',
                  },
                ]}
              />
            </div>

            <Card rounded title="Versions">
              <Table
                variant="nested"
                data={spans}
                getRowKey={span => `${span.first}-${span.version}`}
                columns={[
                  {
                    header: 'Client',
                    accessor: span =>
                      span.client && span.client !== 'unknown' && span.client !== 'other' ? (
                        <span className="inline-flex items-center gap-2 text-foreground">
                          <ClientLogo client={span.client} size={18} noLink decorative />
                          {formatClientName(span.client)}
                        </span>
                      ) : (
                        <span className="text-muted">{span.client === 'other' ? 'Other' : 'Unknown'}</span>
                      ),
                  },
                  {
                    header: 'Version',
                    accessor: span => span.version || '-',
                    cellClassName: 'font-mono text-xs text-muted',
                  },
                  {
                    header: 'From',
                    accessor: span => formatDataDate(dayStart(span.first)),
                    cellClassName: 'hidden sm:table-cell text-muted',
                    headerClassName: 'hidden sm:table-cell',
                  },
                  {
                    header: 'To',
                    accessor: span => formatDataDate(dayStart(span.last)),
                    cellClassName: 'text-muted',
                  },
                  {
                    header: 'Days',
                    accessor: span => span.days.toLocaleString(),
                    cellClassName: 'text-right tabular-nums text-foreground',
                    headerClassName: 'text-right',
                  },
                ]}
              />
            </Card>
          </>
        )}
        <CountsNote />
      </div>
    </Container>
  );
}
