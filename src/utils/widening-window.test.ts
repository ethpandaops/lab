import { describe, expect, it, vi } from 'vitest';
import {
  WIDENING_STEPS,
  encodeTimeCursor,
  fetchNewestFirst,
  nextTimeCursor,
  parseTimeCursor,
  wideningWindows,
  type NewestFirstPage,
  type TimeWindow,
} from './widening-window';

const HOUR = 3600;
const DAY = 24 * HOUR;
const END = 1_800_000_000;

interface Row {
  t: number;
  id: string;
}

/** A table of rows, served newest first with the id as tie-break, like the API with an order_by */
function table(rows: Row[]): {
  fetchWindow: (window: TimeWindow, limit: number) => Promise<Row[]>;
  calls: TimeWindow[];
} {
  const calls: TimeWindow[] = [];
  const sorted = [...rows].sort((a, b) => b.t - a.t || a.id.localeCompare(b.id));
  return {
    calls,
    fetchWindow: async (window, limit) => {
      calls.push(window);
      return sorted.filter(row => row.t >= window.gte && row.t < window.lt).slice(0, limit);
    },
  };
}

const timeOf = (row: Row): number => row.t;

describe('wideningWindows', () => {
  it('widens from 1h to 365d, then down to the floor', () => {
    const floor = END - 2 * 365 * DAY;
    expect(wideningWindows(END, floor)).toEqual([
      ...WIDENING_STEPS.map(step => ({ gte: END - step, lt: END })),
      { gte: floor, lt: END },
    ]);
  });

  it('stops at a floor inside the steps', () => {
    expect(wideningWindows(END, END - 2 * DAY)).toEqual([
      { gte: END - HOUR, lt: END },
      { gte: END - 6 * HOUR, lt: END },
      { gte: END - DAY, lt: END },
      { gte: END - 2 * DAY, lt: END },
    ]);
    expect(wideningWindows(END, END - DAY).at(-1)).toEqual({ gte: END - DAY, lt: END });
  });

  it('never reads from 0: without a floor, the widest step is the last window', () => {
    expect(wideningWindows(END, undefined).at(-1)).toEqual({ gte: END - 365 * DAY, lt: END });
    expect(wideningWindows(END, 0).at(-1)).toEqual({ gte: END - 365 * DAY, lt: END });
  });

  it('has no window when the floor is at or past the end', () => {
    expect(wideningWindows(END, END)).toEqual([]);
  });

  it('widens upwards oldest first', () => {
    expect(wideningWindows(END, END + 3 * HOUR, 'asc')).toEqual([
      { gte: END, lt: END + HOUR },
      { gte: END, lt: END + 3 * HOUR },
    ]);
  });
});

