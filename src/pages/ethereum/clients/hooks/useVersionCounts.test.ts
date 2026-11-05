import { describe, it, expect } from 'vitest';
import { chunksFor } from './useVersionCounts';

const to = Date.UTC(2026, 10, 5) / 1000;

describe('chunksFor', () => {
  it('starts all history at the first year with blocks, not 1970', () => {
    const keys = chunksFor('daily', 0, to).map(chunk => chunk.key);
    expect(keys[0]).toBe('2020');
    expect(keys).toHaveLength(7);
  });

  it('starts a long window in the year it starts', () => {
    const keys = chunksFor('daily', Date.UTC(2024, 5, 1) / 1000, to).map(chunk => chunk.key);
    expect(keys).toEqual(['2024', '2025', '2026-2026-11-05']);
  });

  it('lists the days of a short window', () => {
    const chunks = chunksFor('daily', to - 2 * 86400, to);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].query).toEqual({ day_start_date_in_values: '2026-11-03,2026-11-04' });
  });
});
