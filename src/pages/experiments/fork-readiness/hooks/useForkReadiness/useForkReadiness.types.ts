import type { ForkReadinessStats } from '../../utils/fork-data-processor.types';

export interface UseForkReadinessReturn {
  upcomingForks: ForkReadinessStats[];
  pastForks: ForkReadinessStats[];
  isLoading: boolean;
  error: Error | null;
}
