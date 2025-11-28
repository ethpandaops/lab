import type { ContinentCode, ClientImplementationStats, LocationStats } from '../../hooks/useGeographicalData';

export interface GeographicalFiltersFormData {
  search: string;
  continent: ContinentCode | 'all';
  country: string;
  clientImplementation: string;
}

export interface GeographicalFiltersProps {
  availableClients: ClientImplementationStats[];
  availableCountries: LocationStats[];
  viewMode: 'map' | 'list';
  onViewModeChange: (mode: 'map' | 'list') => void;
  onInsightsClick: () => void;
}
