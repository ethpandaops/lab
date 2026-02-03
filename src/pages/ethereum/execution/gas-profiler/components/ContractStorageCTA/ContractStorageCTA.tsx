import { type JSX } from 'react';
import { Link } from '@tanstack/react-router';
import { CircleStackIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

interface ContractStorageCTAProps {
  /** Contract address to link to */
  address: string;
  /** Contract name (optional, for display) */
  contractName?: string | null;
}

/**
 * ContractStorageCTA - A prominent call-to-action card linking to contract storage analysis
 *
 * Used on CallPage to encourage exploration of the contract's storage.
 */
export function ContractStorageCTA({ address, contractName }: ContractStorageCTAProps): JSX.Element {
  const displayName = contractName || `${address.slice(0, 10)}...${address.slice(-8)}`;

  return (
    <Link
      to="/ethereum/contracts/$address"
      params={{ address }}
      className="group block rounded-sm border border-primary/20 bg-primary/5 p-4 transition-colors hover:border-primary/40 hover:bg-primary/10"
    >
      <div className="flex items-start gap-4">
        <div className="rounded-sm bg-primary/20 p-2.5">
          <CircleStackIcon className="size-6 text-primary" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-foreground">{displayName}</h4>
            <ArrowRightIcon className="size-4 text-primary opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
          <p className="mt-1 text-xs text-muted">
            Explore this contract&apos;s storage slots, access patterns, and state expiry projections.
          </p>
        </div>
        <span className="rounded-sm border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors group-hover:border-primary/50 group-hover:bg-primary/20">
          View Storage Analysis
        </span>
      </div>
    </Link>
  );
}
