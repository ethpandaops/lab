import { describe, expect, it } from 'vitest';
import { payloadTimeBounds } from './payload-query';

const GENESIS = 1_606_824_023;
const TABLE_START = 1_765_240_163;

describe('payloadTimeBounds', () => {
  it('reads from the table start, not 0, without a range', () => {
    expect(payloadTimeBounds({}, GENESIS, TABLE_START)).toEqual({ floor: TABLE_START, end: undefined });
  });

  it('keeps a range from the URL, clamping its start to the table', () => {
    expect(payloadTimeBounds({ timeStart: 1_700_000_000, timeEnd: 1_800_000_000 }, GENESIS, TABLE_START)).toEqual({
      floor: TABLE_START,
      end: 1_800_000_001,
    });
    expect(payloadTimeBounds({ timeStart: 1_780_000_000 }, GENESIS, TABLE_START).floor).toBe(1_780_000_000);
  });

  it("reads a slot's own second", () => {
    expect(payloadTimeBounds({ slot: 100 }, GENESIS, TABLE_START)).toEqual({
      floor: GENESIS + 1200,
      end: GENESIS + 1201,
    });
  });
});
