import clsx from 'clsx';

interface ForkStatusBadgeProps {
  isActive: boolean;
  isCurrent: boolean;
  /** Override the label (e.g. "Active" for a blob schedule entry that is current) */
  label?: string;
}

/**
 * Current / Active / Upcoming pill for a fork or BPO.
 * Current and active share one neutral-strong treatment; upcoming is muted.
 */
export function ForkStatusBadge({ isActive, isCurrent, label }: ForkStatusBadgeProps): React.JSX.Element {
  const isLive = isCurrent || isActive;
  const text = label ?? (isCurrent ? 'Current' : isActive ? 'Active' : 'Upcoming');

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-xs px-2 py-1 text-xs font-medium',
        isLive ? 'bg-foreground/10 text-foreground' : 'bg-muted/10 text-muted'
      )}
    >
      {text}
    </span>
  );
}
