import { type JSX, type ReactNode, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { ChevronRightIcon } from '@heroicons/react/20/solid';
import { Card } from '@/components/Layout/Card';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { ClientLabel } from '@/components/Ethereum/ClientLabel';
import { getClientColor } from '@/utils/ethereum';
import { CENSUS_TABLES, type FctPeerCountByClientPairDaily } from '../../api/client-models';
import { SHARE_WINDOW_TEXT, UNKNOWN_CLIENT, type ShareWindow } from '../../constants';
import { useCensus, useClientCounts } from '../../hooks';
import { usePairMetrics, type AttestationPairRow, type ProposalPairRow } from '../../hooks/usePairMetrics';
import { partnerRows, type ClientLayer, type PartnerRow } from '../../utils/client-share';
import { sinceSuffix } from '../../utils/client-versions';
import { ATTESTATION_METRICS, PROPOSAL_METRICS, ratio, type ClientMetric } from '../../utils/client-metrics';
import { ShareBar } from '../ShareBar';

/** The other layer's name, for labels */
function otherLabel(layer: ClientLayer): string {
  return layer === 'consensus' ? 'execution' : 'consensus';
}

/** Article before the other layer's name */
function otherArticle(layer: ClientLayer): string {
  return layer === 'consensus' ? 'an' : 'a';
}

/**
 * The clients of the other layer that `client` runs with, by proposed blocks over the share window and by IPv4
 * addresses on the latest day of the P2P census.
 */
function usePartners(
  client: string,
  layer: ClientLayer,
  shareWindow: ShareWindow
): { rows: PartnerRow[]; unnamedBlocks: number; pairDay: string | null; matchRate: number | null; isLoading: boolean } {
  const counts = useClientCounts(shareWindow);
  const pairs = useCensus<FctPeerCountByClientPairDaily>(CENSUS_TABLES.pairs, {});
  const { rows, unnamedBlocks } = useMemo(
    () => partnerRows(client, layer, counts.records, pairs.latest),
    [client, layer, counts.records, pairs.latest]
  );
  const totals = pairs.latest[0];
  return {
    rows,
    unnamedBlocks,
    pairDay: pairs.day,
    matchRate:
      totals?.cl_ip_count && totals.matched_ip_count !== undefined
        ? (totals.matched_ip_count / totals.cl_ip_count) * 100
        : null,
    isLoading: counts.isLoading || pairs.isLoading,
  };
}

/** A share as a bar and a percentage, or a dash */
function Share({ share, color }: { share: number | null; color: string }): JSX.Element {
  if (share === null) return <span className="block text-right text-sm/6 text-muted">-</span>;
  return (
    <div className="flex items-center gap-3">
      <div className="hidden min-w-16 flex-1 sm:block">
        <ShareBar share={share} color={color} showThresholds={false} />
      </div>
      <span className="w-12 shrink-0 text-right text-sm/6 font-medium text-foreground tabular-nums">
        {share > 0 && share < 0.05 ? '<0.1%' : `${share.toFixed(1)}%`}
      </span>
    </div>
  );
}

/** Table header cell */
function Th({ children, right = false }: { children: ReactNode; right?: boolean }): JSX.Element {
  return (
    <th
      scope="col"
      className={`px-3 py-2 align-bottom text-xs/5 font-medium whitespace-nowrap text-foreground first:pl-0 last:pr-0 ${right ? 'text-right' : 'text-left'}`}
    >
      {children}
    </th>
  );
}

export interface PartnerSharesProps {
  client: string;
  layer: ClientLayer;
  shareWindow: ShareWindow;
}

/**
 * Pairings panel: for each client of the other layer, its share of this client's proposed blocks (graffiti,
 * stake-weighted) and of its IPv4 addresses (P2P census, node-weighted), linked to the per-partner performance.
 */
export function PartnerShares({ client, layer, shareWindow }: PartnerSharesProps): JSX.Element {
  const partners = usePartners(client, layer, shareWindow);
  const other = otherLabel(layer);
  const article = otherArticle(layer);

  return (
    <Card
      rounded
      title={`${other === 'execution' ? 'Execution' : 'Consensus'} clients it runs with`}
      footer={
        <dl className="flex flex-col gap-1 text-xs/5 text-muted">
          <div>
            <dt className="inline font-medium text-foreground">Proposed blocks: </dt>
            <dd className="inline">
              share of its blocks whose graffiti also names {article} {other} client, {SHARE_WINDOW_TEXT[shareWindow]}.
              {partners.unnamedBlocks > 0 &&
                ` ${partners.unnamedBlocks.toLocaleString()} blocks named no ${other} client.`}
            </dd>
          </div>
          <div>
            <dt className="inline font-medium text-foreground">P2P addresses: </dt>
            <dd className="inline">
              share of its IPv4 addresses on {partners.pairDay ?? '-'} that run exactly one consensus and one execution
              client
              {partners.matchRate !== null &&
                `; ${partners.matchRate.toFixed(0)}% of consensus addresses have an execution client on the same IP`}
              .
            </dd>
          </div>
        </dl>
      }
    >
      {partners.isLoading ? (
        <LoadingContainer className="h-48 rounded-sm" />
      ) : partners.rows.length === 0 ? (
        <p className="text-sm text-muted">
          No block or address paired it with {article} {other} client.
        </p>
      ) : (
        <div className="-mx-(--card-inset) overflow-x-auto px-(--card-inset)">
          <table className="w-full border-collapse sm:min-w-[36rem]">
            <thead className="border-b border-border">
              <tr>
                <Th>Client</Th>
                <Th>Proposed blocks</Th>
                <Th>P2P addresses</Th>
                <th aria-hidden className="w-28" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {partners.rows.map(row => (
                <tr key={row.client}>
                  <td className="py-2 pr-3">
                    <ClientLabel client={row.client} />
                  </td>
                  <td className="w-[34%] px-3 py-2">
                    <Share share={row.blockShare} color={getClientColor(row.client)} />
                  </td>
                  <td className="w-[34%] px-3 py-2">
                    <Share share={row.addressShare} color={getClientColor(row.client)} />
                  </td>
                  <td className="py-2 pl-3 text-right">
                    <Link
                      from="/ethereum/clients/$client"
                      to="."
                      search={prev => ({ ...prev, tab: 'performance' as const })}
                      hash={`partner-${row.client}`}
                      className="inline-flex items-center gap-0.5 text-sm/6 whitespace-nowrap text-muted hover:text-primary"
                    >
                      Performance
                      <ChevronRightIcon className="size-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

/** A per-partner metric column */
interface PartnerMetric<T> {
  metric: ClientMetric<T>;
  rows: (partner: string) => T[];
}

export interface PartnerPerformanceProps {
  client: string;
  layer: ClientLayer;
  shareWindow: ShareWindow;
  /** Window start (unix seconds); all history when omitted */
  from?: number;
}

/**
 * The client broken down by its partner on the other layer: share of its proposed blocks, and once the API serves
 * the per-pair tables, proposal and attestation metrics for each pair.
 */
export function PartnerPerformance({ client, layer, shareWindow, from }: PartnerPerformanceProps): JSX.Element {
  const partners = usePartners(client, layer, shareWindow);
  const pairMetrics = usePairMetrics(client, layer, from);
  const other = otherLabel(layer);
  const article = otherArticle(layer);
  const partnerKey = layer === 'consensus' ? 'execution_client' : 'consensus_client';

  const columns = useMemo(() => {
    if (!pairMetrics.available) return [];
    const proposalsBy = (partner: string): ProposalPairRow[] =>
      pairMetrics.proposals.filter(row => row[partnerKey] === partner);
    const attestationsBy = (partner: string): AttestationPairRow[] =>
      pairMetrics.attestations.filter(row => row[partnerKey] === partner);
    const proposal = (id: string): PartnerMetric<ProposalPairRow> => ({
      metric: PROPOSAL_METRICS.find(m => m.id === id)! as unknown as ClientMetric<ProposalPairRow>,
      rows: proposalsBy,
    });
    const attestation = (id: string): PartnerMetric<AttestationPairRow> => ({
      metric: ATTESTATION_METRICS.find(m => m.id === id)! as unknown as ClientMetric<AttestationPairRow>,
      rows: attestationsBy,
    });
    return [
      ...(pairMetrics.proposals.length > 0
        ? [proposal('mev-share'), proposal('missed'), proposal('orphaned'), proposal('seen-p50')]
        : []),
      ...(pairMetrics.attestations.length > 0
        ? [attestation('attested'), attestation('head'), attestation('target'), attestation('inclusion')]
        : []),
    ] as Array<PartnerMetric<ProposalPairRow> | PartnerMetric<AttestationPairRow>>;
  }, [pairMetrics, partnerKey]);

  const value = (column: (typeof columns)[number], partner: string): string => {
    const result = ratio(column.rows(partner) as never[], column.metric as ClientMetric<never>);
    return result === null ? '-' : column.metric.format(result);
  };
  const rows: PartnerRow[] = [
    ...partners.rows.filter(row => row.blocks > 0 || columns.length > 0),
    // The pair tables keep blocks and validators whose graffiti names no partner
    ...(columns.length > 0
      ? [{ client: UNKNOWN_CLIENT, blocks: partners.unnamedBlocks, blockShare: null, addresses: 0, addressShare: null }]
      : []),
  ];

  return (
    <Card
      rounded
      title={`By ${other} client`}
      subtitle={`Its proposed blocks by the ${other} client named alongside it in graffiti, ${SHARE_WINDOW_TEXT[shareWindow]}${
        columns.length > 0
          ? `; per-pair metrics${sinceSuffix(pairMetrics.dataStart, from) || ' over the same window'}`
          : ''
      }`}
    >
      {partners.isLoading || pairMetrics.isLoading ? (
        <LoadingContainer className="h-40 rounded-sm" />
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted">
          No block in this window named {article} {other} client alongside it.
        </p>
      ) : (
        <div className="-mx-(--card-inset) overflow-x-auto px-(--card-inset)">
          <table className="w-full border-collapse" style={{ minWidth: columns.length > 0 ? '64rem' : undefined }}>
            <thead className="border-b border-border">
              <tr>
                <Th>Client</Th>
                <Th>Share of blocks</Th>
                <Th right>Blocks</Th>
                {columns.map(column => (
                  <Th key={column.metric.id} right>
                    {column.metric.label}
                  </Th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {rows.map(row => (
                <tr key={row.client} id={`partner-${row.client}`} className="scroll-mt-24 target:bg-primary/10">
                  <td className="py-2 pr-3">
                    {row.client === UNKNOWN_CLIENT ? (
                      <span className="text-sm/6 whitespace-nowrap text-muted">
                        With an unknown {layer === 'consensus' ? 'EL' : 'CL'}
                      </span>
                    ) : (
                      <ClientLabel client={row.client} />
                    )}
                  </td>
                  <td className="w-[30%] px-3 py-2">
                    <Share share={row.blockShare} color={getClientColor(row.client)} />
                  </td>
                  <td className="px-3 py-2 text-right text-sm/6 text-muted tabular-nums last:pr-0">
                    {row.blocks.toLocaleString()}
                  </td>
                  {columns.map(column => (
                    <td
                      key={column.metric.id}
                      className="px-3 py-2 text-right text-sm/6 text-foreground tabular-nums last:pr-0"
                    >
                      {value(column, row.client)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
