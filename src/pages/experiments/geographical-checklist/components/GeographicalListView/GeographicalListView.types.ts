import type { ContinentData, ContinentCode } from '../../hooks/useGeographicalData';

export interface GeographicalListViewProps {
  continents: Map<ContinentCode, ContinentData>;
  isLoading?: boolean;
}
