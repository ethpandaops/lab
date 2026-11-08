import type { JSX } from 'react';
import { Stats } from '@/components/DataDisplay/Stats';
import type { Stat } from '@/components/DataDisplay/Stats/Stats.types';
import { ANGLE_COLORS } from '@/pages/ethereum/clients/utils/angle-colors';
import { formatDataDate } from '@/pages/ethereum/clients/utils/client-versions';
import type { OverviewCensus } from '../../hooks/useOverviewCensus';
import { countDelta, dayStart, formatShare, shareDelta, total } from '../../utils/network-census';

/** A share of consensus peers on a day, as the part and the whole */
function shareOf<T extends { peer_count?: number }>(
  rows: T[] | null,
  part: (row: T) => number | undefined,
  whole: (row: T) => number | undefined = row => row.peer_count
): { part: number; whole: number } | null {
  return rows ? { part: total(rows, part), whole: total(rows, whole) } : null;
}

/**
 * Headline counts on the range's last day, each with its change since the range's first day.
 */
export function NetworkStats({ census }: { census: OverviewCensus }): JSX.Element {
  const { cl, el, networks } = census;
  const peers = (row: { peer_count?: number }): number | undefined => row.peer_count;
  const nodes = (row: { node_count?: number }): number | undefined => row.node_count;
  const hosting = (row: { network_type?: string; peer_count?: number }): number | undefined =>
    row.network_type === 'hosting' ? row.peer_count : 0;
  const supernodes = (row: { custody_128_peer_count?: number }): number | undefined => row.custody_128_peer_count;

  const clPeers = total(cl.end, peers);
  const elNodes = total(el.end, nodes);
  const hosted = shareOf(networks.end, hosting)!;
  const dialled = shareOf(cl.end, row => row.dialled_peer_count)!;
  const quic = shareOf(cl.end, row => row.quic_listen_peer_count)!;
  const elSince =
    el.startDay && el.startDay !== cl.startDay ? `Change since ${formatDataDate(dayStart(el.startDay))}` : undefined;

  const stats: Stat[] = [
    {
      id: 'consensus',
      name: 'Consensus peers',
      value: clPeers.toLocaleString(),
      delta: countDelta(cl.start ? total(cl.start, peers) : null, clPeers),
      subtitle: 'A lower bound',
      accentColor: ANGLE_COLORS.peers,
    },
    {
      id: 'execution',
      name: 'Execution nodes',
      value: el.end.length > 0 ? elNodes.toLocaleString() : '-',
      delta: countDelta(el.start ? total(el.start, nodes) : null, elNodes),
      subtitle: elSince ?? 'On this chain',
      accentColor: ANGLE_COLORS.peers,
    },
    {
      id: 'hosted',
      name: 'Hosted',
      value: formatShare(hosted.part, hosted.whole),
      delta: shareDelta(shareOf(networks.start, hosting), hosted),
      subtitle: 'Consensus peers on hosting networks',
      accentColor: ANGLE_COLORS.peers,
    },
    {
      id: 'supernodes',
      name: 'Supernodes',
      value: total(cl.end, supernodes).toLocaleString(),
      delta: countDelta(cl.start ? total(cl.start, supernodes) : null, total(cl.end, supernodes)),
      subtitle: 'Custody all 128 groups',
      accentColor: ANGLE_COLORS.peers,
    },
    {
      id: 'dialled',
      name: 'Dialled',
      value: formatShare(dialled.part, dialled.whole),
      delta: shareDelta(
        shareOf(cl.start, row => row.dialled_peer_count),
        dialled
      ),
      subtitle: 'Answered a sentry’s dial',
      accentColor: ANGLE_COLORS.peers,
    },
    {
      id: 'quic',
      name: 'QUIC',
      value: formatShare(quic.part, quic.whole),
      delta: shareDelta(
        shareOf(cl.start, row => row.quic_listen_peer_count),
        quic
      ),
      subtitle: 'Listen on QUIC',
      accentColor: ANGLE_COLORS.peers,
    },
  ];

  return <Stats gridClassName="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6" stats={stats} />;
}
