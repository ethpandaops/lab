import { type JSX } from 'react';
import { Link } from '@tanstack/react-router';
import { CircleStackIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface ContractStorageButtonProps {
  /** Contract address to link to */
  address: string;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Optional className override */
  className?: string;
  /** Whether to show as icon-only or with label */
  variant?: 'icon' | 'button';
  /** Optional onClick handler (for stopping propagation, etc.) */
  onClick?: (e: React.MouseEvent) => void;
}

/**
 * ContractStorageButton - A reusable button/icon that links to the contract storage page
 *
 * Used in:
 * - CallPage: As a prominent CTA
 * - ContractCallTree: As an icon in each row
 * - ContractInteractionsTable: As an icon in each row
 * - CallTraceView: As an icon in each row
 */
export function ContractStorageButton({
  address,
  size = 'sm',
  className,
  variant = 'icon',
  onClick,
}: ContractStorageButtonProps): JSX.Element {
  const handleClick = (e: React.MouseEvent): void => {
    e.stopPropagation();
    onClick?.(e);
  };

  if (variant === 'button') {
    return (
      <Link
        to="/ethereum/contracts/$address"
        params={{ address }}
        onClick={handleClick}
        className={clsx(
          'inline-flex items-center gap-2 rounded-sm border border-primary/30 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:border-primary/50 hover:bg-primary/20',
          className
        )}
      >
        <CircleStackIcon className="size-4" />
        View Storage
      </Link>
    );
  }

  return (
    <Link
      to="/ethereum/contracts/$address"
      params={{ address }}
      onClick={handleClick}
      className={clsx(
        'group/storage relative flex shrink-0 items-center justify-center rounded-sm border border-border bg-surface/50 text-muted transition-colors hover:border-primary/30 hover:bg-surface hover:text-primary',
        size === 'sm' ? 'size-6' : 'size-7',
        className
      )}
      title="View contract storage"
    >
      <CircleStackIcon className={size === 'sm' ? 'size-3.5' : 'size-4'} />
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 hidden -translate-x-1/2 rounded-sm border border-border bg-background px-2 py-1 text-xs whitespace-nowrap text-muted shadow-lg group-hover/storage:block">
        View contract storage
      </span>
    </Link>
  );
}
