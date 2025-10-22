import type { Meta, StoryObj } from '@storybook/react-vite';
import { useForm, FormProvider } from 'react-hook-form';
import { useState } from 'react';
import { GeographicalFilters } from './GeographicalFilters';
import type { GeographicalFiltersFormData } from './GeographicalFilters.types';

const mockClients = [
  { name: 'Lighthouse', count: 125, percentage: 45.5 },
  { name: 'Prysm', count: 85, percentage: 30.9 },
  { name: 'Nimbus', count: 35, percentage: 12.7 },
  { name: 'Teku', count: 20, percentage: 7.3 },
  { name: 'Lodestar', count: 10, percentage: 3.6 },
];

const mockCountries = [
  { name: 'United States', code: 'US', count: 120, emoji: '🇺🇸' },
  { name: 'Germany', code: 'DE', count: 85, emoji: '🇩🇪' },
  { name: 'United Kingdom', code: 'GB', count: 65, emoji: '🇬🇧' },
  { name: 'France', code: 'FR', count: 45, emoji: '🇫🇷' },
  { name: 'Canada', code: 'CA', count: 35, emoji: '🇨🇦' },
];

const meta = {
  title: 'Pages/Experiments/Geographical Checklist/GeographicalFilters',
  component: GeographicalFilters,
  decorators: [
    Story => {
      const methods = useForm<GeographicalFiltersFormData>({
        defaultValues: {
          search: '',
          continent: 'all',
          country: 'all',
          clientImplementation: 'all',
        },
      });
      const [viewMode, setViewMode] = useState<'map' | 'list'>('list');
      return (
        <FormProvider {...methods}>
          <div className="min-w-[600px] rounded-sm bg-surface p-6">
            <Story viewMode={viewMode} onViewModeChange={setViewMode} />
          </div>
        </FormProvider>
      );
    },
  ],
} satisfies Meta<typeof GeographicalFilters>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    availableClients: mockClients,
    availableCountries: mockCountries,
    viewMode: 'list',
    onViewModeChange: () => {},
    onInsightsClick: () => {},
  },
};
