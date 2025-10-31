import { Link } from '@tanstack/react-router';
import clsx from 'clsx';

import { formatEpoch } from '@/utils';

import type { EpochProps } from './Epoch.types';

/**
 * Displays an epoch number with optional link to its detail page
 *
 * @example
 * // Linked epoch (default)
 * <Epoch epoch={12345} />
 *
 * @example
 * // Plain text epoch
 * <Epoch epoch={12345} noLink />
 *
 * @example
 * // With custom styling
 * <Epoch epoch={12345} className="font-bold text-primary" />
 */
export function Epoch({ epoch, noLink = false, className }: EpochProps): React.JSX.Element {
  const formattedEpoch = formatEpoch(epoch);

  if (noLink) {
    return <span className={className}>{formattedEpoch}</span>;
  }

  return (
    <Link
      to="/ethereum/epochs/$epoch"
      params={{ epoch: epoch.toString() }}
      className={clsx('hover:underline', className)}
    >
      {formattedEpoch}
    </Link>
  );
}
