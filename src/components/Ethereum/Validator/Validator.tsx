import { Link } from '@tanstack/react-router';
import clsx from 'clsx';

import type { ValidatorProps } from './Validator.types';

/**
 * Displays a validator index, linked to the validator inspect page
 *
 * @example
 * // Linked validator (default)
 * <Validator index={1234567} />
 *
 * @example
 * // Plain text
 * <Validator index={1234567} noLink />
 */
export function Validator({ index, noLink = false, className }: ValidatorProps): React.JSX.Element {
  if (noLink) {
    return <span className={className}>{index}</span>;
  }

  return (
    <Link
      to="/ethereum/validators/inspect"
      search={{ indices: index }}
      className={clsx('hover:underline', className)}
      onClick={event => event.stopPropagation()}
    >
      {index}
    </Link>
  );
}
