import type { GeographicalStats } from '../../hooks/useGeographicalData';

export interface GeographicalStatsProps {
  stats: GeographicalStats;
  isLoading?: boolean;
}
