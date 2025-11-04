import { Link } from '@tanstack/react-router';
import clsx from 'clsx';

import type { EntityProps } from './Entity.types';

/**
 * Displays an entity name with optional link to its detail page
 *
 * @example
 * // Linked entity (default)
 * <Entity entity="Lido" />
 *
 * @example
 * // Plain text entity
 * <Entity entity="Lido" noLink />
 *
 * @example
 * // With custom styling
 * <Entity entity="Lido" className="font-bold text-primary" />
 */
export function Entity({ entity, noLink = false, className }: EntityProps): React.JSX.Element {
  if (!entity) {
    return <span className={clsx('text-muted', className)}>Unknown</span>;
  }

  if (noLink) {
    return <span className={className}>{entity}</span>;
  }

  return (
    <Link to="/ethereum/entities/$entity" params={{ entity }} className={clsx('hover:underline', className)}>
      {entity}
    </Link>
  );
}
