import { describe, it, expect } from 'vitest';
import { getRangePage } from './RangePager.utils';

describe('getRangePage', () => {
  it('follows the latest number when no page is requested', () => {
    expect(getRangePage(undefined, 1000, 0, 25)).toEqual({
      top: 1000,
      bottom: 976,
      isLatest: true,
      newerTop: undefined,
      olderTop: 975,
    });
  });

  it('pages back contiguously without gaps or overlap', () => {
    const first = getRangePage(undefined, 1000, 0, 25);
    const second = getRangePage(first.olderTop, 1000, 0, 25);
    expect(second.top).toBe(first.bottom - 1);
    expect(second.newerTop).toBe(1000);
    expect(getRangePage(second.newerTop, 1000, 0, 25).isLatest).toBe(true);
  });

  it('caps the newer page at the latest number rather than skipping past it', () => {
    // 990 + 25 would overshoot; the newer page must be the latest page
    expect(getRangePage(990, 1000, 0, 25).newerTop).toBe(1000);
  });

  it('treats a request past the latest number as the latest page', () => {
    expect(getRangePage(5000, 1000, 0, 25)).toMatchObject({ top: 1000, isLatest: true });
  });

  it('lands on the oldest full page for a request below the earliest number', () => {
    expect(getRangePage(3, 1000, 100, 25)).toMatchObject({ top: 124, bottom: 100, olderTop: undefined });
  });

  it('shortens the oldest page instead of reading below the earliest number', () => {
    expect(getRangePage(110, 1000, 100, 25)).toMatchObject({ top: 124, bottom: 100 });
    expect(getRangePage(130, 1000, 100, 25)).toMatchObject({ top: 130, bottom: 106, olderTop: 105 });
    expect(getRangePage(105, 1000, 100, 25).bottom).toBe(100);
  });

  it('handles a chain shorter than one page', () => {
    expect(getRangePage(undefined, 10, 0, 25)).toEqual({
      top: 10,
      bottom: 0,
      isLatest: true,
      newerTop: undefined,
      olderTop: undefined,
    });
  });
});
