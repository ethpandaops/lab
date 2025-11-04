import clsx from 'clsx';

import { FORK_METADATA } from '@/utils/beacon';

import type { ForkLabelProps } from './ForkLabel.types';

/**
 * Displays a beacon chain fork label with emoji icon and name
 *
 * @example
 * // Default size with icon
 * <ForkLabel fork="deneb" />
 *
 * @example
 * // Small size without icon
 * <ForkLabel fork="altair" size="sm" showIcon={false} />
 *
 * @example
 * // Large size with custom styling
 * <ForkLabel fork="bellatrix" size="lg" className="shadow-lg" />
 */
export function ForkLabel({ fork, className, size = 'md', showIcon = true }: ForkLabelProps): React.JSX.Element {
  const metadata = FORK_METADATA[fork];

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-3 py-1 text-sm gap-1.5',
    lg: 'px-4 py-1.5 text-base gap-2',
  };

  const iconSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-md font-semibold tracking-wide uppercase',
        metadata.color,
        sizeClasses[size],
        className
      )}
      title={metadata.description}
    >
      {showIcon && <span className={iconSizeClasses[size]}>{metadata.emoji}</span>}
      <span>{metadata.name}</span>
    </span>
  );
}
