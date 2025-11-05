import { EtherscanIcon } from '@/components/Ethereum/EtherscanIcon';
import { useNetwork } from '@/hooks/useNetwork';
import clsx from 'clsx';

export interface EtherscanLinkProps {
  blockNumber?: number;
  className?: string;
}

/**
 * EtherscanLink component displays a clickable icon link to Etherscan
 */
export function EtherscanLink({ blockNumber, className }: EtherscanLinkProps): React.JSX.Element | null {
  const { currentNetwork } = useNetwork();

  if (!currentNetwork) return null;

  const getEtherscanUrl = (): string | null => {
    // Map network names to Etherscan subdomains
    const networkMap: Record<string, string> = {
      mainnet: 'etherscan.io',
      sepolia: 'sepolia.etherscan.io',
      holesky: 'holesky.etherscan.io',
      gnosis: 'gnosisscan.io',
    };

    const domain = networkMap[currentNetwork.name] || 'etherscan.io';

    // Etherscan uses execution block numbers
    // If we have a blockNumber, use it; otherwise we can't construct a valid URL
    if (blockNumber !== undefined) {
      return `https://${domain}/block/${blockNumber}`;
    }

    return null;
  };

  const url = getEtherscanUrl();

  // Don't render if we can't construct a valid URL
  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={clsx('inline-block opacity-70 transition-opacity hover:opacity-100', className)}
      aria-label="View on Etherscan"
    >
      <EtherscanIcon className="h-5 w-5" />
    </a>
  );
}
