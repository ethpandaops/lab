import type { JSX } from 'react';
import { Link } from '@tanstack/react-router';
import type { FctPeerGoodbyeByClClientDaily, FctPeerGoodbyeDaily } from '@/api/types.gen';
import type { SeriesData } from '@/components/Charts/MultiLine';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import { Card } from '@/components/Layout/Card';
import { Table } from '@/components/Lists/Table';
import { formatDataDate } from '@/pages/ethereum/clients/utils/client-versions';
import { CONSENSUS_CLIENTS_SET } from '@/utils/ethereum';
import { formatClientName } from '@/utils/graffiti';
import { SeriesCard } from '@/pages/ethereum/network/components/SeriesCard';
import { dayStart, formatShare } from '@/pages/ethereum/network/utils/network-census';
import {
  clientGoodbyes,
  goodbyeReason,
  reasonsIn,
  TOO_MANY_PEERS,
  type GoodbyeReason,
} from '@/pages/ethereum/network/utils/network-goodbyes';
import { dayShares, seriesDays } from '@/pages/ethereum/network/utils/network-series';

export interface GoodbyeChartsProps {
  /** Goodbyes per reason code, every day of the range */
  reasons: FctPeerGoodbyeDaily[];
  /** Goodbyes per consensus client and reason code, every day of the range */
  clients: FctPeerGoodbyeByClClientDaily[];
}

const peers = (row: FctPeerGoodbyeDaily): number | undefined => row.peer_count;

/** Each reason's share of each day's peers, as a band of one stacked bar a day */
function reasonBars(rows: FctPeerGoodbyeDaily[], days: string[], reasons: GoodbyeReason[]): SeriesData[] {
  return reasons.map(reason => ({
    name: reason.label,
    data: dayShares(rows, days, row => (goodbyeReason(row.code).key === reason.key ? row.peer_count : 0), peers),
    color: reason.color,
    stack: 'reasons',
    seriesType: 'bar',
    barMaxWidth: 40,
  }));
}

/**
 * Why remote consensus peers disconnect from our sentries, from the Goodbye messages they send: every reason each day,
 * the reasons other than a full peer table on their own, and each client's reasons over the range.
 */
export function GoodbyeCharts({ reasons, clients }: GoodbyeChartsProps): JSX.Element {
  const days = seriesDays(reasons, peers);
  if (days.length === 0) {
    return (
      <Card rounded>
        <p className="text-sm text-muted">No goodbyes were counted in this range.</p>
      </Card>
    );
  }
  const all = reasonsIn(reasons);
  const rest = reasons.filter(row => goodbyeReason(row.code).key !== TOO_MANY_PEERS);
  const restDays = seriesDays(rest, peers);
  const byClient = clientGoodbyes(clients);
  const clientReasons = reasonsIn(clients);
  const span = `${formatDataDate(dayStart(days[0]))} to ${formatDataDate(dayStart(days[days.length - 1]))}`;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SeriesCard
          title="Why peers drop our sentries"
          days={days}
          yName="Share of peers"
          percent="stack"
          empty=""
          series={reasonBars(reasons, days, all)}
        />
        <SeriesCard
          title="Reasons other than too many peers"
          days={restDays}
          yName="Share of peers"
          percent="stack"
          empty="Every peer that said goodbye in this range had too many peers."
          series={reasonBars(
            rest,
            restDays,
            all.filter(reason => reason.key !== TOO_MANY_PEERS)
          )}
        />
        <div className="xl:col-span-2">
          <Card rounded title="Reasons by client" subtitle={`Share of each client's peers, ${span}`}>
            <Table
              variant="nested"
              data={byClient}
              getRowKey={row => row.client}
              columns={[
                {
                  header: 'Client',
                  headerClassName: 'align-bottom',
                  accessor: row =>
                    CONSENSUS_CLIENTS_SET.has(row.client) ? (
                      <Link
                        to="/ethereum/clients/$client"
                        params={{ client: row.client }}
                        search={{ tab: 'network' }}
                        className="inline-flex items-center gap-2 font-medium whitespace-nowrap text-foreground hover:text-primary"
                      >
                        <ClientLogo client={row.client} size={20} noLink decorative />
                        {formatClientName(row.client)}
                      </Link>
                    ) : (
                      <span className="pl-7 text-muted">{row.client === 'unknown' ? 'Unknown' : 'Other'}</span>
                    ),
                },
                {
                  header: 'Goodbyes',
                  accessor: row => row.goodbyes.toLocaleString(),
                  cellClassName: 'text-right tabular-nums text-muted',
                  headerClassName: 'text-right align-bottom',
                },
                ...clientReasons.map(reason => ({
                  header: reason.label,
                  accessor: (row: (typeof byClient)[number]) => {
                    const part = row.byReason.get(reason.key) ?? 0;
                    return part > 0 ? formatShare(part, row.peers) : '-';
                  },
                  cellClassName: 'text-right tabular-nums text-foreground',
                  // Reason names wrap so every reason fits beside the client at desktop widths
                  headerClassName: 'text-right align-bottom whitespace-normal!',
                })),
              ]}
            />
          </Card>
        </div>
      </div>
      <p className="text-xs/5 text-muted">
        Goodbyes are the reasons remote peers gave when they disconnected from one of our sentries. A peer that gave
        several reasons in a day counts under each.
      </p>
    </div>
  );
}
