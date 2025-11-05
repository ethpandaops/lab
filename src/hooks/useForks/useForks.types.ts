import type { ForkInfo } from '@/utils/forks';

export interface UseForksResult {
  /**
   * All configured forks for the current network, sorted by activation epoch
   */
  allForks: ForkInfo[];

  /**
   * Currently active fork based on the current epoch
   */
  activeFork: ForkInfo | null;

  /**
   * Next upcoming fork (not yet active)
   */
  nextFork: ForkInfo | null;

  /**
   * Whether fork data is loading
   */
  isLoading: boolean;
}
