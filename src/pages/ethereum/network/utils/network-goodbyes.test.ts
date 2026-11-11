import { describe, expect, it } from 'vitest';
import { clientGoodbyes, reasonsIn } from './network-goodbyes';

const day = '2026-11-12';

describe('reasonsIn', () => {
  it('puts too many peers first, orders the rest by peers and folds unknown codes into one reason', () => {
    const reasons = reasonsIn([
      { day_start_date: day, code: '3', peer_count: 4 },
      { day_start_date: day, code: '129', peer_count: 2 },
      { day_start_date: day, code: 250, peer_count: 7 },
      { day_start_date: day, code: '99', peer_count: 3 },
      { day_start_date: day, code: '237', peer_count: 3 },
      { day_start_date: day, code: '1', peer_count: 0 },
    ]);
    expect(reasons.map(reason => reason.label)).toEqual([
      'Too many peers',
      'Peer score too low',
      'Other codes',
      'Fault or error',
    ]);
  });
});

describe('clientGoodbyes', () => {
  it('sums each client over days and codes, most goodbyes first with unknown and other last', () => {
    const clients = clientGoodbyes([
      { day_start_date: day, client: 'other', code: '129', goodbye_count: 900, peer_count: 900 },
      { day_start_date: day, client: 'unknown', code: '129', goodbye_count: 800, peer_count: 800 },
      { day_start_date: day, client: 'teku', code: '129', goodbye_count: 30, peer_count: 10 },
      { day_start_date: '2026-11-13', client: 'teku', code: '250', goodbye_count: 5, peer_count: 2 },
      { day_start_date: day, client: 'teku', code: '42', goodbye_count: 1, peer_count: 1 },
      { day_start_date: day, client: 'teku', code: '43', goodbye_count: 1, peer_count: 1 },
      { day_start_date: day, client: 'lighthouse', code: '129', goodbye_count: 20, peer_count: 20 },
    ]);
    expect(clients.map(entry => entry.client)).toEqual(['teku', 'lighthouse', 'unknown', 'other']);
    expect(clients[0]).toMatchObject({ goodbyes: 37, peers: 14 });
    expect(Object.fromEntries(clients[0]?.byReason ?? [])).toEqual({ '129': 10, '250': 2, other: 2 });
  });
});
