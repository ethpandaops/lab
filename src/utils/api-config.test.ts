import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/test-utils';
import { intCustodyProbeServiceList } from '@/api/sdk.gen';

describe('API client Int64 handling', () => {
  it('keeps peer_id_unique_key lossless from the response back into a filter', async () => {
    const requests: Request[] = [];
    server.use(
      http.get('http://lab.test/api/v1/int_custody_probe', ({ request }) => {
        requests.push(request);
        return new HttpResponse(
          '{"int_custody_probe":[{"peer_id_unique_key":6292022559433348801,"slot":15558666},{"peer_id_unique_key":-42,"slot":1}]}',
          { headers: { 'Content-Type': 'application/json' } }
        );
      })
    );

    const { data } = await intCustodyProbeServiceList({
      baseUrl: 'http://lab.test',
      query: { probe_date_time_gte: 1, peer_id_unique_key_in_values: '6292022559433348801' },
    });

    expect(data?.int_custody_probe?.map(probe => String(probe.peer_id_unique_key))).toEqual([
      '6292022559433348801',
      '-42',
    ]);
    expect(data?.int_custody_probe?.[0]?.slot).toBe(15558666);

    expect(requests.map(request => new URL(request.url).searchParams.get('peer_id_unique_key_in_values'))).toEqual([
      '6292022559433348801',
    ]);
  });
});
