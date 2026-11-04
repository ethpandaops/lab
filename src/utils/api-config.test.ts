import { afterEach, describe, expect, it, vi } from 'vitest';
import { intCustodyProbeServiceList } from '@/api/sdk.gen';

describe('API client Int64 handling', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps peer_id_unique_key lossless from the response back into a filter', async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL) =>
        new Response(
          '{"int_custody_probe":[{"peer_id_unique_key":6292022559433348801,"slot":15558666},{"peer_id_unique_key":-42,"slot":1}]}',
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
    );
    vi.stubGlobal('fetch', fetchMock);

    const { data } = await intCustodyProbeServiceList({
      baseUrl: 'http://lab.test',
      query: { probe_date_time_gte: 1, peer_id_unique_key_in_values: '6292022559433348801' },
    });

    expect(data?.int_custody_probe?.map(probe => String(probe.peer_id_unique_key))).toEqual([
      '6292022559433348801',
      '-42',
    ]);
    expect(data?.int_custody_probe?.[0].slot).toBe(15558666);

    const request = fetchMock.mock.calls[0][0] as Request;
    expect(new URL(request.url).searchParams.get('peer_id_unique_key_in_values')).toBe('6292022559433348801');
  });
});
