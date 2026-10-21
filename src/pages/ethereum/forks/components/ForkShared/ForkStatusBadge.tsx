import { Badge } from '@/components/Elements/Badge';

interface ForkStatusBadgeProps {
  isActive: boolean;
  isCurrent: boolean;
}

/**
 * Current / Active / Upcoming pill for a fork or BPO.
 */
export function ForkStatusBadge({ isActive, isCurrent }: ForkStatusBadgeProps): React.JSX.Element {
  if (isCurrent) {
    return (
      <Badge color="green" variant="flat">
        Current
      </Badge>
    );
  }

  if (isActive) {
    return (
      <Badge color="blue" variant="flat">
        Active
      </Badge>
    );
  }

  return (
    <Badge color="gray" variant="flat">
      Upcoming
    </Badge>
  );
}
