import type { ContinentData, ContinentCode } from '../../hooks/useGeographicalData';

export interface GeographicalListViewProps {
  continents: Map<ContinentCode, ContinentData>;
  isLoading?: boolean;
  /** Label of the node counts, "Node IDs" over ranges where hashed IDs rotate */
  nodeLabel: string;
}
