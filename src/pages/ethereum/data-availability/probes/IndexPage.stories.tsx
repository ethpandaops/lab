import type { Meta, StoryObj } from '@storybook/react-vite';
import { ProbesView } from './components/ProbesView';
import type { IntCustodyProbe } from '@/api/types.gen';

// Use generated type directly
type CustodyProbe = IntCustodyProbe;

/**
 * Generate realistic mock probe data
 */
function generateMockProbes(count: number): CustodyProbe[] {
  const clients = ['lighthouse', 'prysm', 'teku', 'nimbus', 'lodestar'];
  const countries = ['US', 'DE', 'GB', 'JP', 'SG', 'AU', 'CA', 'FR', 'NL', 'SE'];
  const cities: Record<string, string[]> = {
    US: ['New York', 'Los Angeles', 'Chicago', 'Dallas', 'Seattle'],
    DE: ['Frankfurt', 'Berlin', 'Munich', 'Hamburg'],
    GB: ['London', 'Manchester', 'Birmingham'],
    JP: ['Tokyo', 'Osaka', 'Kyoto'],
    SG: ['Singapore'],
    AU: ['Sydney', 'Melbourne'],
    CA: ['Toronto', 'Vancouver'],
    FR: ['Paris', 'Lyon'],
    NL: ['Amsterdam', 'Rotterdam'],
    SE: ['Stockholm'],
  };
  const asns = [
    { org: 'Amazon Web Services', number: 16509 },
    { org: 'Google Cloud', number: 15169 },
    { org: 'Hetzner Online GmbH', number: 24940 },
    { org: 'OVH SAS', number: 16276 },
    { org: 'DigitalOcean', number: 14061 },
    { org: 'Vultr Holdings', number: 20473 },
  ];
  const results: ('success' | 'failure' | 'missing')[] = ['success', 'failure', 'missing'];
  const errors = [
    'connection timeout after 10s',
    'peer disconnected unexpectedly',
    'invalid response format',
    'rate limited by peer',
    'column not available',
    'network unreachable',
  ];

  const baseTime = Date.now();

  return Array.from({ length: count }, (_, i) => {
    const result = results[Math.floor(Math.random() * 100) < 75 ? 0 : Math.floor(Math.random() * 3)];
    const peerCountry = countries[Math.floor(Math.random() * countries.length)];
    const clientCountry = countries[Math.floor(Math.random() * countries.length)];
    const peerAsn = asns[Math.floor(Math.random() * asns.length)];

    return {
      event_date_time: baseTime - i * 12000 - Math.floor(Math.random() * 5000),
      slots: [Math.floor(Math.random() * 1000000) + 8000000],
      column_indices: Array.from({ length: Math.floor(Math.random() * 4) + 1 }, () => Math.floor(Math.random() * 128)),
      peer_id_unique_key: `16Uiu2HAm${Array.from({ length: 40 }, () =>
        'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.charAt(Math.floor(Math.random() * 62))
      ).join('')}`,
      result,
      response_time_ms: result === 'success' ? Math.floor(Math.random() * 500) + 50 : undefined,
      meta_peer_implementation: clients[Math.floor(Math.random() * clients.length)],
      meta_peer_version: `v${Math.floor(Math.random() * 3) + 4}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`,
      meta_peer_platform: 'linux/amd64',
      meta_peer_geo_country: peerCountry,
      meta_peer_geo_city: cities[peerCountry][Math.floor(Math.random() * cities[peerCountry].length)],
      meta_peer_geo_autonomous_system_organization: peerAsn.org,
      meta_peer_geo_autonomous_system_number: peerAsn.number,
      error: result === 'failure' ? errors[Math.floor(Math.random() * errors.length)] : undefined,
      meta_client_implementation: clients[Math.floor(Math.random() * clients.length)],
      meta_client_version: `v${Math.floor(Math.random() * 3) + 4}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`,
      meta_client_geo_country: clientCountry,
      meta_client_geo_city: cities[clientCountry][Math.floor(Math.random() * cities[clientCountry].length)],
      classification: Math.random() > 0.7 ? 'internal' : Math.random() > 0.5 ? 'corporate' : 'external',
    };
  });
}

// Generate mock data once for all stories
const mockProbes = generateMockProbes(50);
const mockProbesWithFailures = generateMockProbes(30).map((probe, i) => ({
  ...probe,
  result: i % 3 === 0 ? 'failure' : i % 5 === 0 ? 'missing' : 'success',
  error: i % 3 === 0 ? 'connection timeout after 10s' : undefined,
  response_time_ms: i % 3 === 0 ? undefined : probe.response_time_ms,
})) as CustodyProbe[];

const meta: Meta<typeof ProbesView> = {
  title: 'Pages/Ethereum/DataAvailability/Probes',
  component: ProbesView,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    Story => (
      <div className="min-w-[800px] rounded-xs bg-surface p-6">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ProbesView>;

/**
 * Default view showing the probes table with realistic data
 */
export const Default: Story = {
  args: {
    data: mockProbes,
    isLoading: false,
    pagination: {
      pageIndex: 0,
      pageSize: 10,
      onPaginationChange: () => {},
    },
  },
};

/**
 * Loading state with shimmer effect
 */
export const Loading: Story = {
  args: {
    data: [],
    isLoading: true,
    pagination: {
      pageIndex: 0,
      pageSize: 10,
      onPaginationChange: () => {},
    },
  },
};

/**
 * Empty state when no probes are available
 */
export const Empty: Story = {
  args: {
    data: [],
    isLoading: false,
    pagination: {
      pageIndex: 0,
      pageSize: 10,
      onPaginationChange: () => {},
    },
  },
};

/**
 * Table with a mix of success, failure, and missing results
 */
export const MixedResults: Story = {
  args: {
    data: mockProbesWithFailures,
    isLoading: false,
    pagination: {
      pageIndex: 0,
      pageSize: 10,
      onPaginationChange: () => {},
    },
  },
};

/**
 * Error state
 */
export const ErrorState: Story = {
  args: {
    data: [],
    isLoading: false,
    error: new Error('Failed to fetch probes data'),
    pagination: {
      pageIndex: 0,
      pageSize: 10,
      onPaginationChange: () => {},
    },
  },
};
