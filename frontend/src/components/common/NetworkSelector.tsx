import { Fragment } from 'react'
import { Listbox, Transition } from '@headlessui/react'
import { ChevronUpDownIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { getConfig } from '../../config'
import { useEffect, useState, useRef } from 'react'
import type { Config } from '../../types'
import { NETWORK_METADATA, type NetworkKey } from '../../constants/networks'

interface NetworkSelectorProps {
  selectedNetwork: string
  onNetworkChange: (network: string) => void
  availableNetworks?: string[]
  className?: string
}

export function NetworkSelector({
  selectedNetwork,
  onNetworkChange,
  availableNetworks = [],
  className = ''
}: NetworkSelectorProps): JSX.Element {
  const [config, setConfig] = useState<Config>()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getConfig().then(setConfig)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const networks = config?.modules['xatu_public_contributors']?.networks || ['mainnet']

  const selectedMetadata = NETWORK_METADATA[selectedNetwork as NetworkKey] || {
    name: selectedNetwork.charAt(0).toUpperCase() + selectedNetwork.slice(1),
    icon: '🔥',
    color: '#627EEA'
  }

  return (
    <div className={clsx('relative', className)}>
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
              {networks.map((network) => {
                const metadata = NETWORK_METADATA[network as NetworkKey] || {
                  name: network.charAt(0).toUpperCase() + network.slice(1),
                  icon: '🔥',
                  color: '#627EEA'
                }
                return (
                  <Listbox.Option
                    key={network}
                    className={({ active }) =>
                      clsx(
                        'relative cursor-pointer select-none py-2 pl-3 pr-9 font-mono bg-surface',
                        active ? 'bg-hover text-accent' : 'text-primary'
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
                )
              })}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>
    </div>
  )
} 