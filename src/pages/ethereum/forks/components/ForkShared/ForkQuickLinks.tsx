import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';

/** Matches `Button variant="secondary" size="xs"`, which can't render as a router link. */
export const FORK_LINK_BUTTON_CLASS =
  'inline-flex items-center rounded-sm bg-surface px-2 py-1 text-xs font-semibold text-foreground transition-colors inset-ring inset-ring-border hover:bg-background';

interface ForkQuickLinksProps {
  epoch: number;
  /** Extra links rendered after the epoch and slot links; style them with `FORK_LINK_BUTTON_CLASS` */
  children?: ReactNode;
}

/**
 * Row of links to the activation epoch and its first slot, plus any extra links.
 */
export function ForkQuickLinks({ epoch, children }: ForkQuickLinksProps): React.JSX.Element {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <Link to="/ethereum/epochs/$epoch" params={{ epoch: epoch.toString() }} className={FORK_LINK_BUTTON_CLASS}>
        Epoch {epoch}
      </Link>
      <Link to="/ethereum/slots/$slot" params={{ slot: (epoch * 32).toString() }} className={FORK_LINK_BUTTON_CLASS}>
        Slot {epoch * 32}
      </Link>
      {children}
    </div>
  );
}
