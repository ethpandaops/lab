import type {
  ClientImplementationStats,
  LocationStats,
} from '../../hooks/useGeographicalData/useGeographicalData.types';

export interface FiltersDialogProps {
  open: boolean;
  onClose: () => void;
  availableClients: ClientImplementationStats[];
  availableCountries: LocationStats[];
}
