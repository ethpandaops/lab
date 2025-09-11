import { Fragment } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { ChevronUpDownIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import useNetwork from '@/contexts/network';
import { useEffect, useRef } from 'react';
import { NETWORK_METADATA, type NetworkKey } from '@/constants/networks.tsx';

interface NetworkSelectorProps {
  selectedNetwork: string;
  onNetworkChange: (network: string) => void;
  availableNetworks?: string[];
  className?: string;
}

// Function to generate metadata for networks not defined in NETWORK_METADATA
const getNetworkMetadata = (network: string) => {
  if (network in NETWORK_METADATA) {
    return NETWORK_METADATA[network as NetworkKey];
  }

  // Generate metadata for unknown networks
  return {
    name: network.charAt(0).toUpperCase() + network.slice(1),
    icon: '🔥',
    color: '#627EEA',
  };
};

// Network order priority (lower index = higher priority)
const NETWORK_ORDER = ['mainnet', 'sepolia', 'hoodi'];

// Sort networks based on predefined order
const sortNetworks = (networks: string[]): string[] => {
  return [...networks].sort((a, b) => {
    const aIndex = NETWORK_ORDER.indexOf(a);
    const bIndex = NETWORK_ORDER.indexOf(b);

    // If both networks are in the priority list, sort by their index
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }

    // If only a is in the priority list, it comes first
    if (aIndex !== -1) {
      return -1;
    }

    // If only b is in the priority list, it comes first
    if (bIndex !== -1) {
      return 1;
    }

    // If neither is in the priority list, sort alphabetically
    return a.localeCompare(b);
  });
};

export function NetworkSelector({
  selectedNetwork,
  onNetworkChange,
  className = '',
}: NetworkSelectorProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { availableNetworks: availableNetworksFromContext } = useNetwork();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        // Close dropdown logic if needed
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get available networks from props or config
  const unsortedNetworks: string[] = [...(availableNetworksFromContext ?? ['mainnet'])];

  // Sort networks according to the specified order
  const networks = sortNetworks(unsortedNetworks);

  const selectedMetadata = getNetworkMetadata(selectedNetwork);

  return (
    <div className={clsx('relative', className)} ref={dropdownRef}>
      <Listbox value={selectedNetwork} onChange={onNetworkChange}>
        <div className="relative">
          <Listbox.Button className="relative w-full cursor-pointer rounded-lg bg-surface/30 backdrop-blur-sm py-2 pl-3 pr-10 text-left shadow-sm border border-subtle hover:bg-surface/50 transition-colors">
            <span className="flex items-center justify-center gap-2">
              <span className="w-5 h-5 flex items-center justify-center">
                {selectedMetadata.icon}
              </span>
              <span className="block truncate font-mono">{selectedMetadata.name}</span>
            </span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronUpDownIcon className="h-5 w-5 text-tertiary" aria-hidden="true" />
            </span>
          </Listbox.Button>
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Listbox.Options className="absolute z-[9999] mt-1 max-h-60 w-full overflow-auto rounded-lg bg-surface py-1 shadow-lg border border-subtle">
              {networks.map(network => {
                const metadata = getNetworkMetadata(network);
                return (
                  <Listbox.Option
                    key={network}
                    className={({ active }) =>
                      clsx(
                        'relative cursor-pointer select-none py-2 pl-3 pr-9 font-mono bg-surface',
                        active ? 'bg-hover text-accent' : 'text-primary',
                      )
                    }
                    value={network}
                  >
                    {({ selected }) => (
                      <span className="flex items-center gap-2">
                        <span className="w-5 h-5 flex items-center justify-center">
                          {metadata.icon}
                        </span>
                        <span className={clsx('block truncate', selected && 'text-accent')}>
                          {metadata.name}
                        </span>
                      </span>
                    )}
                  </Listbox.Option>
                );
              })}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>
    </div>
  );
}
