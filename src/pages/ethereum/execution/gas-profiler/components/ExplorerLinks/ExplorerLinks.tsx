import { type JSX } from 'react';
import { EtherscanIcon } from '@/components/Ethereum/EtherscanIcon';
import { PhalconIcon } from '@/components/Ethereum/PhalconIcon';
import { TenderlyIcon } from '@/components/Ethereum/TenderlyIcon';

export interface ExplorerLink {
  /** Destination URL */
  href: string;
  /** Tooltip text, e.g. "View on Etherscan" */
  title: string;
}

export interface ExplorerLinksProps {
  /** Etherscan link (omitted when there is nothing to link to) */
  etherscan?: ExplorerLink;
  /** Tenderly link (mainnet only) */
  tenderly?: ExplorerLink;
  /** Phalcon link (mainnet only) */
  phalcon?: ExplorerLink;
}

const LINK_CLASS = 'rounded-sm bg-surface p-1.5 text-muted transition-colors hover:text-foreground';

/**
 * Icon links to external block explorers (Etherscan, Tenderly, Phalcon).
 */
export function ExplorerLinks({ etherscan, tenderly, phalcon }: ExplorerLinksProps): JSX.Element {
  return (
    <div className="flex items-center gap-2">
      {etherscan && (
        <a
          href={etherscan.href}
          target="_blank"
          rel="noopener noreferrer"
          className={LINK_CLASS}
          title={etherscan.title}
        >
          <EtherscanIcon className="size-4" />
        </a>
      )}
      {tenderly && (
        <a href={tenderly.href} target="_blank" rel="noopener noreferrer" className={LINK_CLASS} title={tenderly.title}>
          <TenderlyIcon className="size-4" />
        </a>
      )}
      {phalcon && (
        <a href={phalcon.href} target="_blank" rel="noopener noreferrer" className={LINK_CLASS} title={phalcon.title}>
          <PhalconIcon className="size-4" />
        </a>
      )}
    </div>
  );
}
