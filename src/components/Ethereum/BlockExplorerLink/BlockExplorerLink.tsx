import { BeaconchainIcon } from '@/components/Ethereum/BeaconchainIcon';
import { DoraIcon } from '@/components/Ethereum/DoraIcon';
import { EtherscanIcon } from '@/components/Ethereum/EtherscanIcon';
import { TracoorIcon } from '@/components/Ethereum/TracoorIcon';
import { useNetwork } from '@/hooks/useNetwork';
import clsx from 'clsx';
import type { BlockExplorerLinkProps } from './BlockExplorerLink.types';

/**
 * BlockExplorerLink component displays a clickable icon link to various block explorers
 */
export function BlockExplorerLink({
  type,
  slot,
  epoch,
  blockNumber,
  blockRoot,
  className,
}: BlockExplorerLinkProps): React.JSX.Element | null {
  const { currentNetwork } = useNetwork();

  const serviceUrls = currentNetwork?.service_urls;
  if (!serviceUrls) return null;

  const getExplorerUrl = (): string | null => {
    switch (type) {
      case 'beaconchain': {
        const baseUrl = serviceUrls.beaconExplorer;
        if (!baseUrl) return null;
        if (slot !== undefined) return `${baseUrl}/slot/${slot}`;
        if (epoch !== undefined) return `${baseUrl}/epoch/${epoch}`;
        return baseUrl;
      }

      case 'etherscan': {
        const baseUrl = serviceUrls.etherscan;
        if (!baseUrl || blockNumber === undefined) return null;
        return `${baseUrl}/block/${blockNumber}`;
      }

      case 'dora': {
        const baseUrl = serviceUrls.dora;
        if (!baseUrl) return null;
        if (slot !== undefined) return `${baseUrl}/slot/${slot}`;
        if (epoch !== undefined) return `${baseUrl}/epoch/${epoch}`;
        return baseUrl;
      }

      case 'tracoor': {
        const baseUrl = serviceUrls.tracoor;
        if (!baseUrl) return null;
        if (blockRoot) return `${baseUrl}/beacon_block?beaconBlockBlockRoot=${blockRoot}`;
        if (slot !== undefined) return `${baseUrl}/beacon_block?beaconBlockSlot=${slot}`;
        if (epoch !== undefined) return `${baseUrl}/beacon_block?beaconBlockEpoch=${epoch}`;
        return baseUrl;
      }

      default:
        return null;
    }
  };

  const url = getExplorerUrl();
  if (!url) return null;

  const getIcon = (): React.JSX.Element => {
    const iconClassName = 'h-5 w-5';
    switch (type) {
      case 'beaconchain':
        return <BeaconchainIcon className={iconClassName} />;
      case 'etherscan':
        return <EtherscanIcon className={iconClassName} />;
      case 'dora':
        return <DoraIcon className={iconClassName} />;
      case 'tracoor':
        return <TracoorIcon className={iconClassName} />;
    }
  };

  const getAriaLabel = (): string => {
    switch (type) {
      case 'beaconchain':
        return 'View on Beaconcha.in';
      case 'etherscan':
        return 'View on Etherscan';
      case 'dora':
        return 'View on Dora';
      case 'tracoor':
        return 'View on Tracoor';
    }
  };

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={clsx('inline-block opacity-70 transition-opacity hover:opacity-100', className)}
      aria-label={getAriaLabel()}
    >
      {getIcon()}
    </a>
  );
}
