import type {
  ClientImplementationStats,
  LocationStats,
} from '../../hooks/useGeographicalData/useGeographicalData.types';

export interface InsightsDialogProps {
  open: boolean;
  onClose: () => void;
  clientData: ClientImplementationStats[];
  topCountries: LocationStats[];
  topCities: LocationStats[];
  isLoading: boolean;
}
