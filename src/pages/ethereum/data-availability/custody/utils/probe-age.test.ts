import { describe, expect, it } from 'vitest';
import { summariseProbeAge } from './probe-age';

describe('summariseProbeAge', () => {
  const rows = [
    { day_start_date: '2026-11-02', slot_age_bucket: '0-1d', client: 'prysm', probe_count: 100, success_count: 99 },
    { day_start_date: '2026-11-02', slot_age_bucket: '0-1d', client: 'teku', probe_count: 300, success_count: 297 },
    { day_start_date: '2026-11-02', slot_age_bucket: '14-18d', client: 'teku', probe_count: 200, success_count: 180 },
    { day_start_date: '2026-11-01', slot_age_bucket: '14-18d', client: 'prysm', probe_count: 50, success_count: 40 },
    // Past retention: left out
    { day_start_date: '2026-11-02', slot_age_bucket: '18d+', client: 'teku', probe_count: 9, success_count: 0 },
  ];

  it('weights each day by its column probes, not by client rows', () => {
    const { days, byDay } = summariseProbeAge(rows);
    expect(days).toEqual(['2026-11-01', '2026-11-02']);
    // 396 of 400, not the mean of 99% and 99%
    expect(byDay['0-1d']).toEqual([null, 99]);
    expect(byDay['14-18d']).toEqual([80, 90]);
  });

  it('sums each client over all days and orders clients by probes', () => {
    const { byClient } = summariseProbeAge(rows);
    expect(byClient.map(row => row.client)).toEqual(['teku', 'prysm']);
    expect(byClient[0]?.probes).toBe(500);
    expect(byClient[1]?.availability['14-18d']).toBe(80);
    expect(byClient[1]?.availability['1-3d']).toBeNull();
  });
});