describe('fetchNewestFirst', () => {
  it('stops at the first window that fills the page', async () => {
    const rows = Array.from({ length: 50 }, (_, i) => ({ t: END - 1 - i * 60, id: `r${i}` }));
    const { fetchWindow, calls } = table(rows);
    const page = await fetchNewestFirst({ pageSize: 10, end: END, floor: END - 400 * DAY, timeOf, fetchWindow });
    expect(calls).toEqual([{ gte: END - HOUR, lt: END }]);
    expect(page.rows.map(row => row.id)).toEqual(rows.slice(0, 10).map(row => row.id));
    const oldestShown = rows[9];
    if (!oldestShown) throw new Error('Expected a tenth row');
    expect(page.next).toEqual({ end: oldestShown.t + 1, skip: 1 });
  });

  it('widens one window at a time until the page and one row past it fill', async () => {
    const rows = [
      { t: END - 10, id: 'a' },
      { t: END - 2 * DAY, id: 'b' },
      { t: END - 20 * DAY, id: 'c' },
      { t: END - 200 * DAY, id: 'd' },
    ];
    const { fetchWindow, calls } = table(rows);
    const page = await fetchNewestFirst({ pageSize: 2, end: END, floor: END - 400 * DAY, timeOf, fetchWindow });
    expect(calls.map(call => END - call.gte)).toEqual([HOUR, 6 * HOUR, DAY, 7 * DAY, 30 * DAY]);
    expect(page.rows.map(row => row.id)).toEqual(['a', 'b']);
    expect(page.next).toEqual({ end: END - 2 * DAY + 1, skip: 1 });
  });

  it('reads sequentially', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const fetchWindow = vi.fn(async () => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise(resolve => setTimeout(resolve, 1));
      inFlight--;
      return [];
    });
    await fetchNewestFirst({ pageSize: 5, end: END, floor: END - 400 * DAY, timeOf, fetchWindow });
    expect(fetchWindow).toHaveBeenCalledTimes(WIDENING_STEPS.length + 1);
    expect(maxInFlight).toBe(1);
  });

  it('ends at the floor with no next page when the data runs out', async () => {
    const rows = [
      { t: END - 10, id: 'a' },
      { t: END - 100 * DAY, id: 'b' },
    ];
    const { fetchWindow, calls } = table(rows);
    const page = await fetchNewestFirst({ pageSize: 5, end: END, floor: END - 200 * DAY, timeOf, fetchWindow });
    expect(calls.at(-1)).toEqual({ gte: END - 200 * DAY, lt: END });
    expect(page.rows.map(row => row.id)).toEqual(['a', 'b']);
    expect(page.next).toBeUndefined();
  });

  it('has no next page when the last window holds exactly one page', async () => {
    const rows = [
      { t: END - 10, id: 'a' },
      { t: END - 20, id: 'b' },
    ];
    const { fetchWindow } = table(rows);
    const page = await fetchNewestFirst({ pageSize: 2, end: END, floor: END - 30 * 60, timeOf, fetchWindow });
    expect(page.rows).toHaveLength(2);
    expect(page.next).toBeUndefined();
  });

  it('pages through rows sharing a second without losing or repeating any', async () => {
    // Ten rows in one second straddle every page boundary
    const rows = [
      { t: END - 5, id: 'a' },
      ...Array.from({ length: 10 }, (_, i) => ({ t: END - 50, id: `s${i}` })),
      { t: END - 900, id: 'z' },
    ];
    const { fetchWindow } = table(rows);
    const seen: string[] = [];
    let cursor: { end: number; skip: number } | undefined = { end: END, skip: 0 };
    let pages = 0;
    while (cursor && pages < 10) {
      // Round-trip through the URL form, as the pages do
      const parsed = parseTimeCursor(encodeTimeCursor(cursor))!;
      const page: NewestFirstPage<Row> = await fetchNewestFirst({
        pageSize: 4,
        end: parsed.end,
        skip: parsed.skip,
        floor: END - DAY,
        timeOf,
        fetchWindow,
      });
      seen.push(...page.rows.map(row => row.id));
      cursor = page.next;
      pages++;
    }
    expect(seen).toEqual(['a', ...Array.from({ length: 10 }, (_, i) => `s${i}`), 'z']);
    expect(pages).toBe(3);
  });

  it('queries every window with one row past the page and the skipped rows', async () => {
    const fetchWindow = vi.fn(async () => []);
    await fetchNewestFirst({ pageSize: 25, end: END, skip: 3, floor: END - HOUR / 2, timeOf, fetchWindow });
    expect(fetchWindow).toHaveBeenCalledWith({ gte: END - HOUR / 2, lt: END }, 29);
  });
});

describe('nextTimeCursor', () => {
  it('ends after the oldest row and skips the rows of its second already shown', () => {
    const page = [
      { t: 100, id: 'a' },
      { t: 90, id: 'b' },
      { t: 90, id: 'c' },
    ];
    expect(nextTimeCursor(page, 200, 0, timeOf)).toEqual({ end: 91, skip: 2 });
  });

  it('adds to the previous skip when the whole page shares the cursor second', () => {
    const page = [
      { t: 90, id: 'c' },
      { t: 90, id: 'd' },
    ];
    expect(nextTimeCursor(page, 91, 2, timeOf)).toEqual({ end: 91, skip: 4 });
  });

  it('has no cursor for an empty page', () => {
    expect(nextTimeCursor([], 91, 0, timeOf)).toBeUndefined();
  });
});

describe('parseTimeCursor', () => {
  it('rejects anything but end.skip', () => {
    expect(parseTimeCursor('1800000000.3')).toEqual({ end: 1_800_000_000, skip: 3 });
    expect(parseTimeCursor('b2Zmc2V0OjI1')).toBeUndefined();
    expect(parseTimeCursor(undefined)).toBeUndefined();
  });
});
