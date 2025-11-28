import { type JSX, useMemo } from 'react';
import { useNetwork, type Network } from '@/hooks/useNetwork';
import { SelectMenu, type SelectMenuOption } from '@/components/Forms/SelectMenu';
import { NetworkIcon } from '@/components/Ethereum/NetworkIcon';
import type { NetworkSelectProps } from './NetworkSelect.types';

const NETWORK_ORDER = ['mainnet', 'holesky', 'sepolia', 'hoodi'];

/**
 * Sorts networks by the predefined order, then alphabetically for any remaining networks.
 */
function sortNetworks(networks: Network[]): Network[] {
  return [...networks].sort((a, b) => {
    const aIndex = NETWORK_ORDER.indexOf(a.name);
    const bIndex = NETWORK_ORDER.indexOf(b.name);

    // Both in the priority list - sort by their position
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }

    // Only a is in the priority list - a comes first
    if (aIndex !== -1) {
      return -1;
    }

    // Only b is in the priority list - b comes first
    if (bIndex !== -1) {
      return 1;
    }

    // Neither in priority list - sort alphabetically by name
    return a.name.localeCompare(b.name);
  });
}

/**
 * Network selector dropdown component.
 *
 * Displays a list of available networks from the config and allows switching between them.
 * The selected network is persisted in localStorage and accessible via the useNetwork hook.
 *
 * Features:
 * - Defaults to "mainnet" if available, otherwise the first network
 * - Shows network display name with NetworkIcon component
 * - Highlights currently selected network with a checkmark
 * - Networks ordered by priority: mainnet, holesky, sepolia, hoodi, then alphabetically
 * - Keyboard accessible
 * - Dark mode support
 *
 * @example
 * ```tsx
 * // With label
 * <NetworkSelect />
 *
 * // Without label
 * <NetworkSelect showLabel={false} />
 *
 * // Custom label
 * <NetworkSelect label="Select Network" />
 * ```
 */
export function NetworkSelect({
  showLabel = true,
  label = 'Network',
  expandToFit = false,
}: NetworkSelectProps): JSX.Element {
  const { currentNetwork, setCurrentNetwork, networks } = useNetwork();

  const options: SelectMenuOption<Network>[] = useMemo(
    () =>
      sortNetworks(networks).map((network: Network) => ({
        value: network,
        label: network.display_name,
        icon: <NetworkIcon networkName={network.name} />,
      })),
    [networks]
  );

  if (!currentNetwork) {
    return <></>;
  }

  return (
    <SelectMenu
      value={currentNetwork}
      onChange={setCurrentNetwork}
      options={options}
      showLabel={showLabel}
      label={label}
      placeholder="Select network"
      expandToFit={expandToFit}
    />
  );
}
