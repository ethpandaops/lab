import type { FctPeerGoodbyeByClClientDaily, FctPeerGoodbyeDaily } from '@/api/types.gen';

/** A goodbye reason as the overview shows it; codes outside the spec share one reason */
export interface GoodbyeReason {
  key: string;
  label: string;
  color: string;
}

/** Code a peer sends when it is full; nearly every goodbye */
export const TOO_MANY_PEERS = '129';

/** The goodbye codes of the consensus spec and the clients that share them; none is a client or an angle */
const REASONS: Record<string, Omit<GoodbyeReason, 'key'>> = {
  [TOO_MANY_PEERS]: { label: 'Too many peers', color: '#94a3b8' },
  '250': { label: 'Peer score too low', color: '#ef4444' },
  '3': { label: 'Fault or error', color: '#f59e0b' },
  '1': { label: 'Client shutdown', color: '#0ea5e9' },
  '2': { label: 'Irrelevant network', color: '#8b5cf6' },
  '128': { label: 'Unable to verify network', color: '#ec4899' },
  '251': { label: 'Banned our sentry', color: '#7f1d1d' },
};

const OTHER_CODES: GoodbyeReason = { key: 'other', label: 'Other codes', color: '#475569' };

/**
 * The reason a goodbye code stands for. Codes are UInt64, which the API sends as strings although its types say
 * number.
 */
export function goodbyeReason(code: number | string | undefined): GoodbyeReason {
  const key = String(code);
  const known = REASONS[key];
  return known ? { key, ...known } : OTHER_CODES;
}

/** A goodbye row as the API sends it, its code a string */
type GoodbyeRow = Omit<FctPeerGoodbyeDaily, 'code'> & { code?: number | string };
type ClientGoodbyeRow = Omit<FctPeerGoodbyeByClClientDaily, 'code'> & { code?: number | string };

/** The reasons the rows hold, too many peers first and the rest by peers, most first */
export function reasonsIn(rows: GoodbyeRow[]): GoodbyeReason[] {
  const peers = new Map<string, { reason: GoodbyeReason; peers: number }>();
  for (const row of rows) {
    const reason = goodbyeReason(row.code);
    const seen = peers.get(reason.key) ?? { reason, peers: 0 };
    seen.peers += row.peer_count ?? 0;
    peers.set(reason.key, seen);
  }
  return [...peers.values()]
    .filter(seen => seen.peers > 0)
    .sort(
      (a, b) => Number(b.reason.key === TOO_MANY_PEERS) - Number(a.reason.key === TOO_MANY_PEERS) || b.peers - a.peers
    )
    .map(seen => seen.reason);
}

/** One client's goodbyes over a range */
export interface ClientGoodbyes {
  client: string;
  /** Goodbye messages our sentries received from the client's peers */
  goodbyes: number;
  /** Peers summed over the days and codes, the whole each reason's share is of */
  peers: number;
  /** Those peers by reason key */
  byReason: Map<string, number>;
}

/** Each client's goodbyes over the rows, most goodbyes first, with unknown and other agents last */
export function clientGoodbyes(rows: ClientGoodbyeRow[]): ClientGoodbyes[] {
  const clients = new Map<string, ClientGoodbyes>();
  for (const row of rows) {
    if (!row.client) continue;
    const entry = clients.get(row.client) ?? { client: row.client, goodbyes: 0, peers: 0, byReason: new Map() };
    const key = goodbyeReason(row.code).key;
    entry.goodbyes += row.goodbye_count ?? 0;
    entry.peers += row.peer_count ?? 0;
    entry.byReason.set(key, (entry.byReason.get(key) ?? 0) + (row.peer_count ?? 0));
    clients.set(row.client, entry);
  }
  const last = (client: string): number => (client === 'other' ? 2 : client === 'unknown' ? 1 : 0);
  return [...clients.values()]
    .filter(entry => entry.goodbyes > 0)
    .sort((a, b) => last(a.client) - last(b.client) || b.goodbyes - a.goodbyes);
}
