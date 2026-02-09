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

export type StatusCategory = 'active' | 'pending' | 'exited' | 'withdrawal' | 'unknown';

export interface StatusSummary {
  total: number;
  active: number;
  pending: number;
  exited: number;
  withdrawal: number;
  slashed: number;
  unknown: number;
}

interface UseValidatorStatusReturn {
  /** Look up the validator's status at a given point in time */
  getStatusAtTimestamp: (validatorIndex: number, timestamp: number) => string | null;
  /** Aggregate summary of latest validator statuses */
  statusSummary: StatusSummary | null;
  /** Validator indices with zero status transitions (nonexistent) */
  unknownValidators: number[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * Categorize a status string (e.g. "active_ongoing") into a broad category
 */
function categorizeStatus(status: string): StatusCategory {
  if (status.startsWith('active')) return 'active';
  if (status.startsWith('pending')) return 'pending';
  if (status.startsWith('exited')) return 'exited';
  if (status.startsWith('withdrawal')) return 'withdrawal';
  return 'unknown';
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
      return { icon: CheckCircleIcon, colorClass: 'text-success', label: 'Active Ongoing' };
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
 * provides helpers to look up a validator's status at any point in time,
 * plus an aggregate summary of current statuses.
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

  // Build summary from latest status per validator
  const { statusSummary, unknownValidators } = useMemo(() => {
    if (!enabled || isLoading) {
      return { statusSummary: null, unknownValidators: [] };
    }

    const summary: StatusSummary = {
      total: resolvedIndices.length,
      active: 0,
      pending: 0,
      exited: 0,
      withdrawal: 0,
      slashed: 0,
      unknown: 0,
    };

    const unknown: number[] = [];

    for (const idx of resolvedIndices) {
      const arr = transitionsByValidator.get(idx);
      if (!arr || arr.length === 0) {
        summary.unknown += 1;
        unknown.push(idx);
        continue;
      }

      const latest = arr[arr.length - 1];
      const category = categorizeStatus(latest.status ?? '');
      summary[category] += 1;

      if (latest.slashed) {
        summary.slashed += 1;
      }
    }

    return { statusSummary: summary, unknownValidators: unknown };
  }, [resolvedIndices, transitionsByValidator, enabled, isLoading]);

  if (!enabled) {
    return {
      getStatusAtTimestamp: () => null,
      statusSummary: null,
      unknownValidators: [],
      isLoading: false,
      error: null,
    };
  }

  return {
    getStatusAtTimestamp,
    statusSummary,
    unknownValidators,
    isLoading,
    error: (error as Error) ?? null,
  };
}
