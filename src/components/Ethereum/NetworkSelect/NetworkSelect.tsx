import { type JSX, useMemo } from 'react';
import { clsx } from 'clsx';
import { Label, Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/16/solid';
import { useNetwork } from '@/hooks/useNetwork';
import { NetworkIcon } from '@/components/Ethereum/NetworkIcon';
import { getNetworkFullLabel, getNetworkShortLabel, groupNetworks, parseNetworkName } from '@/utils/networks';
import type { NetworkSelectProps } from './NetworkSelect.types';

/**
 * Network selector dropdown component.
 *
 * Displays the available networks from the config, grouped into sections, and allows switching
 * between them. The selected network is persisted in localStorage and accessible via the
 * useNetwork hook.
 *
 * Features:
 * - Public networks first (mainnet, holesky, sepolia, hoodi), then one section per devnet family
 * - Devnets are labelled within their family ("Devnet 8" under "Glamsterdam") so long names never truncate
 * - The selected devnet shows its family above its label in the button
 * - Highlights currently selected network with a checkmark
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

  const groups = useMemo(() => groupNetworks(networks), [networks]);

  if (!currentNetwork) {
    return <></>;
  }

  const family = parseNetworkName(currentNetwork.name)?.family;

  return (
    <Listbox value={currentNetwork} onChange={setCurrentNetwork} by="name">
      {showLabel && <Label className="block text-sm/6 font-medium text-foreground">{label}</Label>}
      <div className={clsx('relative', showLabel && 'mt-2')}>
        <ListboxButton
          title={getNetworkFullLabel(currentNetwork)}
          className={clsx(
            'relative flex h-10 cursor-pointer items-center gap-2 rounded-sm border border-border bg-surface pr-8 pl-2.5 text-left transition-colors hover:border-primary/40',
            expandToFit ? 'w-auto min-w-[140px]' : 'w-full'
          )}
        >
          <span className="flex size-5 shrink-0 items-center justify-center">
            <NetworkIcon networkName={currentNetwork.name} />
          </span>
          <span className="flex min-w-0 flex-col">
            {family && (
              <span className="truncate text-2xs/3 font-semibold tracking-wider text-muted uppercase">{family}</span>
            )}
            <span className="truncate text-sm/5 font-medium text-foreground">
              {getNetworkShortLabel(currentNetwork)}
            </span>
          </span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronUpDownIcon aria-hidden="true" className="size-4 text-muted" />
          </span>
        </ListboxButton>

        <ListboxOptions
          anchor="bottom start"
          transition
          className={clsx(
            'z-[9999] mt-1 max-h-96 overflow-auto rounded-sm border border-border bg-surface pb-1 shadow-lg backdrop-blur-xl focus:outline-hidden data-leave:transition data-leave:duration-100 data-leave:ease-in data-closed:data-leave:opacity-0',
            expandToFit ? 'w-max min-w-[var(--button-width)]' : 'w-[var(--button-width)]'
          )}
        >
          {groups.map((group, index) => (
            <div
              key={group.id}
              role="group"
              aria-label={group.label}
              className={clsx(index > 0 && 'mt-1 border-t border-border/50')}
            >
              <div
                aria-hidden="true"
                className="px-3 pt-2.5 pb-1 text-2xs/3 font-semibold tracking-wider text-muted/60 uppercase"
              >
                {group.label}
              </div>
              {group.networks.map(network => (
                <ListboxOption
                  key={network.name}
                  value={network}
                  title={getNetworkFullLabel(network)}
                  className="group relative flex cursor-pointer items-center gap-2 py-2 pr-9 pl-3 text-foreground transition-colors select-none data-focus:bg-primary/10 data-focus:text-primary data-selected:text-primary"
                >
                  <span className="flex size-5 shrink-0 items-center justify-center">
                    <NetworkIcon networkName={network.name} />
                  </span>
                  <span className="truncate">{getNetworkShortLabel(network)}</span>
                  <span className="absolute inset-y-0 right-0 hidden items-center pr-3 group-data-selected:flex">
                    <CheckIcon aria-hidden="true" className="size-4" />
                  </span>
                </ListboxOption>
              ))}
            </div>
          ))}
        </ListboxOptions>
      </div>
    </Listbox>
  );
}
