/**
 * Newest-first reads of large time-keyed tables without an open primary-key range.
 *
 * cbt-api reads with FINAL, and FINAL with `ORDER BY … DESC LIMIT n` reads and sorts the whole time range it is
 * given. So a page of the newest rows is read from a narrow window ending at its upper bound, widened step by step
 * (1h, 6h, 1d, 7d, 30d, 90d, 365d, then down to the table's start) until the page fills. The windows are read one
 * after another, never in parallel.
 */

const HOUR = 3600;
const DAY = 24 * HOUR;

/** Window widths tried in turn, in seconds */
export const WIDENING_STEPS = [HOUR, 6 * HOUR, DAY, 7 * DAY, 30 * DAY, 90 * DAY, 365 * DAY] as const;

/** A half-open time range, `[gte, lt)`, in unix seconds */
export interface TimeWindow {
  gte: number;
  lt: number;
}

/**
 * Windows for a read anchored at `edge`, narrowest first. Newest first (`desc`), each window ends at `edge` (exclusive)
 * and the last reaches back to `limit`, the table's start. Oldest first (`asc`), each starts at `edge` and the last
 * reaches `limit` (exclusive). Without a `limit`, or with a non-positive one, the widest step is the last window.
 */
export function wideningWindows(
  edge: number,
  limit: number | undefined,
  direction: 'asc' | 'desc' = 'desc'
): TimeWindow[] {
  const bound = limit !== undefined && limit > 0 ? limit : undefined;
  const windows: TimeWindow[] = [];
  for (const step of WIDENING_STEPS) {
    if (direction === 'desc') {
      if (bound !== undefined && edge - step <= bound) break;
      windows.push({ gte: edge - step, lt: edge });
    } else {
      if (bound !== undefined && edge + step >= bound) break;
      windows.push({ gte: edge, lt: edge + step });
    }
  }
  if (bound !== undefined && (direction === 'desc' ? bound < edge : bound > edge)) {
    windows.push(direction === 'desc' ? { gte: bound, lt: edge } : { gte: edge, lt: bound });
  }
  return windows;
}

/**
 * Read `windows` in order until one holds at least `enough` rows. Returns that window's rows, or the last window's
 * when none fills; `last` says whether the rows come from the last window, so nothing lies beyond them.
 */
export async function fetchWidening<T>(
  windows: TimeWindow[],
  enough: number,
  fetchWindow: (window: TimeWindow) => Promise<T[]>
): Promise<{ rows: T[]; window?: TimeWindow; last: boolean }> {
  for (const [index, window] of windows.entries()) {
    const rows = await fetchWindow(window);
    const last = index === windows.length - 1;
    if (rows.length >= enough || last) return { rows, window, last };
  }
  return { rows: [], last: true };
}

/**
 * Where a newest-first page starts: rows before `end` (exclusive, unix seconds), after skipping the first `skip`
 * rows, which the previous page already showed. They share the second `end - 1` with its oldest row.
 */
export interface TimeCursor {
  end: number;
  skip: number;
}

export function encodeTimeCursor(cursor: TimeCursor): string {
  return `${cursor.end}.${cursor.skip}`;
}

export function parseTimeCursor(value: string | undefined): TimeCursor | undefined {
  const match = value ? /^(\d+)\.(\d+)$/.exec(value) : null;
  return match ? { end: Number(match[1]), skip: Number(match[2]) } : undefined;
}

/** Exclusive upper bound for the newest page: the second after now */
export function nowEnd(): number {
  return Math.floor(Date.now() / 1000) + 1;
}

export interface NewestFirstOptions<T> {
  /** Rows per page */
  pageSize: number;
  /** Exclusive upper bound, unix seconds: `nowEnd()`, a user's range end, or a cursor's `end` */
  end: number;
  /** Rows at the top of the range to leave out, a cursor's `skip` */
  skip?: number;
  /** Lower bound, unix seconds: the table's start from `/bounds`, or a user's range start, never 0 */
  floor: number | undefined;
  /** Time of a row, the column the windows filter on */
  timeOf: (row: T) => number | undefined;
  /**
   * Rows in `window`, newest first with a fixed tie-break, at most `limit` of them. Filter with `_gte: window.gte`
   * and `_lt: window.lt`.
   */
  fetchWindow: (window: TimeWindow, limit: number) => Promise<T[]>;
}

export interface NewestFirstPage<T> {
  rows: T[];
  /** Cursor for the next, older page; undefined once the floor is reached */
  next?: TimeCursor;
}

/**
 * One newest-first page of rows before `end`, read through widening windows. A window is enough once it holds one
 * row past the page, so the last page has no next page. The next page's cursor ends just after the oldest row's
 * second and skips the rows of that second already shown.
 */
export async function fetchNewestFirst<T>({
  pageSize,
  end,
  skip = 0,
  floor,
  timeOf,
  fetchWindow,
}: NewestFirstOptions<T>): Promise<NewestFirstPage<T>> {
  const wanted = skip + pageSize;
  const { rows } = await fetchWidening(wideningWindows(end, floor), wanted + 1, window =>
    fetchWindow(window, wanted + 1)
  );
  const page = rows.slice(skip, wanted);
  return { rows: page, next: rows.length > wanted ? nextTimeCursor(page, end, skip, timeOf) : undefined };
}

/** Cursor for the page after `page`, which was read before `end` skipping `skip` rows */
export function nextTimeCursor<T>(
  page: T[],
  end: number,
  skip: number,
  timeOf: (row: T) => number | undefined
): TimeCursor | undefined {
  const oldestRow = page.at(-1);
  const oldest = oldestRow === undefined ? undefined : timeOf(oldestRow);
  if (oldest === undefined) return undefined;
  const sameSecond = page.filter(row => timeOf(row) === oldest).length;
  return { end: oldest + 1, skip: (oldest + 1 === end ? skip : 0) + sameSecond };
}
