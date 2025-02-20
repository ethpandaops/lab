import { Fragment } from 'react'
import { Listbox, Transition } from '@headlessui/react'
import { ChevronUpDownIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { getConfig } from '../../config'
import { useEffect, useState, useRef } from 'react'
import type { Config } from '../../types'

interface NetworkSelectorProps {
  selectedNetwork: string
  onNetworkChange: (network: string) => void
  availableNetworks?: string[]
  className?: string
}

const NETWORK_METADATA = {
  mainnet: {
    name: 'Mainnet',
    icon: (
      <svg width="20" height="20" viewBox="0 0 784 784" fill="none">
        <circle cx="392" cy="392" r="392" fill="#627EEA" fillOpacity="0.1"/>
        <path d="M392.07 92.5L387.9 105.667V525.477L392.07 529.647L586.477 413.42L392.07 92.5Z" fill="#627EEA"/>
        <path d="M392.07 92.5L197.666 413.42L392.07 529.647V324.921V92.5Z" fill="#627EEA"/>
        <path d="M392.07 572.834L389.706 575.668V726.831L392.07 733.5L586.607 456.679L392.07 572.834Z" fill="#627EEA"/>
        <path d="M392.07 733.5V572.834L197.666 456.679L392.07 733.5Z" fill="#627EEA"/>
        <path d="M392.07 529.647L586.477 413.42L392.07 324.921V529.647Z" fill="#627EEA"/>
        <path d="M197.666 413.42L392.07 529.647V324.921L197.666 413.42Z" fill="#627EEA"/>
      </svg>
    ),
    color: '#627EEA'
  },
  sepolia: {
    name: 'Sepolia',
    icon: '🐬',
    color: '#CFB5F0'
  },
  holesky: {
    name: 'Holesky',
    icon: '🐱',
    color: '#A4E887'
  }
} as const

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

  const selectedMetadata = NETWORK_METADATA[selectedNetwork as keyof typeof NETWORK_METADATA] || {
    name: selectedNetwork.charAt(0).toUpperCase() + selectedNetwork.slice(1),
    icon: '🔥',
    color: '#627EEA'
  }

  return (
    <div className={clsx('relative', className)}>
      <Listbox value={selectedNetwork} onChange={onNetworkChange}>
        <div className="relative">
          <Listbox.Button className="relative w-full cursor-pointer rounded-lg bg-surface/30 backdrop-blur-sm py-2 pl-3 pr-10 text-left shadow-sm border border-subtle hover:bg-surface/50 transition-colors">
            <span className="flex items-center gap-2">
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
                const metadata = NETWORK_METADATA[network as keyof typeof NETWORK_METADATA] || {
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