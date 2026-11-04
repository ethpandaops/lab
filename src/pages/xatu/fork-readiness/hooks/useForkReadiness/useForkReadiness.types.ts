import type { ForkReadinessStats } from '../../utils/fork-data-processor.types';

export interface UseForkReadinessReturn {
  upcomingForks: ForkReadinessStats[];
  isLoading: boolean;
  error: Error | null;
}
