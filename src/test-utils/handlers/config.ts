import { delay, http, HttpResponse } from 'msw';
import type { Config } from '@/hooks/useConfig';
import { BASE_URL, PATH_PREFIX } from '@/utils/api-config';

// Fixtures are typed with the app's types, so a change that breaks them fails
// typecheck. One file per API domain.

export const configFixture: Config = {
  networks: [
    {
      name: 'holesky',
      display_name: 'Holesky',
      chain_id: 17000,
      genesis_time: 1695902100,
      genesis_delay: 300,
      forks: {
        consensus: {
          electra: {
            epoch: 115968,
            min_client_versions: {
              grandine: '1.0.0',
              lighthouse: '7.0.0-beta.0',
              lodestar: '1.27.0',
              nimbus: '25.2.0',
              prysm: '5.3.0',
              teku: '25.2.0',
            },
          },
          fusaka: {
            epoch: 165120,
            min_client_versions: {
              grandine: '2.0.0.rc0',
              lighthouse: '8.0.0-rc.0',
              lodestar: '1.35.0-rc.1',
              nimbus: '25.9.2',
              prysm: '6.1.0',
              teku: '25.9.3',
              tysm: '0.43.0',
            },
          },
        },
      },
    },
    {
      name: 'hoodi',
      display_name: 'Hoodi',
      chain_id: 560048,
      genesis_time: 1742212800,
      genesis_delay: 600,
      forks: {
        consensus: {
          electra: {
            epoch: 2048,
            min_client_versions: {
              grandine: '1.0.0',
              lighthouse: '7.0.0-beta.0',
              lodestar: '1.27.0',
              nimbus: '25.2.0',
              prysm: '5.3.0',
              teku: '25.2.0',
            },
          },
          fusaka: {
            epoch: 50688,
            min_client_versions: {
              grandine: '2.0.0.rc0',
              lighthouse: '8.0.0-rc.0',
              lodestar: '1.35.0-rc.1',
              nimbus: '25.9.2',
              prysm: '6.1.0',
              teku: '25.9.3',
              tysm: '0.43.0',
            },
          },
        },
      },
    },
    {
      name: 'mainnet',
      display_name: 'Mainnet',
      chain_id: 1,
      genesis_time: 1606824000,
      genesis_delay: 604800,
      forks: {
        consensus: {
          electra: {
            epoch: 364032,
            min_client_versions: {
              grandine: '1.1.0',
              lighthouse: '7.0.0',
              lodestar: '1.29.0',
              nimbus: '25.4.1',
              prysm: '6.0.0',
              teku: '25.4.1',
            },
          },
        },
      },
    },
    {
      name: 'sepolia',
      display_name: 'Sepolia',
      chain_id: 11155111,
      genesis_time: 1655647200,
      genesis_delay: 86400,
      forks: {
        consensus: {
          electra: {
            epoch: 222464,
            min_client_versions: {
              grandine: '1.0.0',
              lighthouse: '7.0.0-beta.0',
              lodestar: '1.27.0',
              nimbus: '25.2.0',
              prysm: '5.3.0',
              teku: '25.2.0',
            },
          },
          fusaka: {
            epoch: 272640,
            min_client_versions: {
              grandine: '2.0.0.rc0',
              lighthouse: '8.0.0-rc.0',
              lodestar: '1.35.0-rc.1',
              nimbus: '25.9.2',
              prysm: '6.1.0',
              teku: '25.9.3',
              tysm: '0.43.0',
            },
          },
        },
      },
    },
    {
      name: 'glamsterdam-devnet-7',
      display_name: 'Glamsterdam-devnet-7',
      chain_id: 7091047533,
      genesis_time: 1784808000,
      genesis_delay: 60,
      forks: {
        consensus: {
          gloas: { epoch: 0, min_client_versions: {} },
        },
      },
    },
    {
      name: 'glamsterdam-devnet-8',
      display_name: 'Glamsterdam-devnet-8',
      chain_id: 7091047534,
      genesis_time: 1786622400,
      genesis_delay: 60,
      forks: {
        consensus: {
          gloas: { epoch: 0, min_client_versions: {} },
        },
      },
    },
  ],
  features: [],
};

const url = `${BASE_URL}${PATH_PREFIX}/config`;

/** MSW handlers for GET /api/v1/config, one per state a test or story needs. */
export const configHandlers = {
  success: http.get(url, () => HttpResponse.json(configFixture)),
  failure: http.get(url, () => new HttpResponse(null, { status: 502, statusText: 'Bad Gateway' })),
  pending: http.get(url, async () => {
    await delay('infinite');
    return HttpResponse.json(configFixture);
  }),
};
