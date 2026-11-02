import { describe, it, expect } from 'vitest';
import {
  blockSearchSchema,
  fromDateTimeInput,
  graffitiBlocksQuery,
  paginationUpdate,
  parseSort,
  sortUpdate,
  toDateTimeInput,
} from './block-filters';

const GENESIS = 1606824023;

describe('blockSearchSchema', () => {
  it('keeps numeric-looking text filters as strings and leaves absent ones unset', () => {
    // The router parses ?proposer=123 and ?clCommit=4123 as numbers
    const search = blockSearchSchema.parse({ proposer: 123, clCommit: 4123 });
    expect(search.proposer).toBe('123');
    expect(search.clCommit).toBe('4123');
    expect(search.graffiti).toBeUndefined();
    expect(search.entity).toBeUndefined();
  });

  it('drops malformed sort, page and size instead of failing the route', () => {
    const search = blockSearchSchema.parse({ sort: 'slot; drop', page: 0, size: 33, since: -5 });
    expect(search).toEqual({});
  });
});

describe('graffitiBlocksQuery', () => {
  it('bounds an open time range at genesis and orders newest first', () => {
    const query = graffitiBlocksQuery({}, GENESIS);
    expect(query.slot_start_date_time_gte).toBe(GENESIS);
    expect(query.order_by).toBe('slot_start_date_time desc');
    expect(query.page_size).toBe(25);
    expect(query.page_token).toBeUndefined();
  });

  it('jumps straight to a page by row offset', () => {
    const query = graffitiBlocksQuery({ page: 3, size: 50 }, GENESIS);
    expect(atob(query.page_token ?? '')).toBe('offset:100');
  });

  it('uses eq for one proposer and in_values for several', () => {
    expect(graffitiBlocksQuery({ proposer: '42' }, GENESIS)).toMatchObject({ proposer_index_eq: 42 });
    const many = graffitiBlocksQuery({ proposer: '42,7,x' }, GENESIS);
    expect(many.proposer_index_in_values).toBe('42,7');
    expect(many.proposer_index_eq).toBeUndefined();
  });

  it('maps each filter to its column', () => {
    const query = graffitiBlocksQuery(
      {
        since: 100,
        until: 200,
        slotMin: 5,
        slotMax: 0,
        cl: 'lighthouse',
        clVersion: '8.0.0',
        clCommit: 'E423',
        el: 'geth',
        format: 'codes_long',
        graffiti: 'Lido',
        entity: 'lido',
      },
      GENESIS
    );
    expect(query).toMatchObject({
      slot_start_date_time_gte: 100,
      slot_start_date_time_lte: 200,
      slot_gte: 5,
      slot_lte: 0,
      consensus_client_eq: 'lighthouse',
      consensus_client_version_eq: 'v8.0.0',
      consensus_client_commit_starts_with: 'e423',
      execution_client_eq: 'geth',
      graffiti_format_eq: 'codes_long',
      graffiti_text_contains: 'Lido',
      entity_eq: 'lido',
    });
  });

  it('breaks ties on non-time columns by newest first', () => {
    expect(graffitiBlocksQuery({ sort: 'entity asc' }, GENESIS).order_by).toBe('entity asc,slot_start_date_time desc');
    // Columns the table cannot sort by fall back to newest first
    expect(graffitiBlocksQuery({ sort: 'block_root asc' }, GENESIS).order_by).toBe('slot_start_date_time desc');
  });
});

describe('table state updates', () => {
  it('returns to the first page when the page size changes', () => {
    expect(paginationUpdate({ page: 4 }, 3, 50)).toEqual({ size: 50, page: undefined });
    expect(paginationUpdate({ page: 4, size: 50 }, 4, 50)).toEqual({ page: 5 });
    expect(paginationUpdate({ page: 2 }, 0, 25)).toEqual({ page: undefined });
  });

  it('keeps the default sort out of the URL', () => {
    expect(sortUpdate([{ id: 'slot_start_date_time', desc: true }])).toEqual({ sort: undefined, page: undefined });
    expect(sortUpdate([{ id: 'proposer_index', desc: false }])).toEqual({
      sort: 'proposer_index asc',
      page: undefined,
    });
    expect(sortUpdate([])).toEqual({ sort: undefined, page: undefined });
  });

  it('reads sort only for allowed columns', () => {
    expect(parseSort('proposer_index asc', ['proposer_index'])).toEqual({ field: 'proposer_index', desc: false });
    expect(parseSort('entity asc', ['proposer_index'])).toEqual({ field: 'slot_start_date_time', desc: true });
  });
});

describe('datetime inputs', () => {
  it('round-trips UTC wall time', () => {
    const timestamp = Date.UTC(2026, 10, 2, 14, 30) / 1000;
    expect(toDateTimeInput(timestamp, true)).toBe('2026-11-02T14:30');
    expect(fromDateTimeInput('2026-11-02T14:30', true)).toBe(timestamp);
    expect(fromDateTimeInput('', true)).toBeUndefined();
  });

  it('round-trips local wall time', () => {
    const timestamp = new Date(2026, 10, 2, 14, 30).getTime() / 1000;
    expect(toDateTimeInput(timestamp, false)).toBe('2026-11-02T14:30');
    expect(fromDateTimeInput('2026-11-02T14:30', false)).toBe(timestamp);
  });
});
