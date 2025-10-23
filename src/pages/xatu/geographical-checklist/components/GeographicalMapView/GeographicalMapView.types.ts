import type { ProcessedNode } from '../../hooks/useGeographicalData';

export interface GeographicalMapViewProps {
  nodes: ProcessedNode[];
  isLoading?: boolean;
}
