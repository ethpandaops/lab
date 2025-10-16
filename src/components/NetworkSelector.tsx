import { type JSX, useMemo } from 'react';
import { GlobeAltIcon } from '@heroicons/react/16/solid';
import { useNetwork } from '@/hooks/useNetwork';
import { SelectMenu, type SelectMenuOption } from '@/components/SelectMenu';
import type { Network } from '@/types/config';

interface NetworkSelectorProps {
  /**
   * Whether to show the label above the selector
   * @default true
   */
  showLabel?: boolean;

  /**
   * Custom label text
   * @default "Network"
   */
  label?: string;
}

/**
 * Network selector dropdown component.
 *
 * Displays a list of available networks from the config and allows switching between them.
 * The selected network is persisted in localStorage and accessible via the useNetwork hook.
 *
 * Features:
 * - Defaults to "mainnet" if available, otherwise the first network
 * - Shows network display name with a globe icon
 * - Highlights currently selected network with a checkmark
 * - Keyboard accessible
 * - Dark mode support
 *
 * @example
 * ```tsx
 * // With label
 * <NetworkSelector />
 *
 * // Without label
 * <NetworkSelector showLabel={false} />
 *
 * // Custom label
 * <NetworkSelector label="Select Network" />
 * ```
 */
export function NetworkSelector({ showLabel = true, label = 'Network' }: NetworkSelectorProps): JSX.Element {
  const { currentNetwork, setCurrentNetwork, networks } = useNetwork();

  const options: SelectMenuOption<Network>[] = useMemo(
    () =>
      networks.map((network: Network) => ({
        value: network,
        label: network.display_name,
        icon: <GlobeAltIcon className="size-5 text-indigo-400 group-data-focus:text-indigo-200" aria-hidden="true" />,
      })),
    [networks]
  );

  if (!currentNetwork) {
    return <div className="text-sm text-slate-400">Loading networks...</div>;
  }

  return (
    <SelectMenu
      value={currentNetwork}
      onChange={setCurrentNetwork}
      options={options}
      showLabel={showLabel}
      label={label}
      placeholder="Select network"
    />
  );
}
