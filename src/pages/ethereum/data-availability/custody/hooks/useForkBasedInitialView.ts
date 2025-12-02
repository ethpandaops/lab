import { useMemo } from 'react';
import { useForks } from '@/hooks/useForks';
import { useNetwork } from '@/hooks/useNetwork';
import { epochToTimestamp } from '@/utils/beacon';

/**
 * Testing override: Set to a number (seconds since fork) to simulate
 * different time deltas for testing smart initial view logic.
 * Set to null for production behavior.
 *
 * Examples:
 * - null: Use real time (production)
 * - 1800: Simulate 30 minutes after fork (shows epoch view)
 * - 43200: Simulate 12 hours after fork (shows hour view)
 * - 172800: Simulate 2 days after fork (shows hour view)
 * - 432000: Simulate 5 days after fork (shows window view)
 */
export const FORK_TIME_OVERRIDE_SECONDS: number | null = null;

/**
 * Time thresholds for view selection (in seconds)
 */
const THRESHOLDS = {
  /** Less than 1 hour since fork: show epoch view */
  EPOCH_VIEW: 3600,
  /** Less than 24 hours since fork: show hour view */
  HOUR_VIEW: 86400,
  /** Less than 5 days since fork: show day view */
  DAY_VIEW: 432000,
  // >= 5 days: window view (default)
};

/**
 * Possible initial view recommendations
 */
type InitialViewType = 'window' | 'day' | 'hour' | 'epoch';

/**
 * Return type for the useForkBasedInitialView hook
 */
export interface ForkBasedInitialView {
  /** The recommended initial view type */
  recommendedView: InitialViewType;
  /** Whether the hook is still loading fork data */
  isLoading: boolean;
  /** Whether Fulu fork is active on this network */
  isFuluActive: boolean;
  /** Seconds since Fulu activation (null if not active) */
  secondsSinceFork: number | null;
  /** URL search params to navigate to for the recommended view */
  searchParams: Record<string, string | number> | null;
}

/**
 * Hook to determine the recommended initial view for the custody page
 * based on time elapsed since Fulu fork activation.
 *
 * This provides "smart" initial view selection:
 * - < 1 hour since fork: Show epoch view (slots within epoch)
 * - < 24 hours since fork: Show hour view (epochs within hour)
 * - < 5 days since fork: Show day view (hours within day)
 * - >= 5 days since fork: Show window view (default 19-day view)
 *
 * @example
 * ```tsx
 * function CustodyPage() {
 *   const { searchParams, isLoading } = useForkBasedInitialView();
 *
 *   useEffect(() => {
 *     if (!isLoading && searchParams) {
 *       navigate({ search: searchParams, replace: true });
 *     }
 *   }, [isLoading, searchParams]);
 * }
 * ```
 */
export function useForkBasedInitialView(): ForkBasedInitialView {
  const { allForks, isLoading: forksLoading } = useForks();
  const { currentNetwork } = useNetwork();

  return useMemo(() => {
    // Still loading
    if (forksLoading || !currentNetwork) {
      return {
        recommendedView: 'window',
        isLoading: true,
        isFuluActive: false,
        secondsSinceFork: null,
        searchParams: null,
      };
    }

    // Find Fulu fork
    const fuluFork = allForks.find(f => f.name === 'fulu');

    // Fulu not configured or not active
    if (!fuluFork || !fuluFork.isActive) {
      return {
        recommendedView: 'window',
        isLoading: false,
        isFuluActive: false,
        secondsSinceFork: null,
        searchParams: null,
      };
    }

    // Calculate time since Fulu activation
    const fuluTimestamp = epochToTimestamp(fuluFork.epoch, currentNetwork.genesis_time);
    const nowSeconds = Math.floor(Date.now() / 1000);

    // Use override if set, otherwise use real time delta
    const secondsSinceFork = FORK_TIME_OVERRIDE_SECONDS ?? nowSeconds - fuluTimestamp;

    // Determine recommended view based on thresholds
    let recommendedView: InitialViewType;
    let searchParams: Record<string, string | number> | null = null;

    // Calculate UTC date and hour start timestamp
    // The custody page expects dates in YYYY-MM-DD format (UTC) and hour as Unix timestamp
    const nowMs = Date.now();
    const nowUtc = new Date(nowMs);
    const utcDate = nowUtc.toISOString().split('T')[0]; // YYYY-MM-DD in UTC

    // Calculate the start of the current UTC hour as a Unix timestamp
    // Create a new Date with the same UTC date/hour but minutes/seconds/ms set to 0
    const utcHourStart = Date.UTC(
      nowUtc.getUTCFullYear(),
      nowUtc.getUTCMonth(),
      nowUtc.getUTCDate(),
      nowUtc.getUTCHours(),
      0,
      0,
      0
    );
    const hourStartTimestamp = Math.floor(utcHourStart / 1000);

    if (secondsSinceFork < THRESHOLDS.EPOCH_VIEW) {
      // < 1 hour: Show epoch view of the latest epoch
      recommendedView = 'epoch';
      const latestEpoch = Math.floor((nowSeconds - currentNetwork.genesis_time) / (32 * 12));
      searchParams = { date: utcDate, hour: hourStartTimestamp, epoch: latestEpoch };
    } else if (secondsSinceFork < THRESHOLDS.HOUR_VIEW) {
      // < 24 hours: Show hour view of the latest hour
      recommendedView = 'hour';
      searchParams = { date: utcDate, hour: hourStartTimestamp };
    } else if (secondsSinceFork < THRESHOLDS.DAY_VIEW) {
      // < 5 days: Show day view of the latest day
      recommendedView = 'day';
      searchParams = { date: utcDate };
    } else {
      // >= 5 days: Show default window view
      recommendedView = 'window';
      searchParams = null;
    }

    return {
      recommendedView,
      isLoading: false,
      isFuluActive: true,
      secondsSinceFork,
      searchParams,
    };
  }, [allForks, forksLoading, currentNetwork]);
}
