import { describe, expect, it } from 'vitest';
import { countryShares, dayShares, seriesDays, topCountries, type ConcentrationRow } from './network-series';

type Row = { day_start_date: string; part: number; whole: number };

const rows: Row[] = [
  { day_start_date: '2026-04-02', part: 1, whole: 4 },
  { day_start_date: '2026-04-02', part: 3, whole: 16 },
  { day_start_date: '2026-03-31', part: 0, whole: 0 },
  { day_start_date: '2026-04-01', part: 5, whole: 5 },
];

describe('seriesDays', () => {
  it('sorts the days and drops those where the count is zero', () => {
    expect(seriesDays(rows)).toEqual(['2026-03-31', '2026-04-01', '2026-04-02']);
    expect(seriesDays(rows, row => row.whole)).toEqual(['2026-04-01', '2026-04-02']);
  });
});

describe('dayShares', () => {
  it('pools each day’s rows before dividing, and gives null on a day with no whole', () => {
    const shares = dayShares(
      rows,
      ['2026-03-31', '2026-04-01', '2026-04-02', '2026-04-03'],
      row => row.part,
      row => row.whole
    );
    // 2026-04-02 pools to 4 of 20, not the mean of 25% and 18.75%
    expect(shares).toEqual([null, 100, 20, null]);
  });
});

describe('topCountries', () => {
  it('ranks real countries by nodes and leaves out the unlocated', () => {
    const countries = [
      { day_start_date: '2026-11-07', country_code: 'DE', peer_count: 30 },
      { day_start_date: '2026-11-07', country_code: 'unknown', peer_count: 90 },
      { day_start_date: '2026-11-07', country_code: 'US', peer_count: 50 },
      { day_start_date: '2026-11-07', country_code: 'FR', peer_count: 0 },
      { day_start_date: '2026-11-07', country_code: 'JP', peer_count: 10 },
    ];
    expect(topCountries(countries, 2)).toEqual(['US', 'DE']);
    expect(topCountries(countries, 5)).toEqual(['US', 'DE', 'JP']);
  });
});

describe('countryShares', () => {
  it('divides by the nodes geolocated to a continent that day, not by all nodes', () => {
    const wholes: ConcentrationRow[] = [
      // 80 of 100 nodes geolocated; the 20 unknown are not part of the whole
      {
        day_start_date: '2026-11-06',
        peer_count: 100,
        europe_peer_count: 60,
        asia_peer_count: 20,
        unknown_continent_peer_count: 20,
      },
    ];
    const countries = [
      { day_start_date: '2026-11-06', country_code: 'DE', peer_count: 20 },
      { day_start_date: '2026-11-07', country_code: 'DE', peer_count: 25 },
    ];
    expect(countryShares(countries, wholes, ['2026-11-06', '2026-11-07'], 'DE')).toEqual([25, null]);
  });
});
