/** A page of a descending numeric sequence (slots, epochs), newest first. */
export interface RangePage {
  /** Highest number on the page (first row) */
  top: number;
  /** Lowest number on the page (last row) */
  bottom: number;
  /** `top` of the next newer page, or undefined when this page already reaches the latest */
  newerTop: number | undefined;
  /** `top` of the next older page, or undefined when this page already reaches the earliest */
  olderTop: number | undefined;
  /** Whether the page starts at the latest number */
  isLatest: boolean;
}

/**
 * Resolve which numbers a page covers.
 *
 * `from` is the requested top row; undefined (or anything at or past `latest`) means the newest
 * page. The page is clamped so it never extends past `latest` or below `earliest`, and a request
 * older than `earliest` lands on the oldest full page.
 */
export function getRangePage(from: number | undefined, latest: number, earliest: number, pageSize: number): RangePage {
  const floor = Math.min(Math.max(0, earliest), latest);
  const oldestTop = Math.min(latest, floor + pageSize - 1);
  const top = from === undefined ? latest : Math.min(latest, Math.max(oldestTop, Math.floor(from)));
  const bottom = Math.max(floor, top - pageSize + 1);
  const isLatest = top === latest;

  return {
    top,
    bottom,
    isLatest,
    newerTop: isLatest ? undefined : Math.min(latest, top + pageSize),
    olderTop: bottom > floor ? bottom - 1 : undefined,
  };
}
