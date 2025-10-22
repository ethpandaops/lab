import type { Meta, StoryObj } from '@storybook/react-vite';
import { GeographicalMapView } from './GeographicalMapView';
import type { ProcessedNode } from '../../hooks/useGeographicalData/useGeographicalData.types';

// Mock data - Expanded global coverage
const mockNodes: ProcessedNode[] = [
  {
    username: 'user1',
    meta_client_name: 'pub-user1',
    meta_client_geo_city: 'London',
    meta_client_geo_country: 'United Kingdom',
    meta_client_geo_country_code: 'GB',
    meta_client_geo_continent_code: 'EU',
    meta_client_geo_longitude: -0.1276,
    meta_client_geo_latitude: 51.5074,
    last_seen_date_time: Date.now() / 1000,
    classification: 'individual',
    continentCode: 'EU',
    continentName: 'Europe',
    continentEmoji: '🇪🇺',
    countryFlag: '🇬🇧',
  },
  {
    username: 'user2',
    meta_client_name: 'pub-user2',
    meta_client_geo_city: 'London',
    meta_client_geo_country: 'United Kingdom',
    meta_client_geo_country_code: 'GB',
    meta_client_geo_continent_code: 'EU',
    meta_client_geo_longitude: -0.1276,
    meta_client_geo_latitude: 51.5074,
    last_seen_date_time: Date.now() / 1000,
    classification: 'individual',
    continentCode: 'EU',
    continentName: 'Europe',
    continentEmoji: '🇪🇺',
    countryFlag: '🇬🇧',
  },
  {
    username: 'corp-nyc',
    meta_client_name: 'corp-company',
    meta_client_geo_city: 'New York',
    meta_client_geo_country: 'United States',
    meta_client_geo_country_code: 'US',
    meta_client_geo_continent_code: 'NA',
    meta_client_geo_longitude: -74.006,
    meta_client_geo_latitude: 40.7128,
    last_seen_date_time: Date.now() / 1000,
    classification: 'corporate',
    continentCode: 'NA',
    continentName: 'North America',
    continentEmoji: '🌎',
    countryFlag: '🇺🇸',
  },
  {
    username: 'user3',
    meta_client_name: 'pub-user3',
    meta_client_geo_city: 'Tokyo',
    meta_client_geo_country: 'Japan',
    meta_client_geo_country_code: 'JP',
    meta_client_geo_continent_code: 'AS',
    meta_client_geo_longitude: 139.6917,
    meta_client_geo_latitude: 35.6895,
    last_seen_date_time: Date.now() / 1000,
    classification: 'individual',
    continentCode: 'AS',
    continentName: 'Asia',
    continentEmoji: '🌏',
    countryFlag: '🇯🇵',
  },
  {
    username: 'user4',
    meta_client_name: 'pub-user4',
    meta_client_geo_city: 'Singapore',
    meta_client_geo_country: 'Singapore',
    meta_client_geo_country_code: 'SG',
    meta_client_geo_continent_code: 'AS',
    meta_client_geo_longitude: 103.8198,
    meta_client_geo_latitude: 1.3521,
    last_seen_date_time: Date.now() / 1000,
    classification: 'individual',
    continentCode: 'AS',
    continentName: 'Asia',
    continentEmoji: '🌏',
    countryFlag: '🇸🇬',
  },
  {
    username: 'user5',
    meta_client_name: 'ethpandaops-sf',
    meta_client_geo_city: 'San Francisco',
    meta_client_geo_country: 'United States',
    meta_client_geo_country_code: 'US',
    meta_client_geo_continent_code: 'NA',
    meta_client_geo_longitude: -122.4194,
    meta_client_geo_latitude: 37.7749,
    last_seen_date_time: Date.now() / 1000,
    classification: 'internal',
    continentCode: 'NA',
    continentName: 'North America',
    continentEmoji: '🌎',
    countryFlag: '🇺🇸',
  },
  {
    username: 'user6',
    meta_client_name: 'pub-user6',
    meta_client_geo_city: 'Sydney',
    meta_client_geo_country: 'Australia',
    meta_client_geo_country_code: 'AU',
    meta_client_geo_continent_code: 'OC',
    meta_client_geo_longitude: 151.2093,
    meta_client_geo_latitude: -33.8688,
    last_seen_date_time: Date.now() / 1000,
    classification: 'individual',
    continentCode: 'OC',
    continentName: 'Oceania',
    continentEmoji: '🏝️',
    countryFlag: '🇦🇺',
  },
] as ProcessedNode[];

const meta = {
  title: 'Pages/Experiments/GeographicalChecklist/GeographicalMapView',
  component: GeographicalMapView,
  decorators: [
    Story => (
      <div className="min-w-[600px] rounded-sm bg-surface p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof GeographicalMapView>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default: Shows global distribution of contributor nodes with visible cyan markers
 */
export const Default: Story = {
  args: {
    nodes: mockNodes,
    isLoading: false,
  },
};

/**
 * Loading State: Displays while fetching geographical data
 */
export const Loading: Story = {
  args: {
    nodes: [],
    isLoading: true,
  },
};

/**
 * Empty State: No nodes match the current filters
 */
export const Empty: Story = {
  args: {
    nodes: [],
    isLoading: false,
  },
};
