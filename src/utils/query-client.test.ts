import { afterEach, describe, expect, it } from 'vitest';
import { getBoundsQueryKey, getConfigQueryKey } from '@/lab-api/@tanstack/react-query.gen';
import { boundsFixture, configFixture } from '@/test-utils/handlers';
import { createQueryClient } from './query-client';

describe('createQueryClient', () => {
  afterEach(() => {
    delete window.__CONFIG__;
    delete window.__BOUNDS__;
  });

  it('seeds the configuration and bounds lab-backend injected into the page', () => {
    window.__CONFIG__ = configFixture;
    window.__BOUNDS__ = { mainnet: boundsFixture, hoodi: { fct_block: { min: 3, max: 4 } } };

    const client = createQueryClient();

    expect(client.getQueryData(getConfigQueryKey())).toEqual(configFixture);
    expect(client.getQueryData(getBoundsQueryKey({ path: { network: 'mainnet' } }))).toEqual(boundsFixture);
    expect(client.getQueryData(getBoundsQueryKey({ path: { network: 'hoodi' } }))).toEqual({
      fct_block: { min: 3, max: 4 },
    });
  });
});
