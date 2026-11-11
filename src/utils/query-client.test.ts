import { afterEach, describe, expect, it, vi } from 'vitest';
import { getBoundsQueryKey, getConfigQueryKey } from '@/lab-api/@tanstack/react-query.gen';
import { createQueryClient } from './query-client';

// As lab-backend injects it: a cartographoor network, with a service the spec does not name, and a network configured
// outside cartographoor, which has no forks or links
const config = {
  networks: [
    {
      name: 'mainnet',
      display_name: 'Mainnet',
      chain_id: 1,
      genesis_time: 1606824023,
      genesis_delay: 0,
      forks: { consensus: { fulu: { epoch: 411392, timestamp: 1764798551 } } },
      service_urls: { dora: 'https://dora.example', cbtApi: 'https://cbt-api.example' },
    },
    {
      name: 'local-devnet',
      display_name: 'Local Devnet',
      chain_id: 32382,
      genesis_time: 1234567890,
      genesis_delay: 10,
      forks: { consensus: null },
      service_urls: null,
    },
  ],
  features: [{ path: '/ethereum/live', disabled_networks: [] }],
};

describe('createQueryClient', () => {
  afterEach(() => {
    delete window.__CONFIG__;
    delete window.__BOUNDS__;
    vi.restoreAllMocks();
  });

  it('seeds the configuration and bounds lab-backend injected into the page, whole', () => {
    window.__CONFIG__ = config;
    window.__BOUNDS__ = { mainnet: { fct_block: { min: 1, max: 2 } }, hoodi: { fct_block: { min: 3, max: 4 } } };

    const client = createQueryClient();

    expect(client.getQueryData(getConfigQueryKey())).toEqual(config);
    expect(client.getQueryData(getBoundsQueryKey({ path: { network: 'hoodi' } }))).toEqual({
      fct_block: { min: 3, max: 4 },
    });
  });

  it('leaves out what does not match the spec, so it is fetched instead', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    window.__CONFIG__ = { networks: [{ name: 'mainnet' }], features: [] };
    window.__BOUNDS__ = { mainnet: { fct_block: { min: 1 } }, hoodi: { fct_block: { min: 3, max: 4 } } };

    const client = createQueryClient();

    expect(client.getQueryData(getConfigQueryKey())).toBeUndefined();
    expect(client.getQueryData(getBoundsQueryKey({ path: { network: 'mainnet' } }))).toBeUndefined();
    expect(client.getQueryData(getBoundsQueryKey({ path: { network: 'hoodi' } }))).toEqual({
      fct_block: { min: 3, max: 4 },
    });
    expect(consoleError).toHaveBeenCalledTimes(2);
  });
});
