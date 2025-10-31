import { Link } from '@tanstack/react-router';
import clsx from 'clsx';

import { formatSlot } from '@/utils';

import type { SlotProps } from './Slot.types';

/**
 * Displays a slot number with optional link to its detail page
 *
 * @example
 * // Linked slot (default)
 * <Slot slot={1234567} />
 *
 * @example
 * // Plain text slot
 * <Slot slot={1234567} noLink />
 *
 * @example
 * // With custom styling
 * <Slot slot={1234567} className="font-bold text-primary" />
 */
export function Slot({ slot, noLink = false, className }: SlotProps) {
  const formattedSlot = formatSlot(slot);

  if (noLink) {
    return <span className={className}>{formattedSlot}</span>;
  }

  return (
    <Link to="/ethereum/slots/$slot" params={{ slot: slot.toString() }} className={clsx('hover:underline', className)}>
      {formattedSlot}
    </Link>
  );
}
