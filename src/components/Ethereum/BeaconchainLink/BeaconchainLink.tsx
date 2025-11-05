import { BeaconchainIcon } from '@/components/Ethereum/BeaconchainIcon';
import { useNetwork } from '@/hooks/useNetwork';
import clsx from 'clsx';

export interface BeaconchainLinkProps {
  slot?: number;
  epoch?: number;
  className?: string;
}

/**
 * BeaconchainLink component displays a clickable icon link to Beaconcha.in
 */
export function BeaconchainLink({ slot, epoch, className }: BeaconchainLinkProps): React.JSX.Element | null {
  const { currentNetwork } = useNetwork();

  if (!currentNetwork) return null;

  const getBeaconchainUrl = (): string => {
    // Map network names to Beaconcha.in subdomains
    const networkMap: Record<string, string> = {
      mainnet: 'beaconcha.in',
      sepolia: 'sepolia.beaconcha.in',
      holesky: 'holesky.beaconcha.in',
      gnosis: 'gnosischa.in',
    };

    const domain = networkMap[currentNetwork.name] || 'beaconcha.in';

    if (slot !== undefined) {
      return `https://${domain}/slot/${slot}`;
    }
    if (epoch !== undefined) {
      return `https://${domain}/epoch/${epoch}`;
    }

    return `https://${domain}`;
  };

  const url = getBeaconchainUrl();

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={clsx('inline-block opacity-70 transition-opacity hover:opacity-100', className)}
      aria-label="View on Beaconcha.in"
    >
      <BeaconchainIcon className="h-5 w-5" />
    </a>
  );
}
