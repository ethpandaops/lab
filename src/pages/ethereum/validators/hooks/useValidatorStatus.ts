import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircleIcon,
  ClockIcon,
  ArrowRightStartOnRectangleIcon,
  ShieldExclamationIcon,
  BanknotesIcon,
  MinusCircleIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';
import { dimValidatorStatusServiceListOptions } from '@/api/@tanstack/react-query.gen';
import type { DimValidatorStatus } from '@/api/types.gen';

interface UseValidatorStatusReturn {
  /** Look up the validator's status at a given point in time */
  getStatusAtTimestamp: (validatorIndex: number, timestamp: number) => string | null;
  /** Validator indices with zero status transitions (nonexistent) */
  unknownValidators: number[];
  /** Each validator's latest status transition */
  latestStatus: Map<number, DimValidatorStatus>;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Format a raw status string into a human-readable label.
 * e.g. "pending_queued" → "Pending Queued"
 */
export function formatStatusLabel(status: string | null): string {
  if (!status) return 'Unknown';
  if (status === 'not_yet_deposited') return 'Not Yet Deposited';
  return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export interface StatusIconConfig {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  colorClass: string;
  label: string;
}

/**
 * Map a validator status string to a Heroicon, color class, and label
 */
export function getStatusIconConfig(status: string | null): StatusIconConfig {
  switch (status) {
    case 'active_ongoing':
      return { icon: CheckCircleIcon, colorClass: 'text-muted', label: 'Active Ongoing' };
    case 'active_exiting':
      return {
        icon: ArrowRightStartOnRectangleIcon,
        colorClass: 'text-warning',
        label: 'Active Exiting',
      };
    case 'active_slashed':
      return { icon: ShieldExclamationIcon, colorClass: 'text-danger', label: 'Active Slashed' };
    case 'pending_initialized':
      return { icon: ClockIcon, colorClass: 'text-accent', label: 'Pending Initialized' };
    case 'pending_queued':
      return { icon: ClockIcon, colorClass: 'text-accent', label: 'Pending Queued' };
    case 'exited_unslashed':
      return {
        icon: ArrowRightStartOnRectangleIcon,
        colorClass: 'text-muted',
        label: 'Exited Unslashed',
      };
    case 'exited_slashed':
      return { icon: ShieldExclamationIcon, colorClass: 'text-danger', label: 'Exited Slashed' };
    case 'withdrawal_possible':
      return { icon: BanknotesIcon, colorClass: 'text-muted', label: 'Withdrawal Possible' };
    case 'withdrawal_done':
      return { icon: BanknotesIcon, colorClass: 'text-muted', label: 'Withdrawal Done' };
    case 'not_yet_deposited':
      return { icon: MinusCircleIcon, colorClass: 'text-muted/40', label: 'Not Yet Deposited' };
    default:
      return { icon: QuestionMarkCircleIcon, colorClass: 'text-warning', label: 'Unknown' };
  }
}

/**
 * Fetches validator status transitions from `dim_validator_status` and
 * provides helpers to look up a validator's status at any point in time
 * and to find validators with no status transitions.
 */
export function useValidatorStatus(resolvedIndices: number[]): UseValidatorStatusReturn {
  const enabled = resolvedIndices.length > 0;

  const { data, isLoading, error } = useQuery({
    ...dimValidatorStatusServiceListOptions({
      query: {
        validator_index_in_values: resolvedIndices.join(','),
        order_by: 'epoch',
        page_size: 10000,
      },
      // Unset epochs are 2^64 - 1, which JSON parsing rounds up past the generated schema's uint64 maximum.
      // Validating would fail every validator that has one; this hook reads only status and time.
      responseValidator: undefined,
    }),
    enabled,
  });

  // Group transitions by validator, sorted by epoch ascending
  const transitionsByValidator = useMemo(() => {
    const transitions = data?.dim_validator_status ?? [];
    const map = new Map<number, DimValidatorStatus[]>();
    for (const t of transitions) {
      if (t.validator_index == null) continue;
      const existing = map.get(t.validator_index);
      if (existing) {
        existing.push(t);
      } else {
        map.set(t.validator_index, [t]);
      }
    }
    // Sort each validator's transitions by epoch ascending
    for (const arr of map.values()) {
      arr.sort((a, b) => (a.epoch ?? 0) - (b.epoch ?? 0));
    }
    return map;
  }, [data]);

  // getStatusAtTimestamp: find the most recent transition with epoch_start_date_time <= timestamp
  const getStatusAtTimestamp = useMemo(() => {
    return (validatorIndex: number, timestamp: number): string | null => {
      const arr = transitionsByValidator.get(validatorIndex);
      if (!arr || arr.length === 0) return null;

      let result: string | null = null;
      for (const t of arr) {
        if (t.epoch_start_date_time != null && t.epoch_start_date_time <= timestamp) {
          result = t.status ?? null;
        } else {
          break;
        }
      }

      // Before first event: infer "not yet deposited" if earliest status is pending
      if (result === null) {
        const firstStatus = arr[0].status ?? '';
        if (firstStatus.startsWith('pending')) {
          return 'not_yet_deposited';
        }
      }

      return result;
    };
  }, [transitionsByValidator]);

  const latestStatus = useMemo(
    () => new Map([...transitionsByValidator].map(([index, arr]) => [index, arr[arr.length - 1]])),
    [transitionsByValidator]
  );

  // Validators with no status transitions at all
  const unknownValidators = useMemo(() => {
    if (!enabled || isLoading) return [];
    return resolvedIndices.filter(idx => !transitionsByValidator.get(idx)?.length);
  }, [resolvedIndices, transitionsByValidator, enabled, isLoading]);

  if (!enabled) {
    return {
      getStatusAtTimestamp: () => null,
      unknownValidators: [],
      latestStatus,
      isLoading: false,
      error: null,
    };
  }

  return {
    getStatusAtTimestamp,
    unknownValidators,
    latestStatus,
    isLoading,
    error: (error as Error) ?? null,
  };
}
