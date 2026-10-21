import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { buttonClassName } from '@/components/Elements/Button';

interface ForkQuickLinksProps {
  epoch: number;
  /** Extra links rendered after the epoch and slot links; style them with `buttonClassName({ variant: 'secondary', size: 'xs' })` */
  children?: ReactNode;
}

/**
 * Row of links to the activation epoch and its first slot, plus any extra links.
 */
export function ForkQuickLinks({ epoch, children }: ForkQuickLinksProps): React.JSX.Element {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <Link
        to="/ethereum/epochs/$epoch"
        params={{ epoch: epoch.toString() }}
        className={buttonClassName({ variant: 'secondary', size: 'xs' })}
      >
        Epoch {epoch}
      </Link>
      <Link
        to="/ethereum/slots/$slot"
        params={{ slot: (epoch * 32).toString() }}
        className={buttonClassName({ variant: 'secondary', size: 'xs' })}
      >
        Slot {epoch * 32}
      </Link>
      {children}
    </div>
  );
}
