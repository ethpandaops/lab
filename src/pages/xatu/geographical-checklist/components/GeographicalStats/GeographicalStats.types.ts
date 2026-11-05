import type { GeographicalStats } from '../../hooks/useGeographicalData';

export interface GeographicalStatsProps {
  stats: GeographicalStats;
  isLoading?: boolean;
  /** Label of the node count, "Node IDs" over ranges where hashed IDs rotate */
  nodeLabel: string;
}
