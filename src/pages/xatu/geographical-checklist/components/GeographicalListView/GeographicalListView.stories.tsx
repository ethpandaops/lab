import type { Meta, StoryObj } from '@storybook/react-vite';
import { CONTINENT_COLORS } from '@/theme/data-visualization-colors';
import { GeographicalListView } from './GeographicalListView';
import type { ContinentData, ContinentCode, ProcessedNode } from '../../hooks/useGeographicalData';

// Mock data
const mockNode: ProcessedNode = {
  username: 'user1',
  meta_client_name: 'pub-user1',
  meta_client_geo_city: 'London',
  meta_client_geo_country: 'United Kingdom',
  meta_client_geo_country_code: 'GB',
  meta_client_geo_continent_code: 'EU',
  meta_client_geo_longitude: -0.1276,
  meta_client_geo_latitude: 51.5074,
  meta_client_implementation: 'Lighthouse',
  meta_client_version: 'v4.0.0',
  last_seen_date_time: Date.now() / 1000,
  classification: 'individual',
  continentCode: 'EU',
  continentName: 'Europe',
  continentEmoji: '🇪🇺',
  countryFlag: '🇬🇧',
} as ProcessedNode;

const mockContinents = new Map<ContinentCode, ContinentData>([
  [
    'EU',
    {
      code: 'EU',
      name: 'Europe',
      emoji: '🇪🇺',
      color: CONTINENT_COLORS.EU,
      countries: new Map([
        [
          'GB',
          {
            name: 'United Kingdom',
            code: 'GB',
            emoji: '🇬🇧',
            cities: new Map([
              [
                'London',
                {
                  name: 'London',
                  countryName: 'United Kingdom',
                  countryCode: 'GB',
                  coords: [-0.1276, 51.5074],
                  nodes: [mockNode],
                },
              ],
            ]),
            totalNodes: 1,
          },
        ],
      ]),
      totalNodes: 1,
      totalCountries: 1,
      totalCities: 1,
    },
  ],
]);

const meta = {
  title: 'Pages/Xatu/Geographical Checklist/GeographicalListView',
  component: GeographicalListView,
  decorators: [
    Story => (
      <div className="min-w-[600px] rounded-sm bg-surface p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof GeographicalListView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    continents: mockContinents,
    isLoading: false,
  },
};

export const Loading: Story = {
  args: {
    continents: new Map(),
    isLoading: true,
  },
};

export const Empty: Story = {
  args: {
    continents: new Map(),
    isLoading: false,
  },
};
