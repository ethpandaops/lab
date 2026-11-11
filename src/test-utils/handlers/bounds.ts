import { delay, http, HttpResponse } from 'msw';
import type { Bounds } from '@/hooks/useBounds';
import { BASE_URL, PATH_PREFIX } from '@/utils/api-config';

export const boundsFixture: Bounds = {
  fct_block: {
    min: 1000000,
    max: 2000000,
  },
  fct_attestation: {
    min: 5000000,
    max: 10000000,
  },
  fct_transaction: {
    min: 1000000,
    max: 2000000,
  },
};

const url = `${BASE_URL}${PATH_PREFIX}/:network/bounds`;

/** MSW handlers for GET /api/v1/:network/bounds, one per state a test or story needs. */
export const boundsHandlers = {
  success: http.get(url, () => HttpResponse.json(boundsFixture)),
  failure: http.get(url, () => new HttpResponse(null, { status: 502, statusText: 'Bad Gateway' })),
  pending: http.get(url, async () => {
    await delay('infinite');
    return HttpResponse.json(boundsFixture);
  }),
};
