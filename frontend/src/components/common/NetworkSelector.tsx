import { getConfig } from '../../utils/config'
import { useEffect, useState } from 'react'
import type { Config } from '../../types'

interface Props {
  selectedNetwork: string
  onNetworkChange: (network: string) => void
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

export const NetworkSelector = ({ selectedNetwork, onNetworkChange, className }: Props) => {
  const [config, setConfig] = useState<Config>()
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    getConfig().then(setConfig)
  }, [])

  const networks = config?.notebooks['xatu-public-contributors'].networks || ['mainnet']

  const selectedMetadata = NETWORK_METADATA[selectedNetwork as keyof typeof NETWORK_METADATA] || {
    name: selectedNetwork.charAt(0).toUpperCase() + selectedNetwork.slice(1),
    icon: '🔥',
    color: '#627EEA'
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 text-gray-300 border border-gray-700 hover:border-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
      >
        <span className="w-5 h-5 flex items-center justify-center">
          {selectedMetadata.icon}
        </span>
        <span>{selectedMetadata.name}</span>
        <svg 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-2 w-full rounded-lg bg-gray-800 border border-gray-700 shadow-xl">
          {networks.map((network) => {
            const metadata = NETWORK_METADATA[network as keyof typeof NETWORK_METADATA] || {
              name: network.charAt(0).toUpperCase() + network.slice(1),
              icon: '🔥',
              color: '#627EEA'
            }

            return (
              <button
                key={network}
                onClick={() => {
                  onNetworkChange(network)
                  setIsOpen(false)
                }}
                className={`w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg text-gray-300 ${
                  network === selectedNetwork ? 'bg-gray-700' : ''
                }`}
              >
                <span className="w-5 h-5 flex items-center justify-center">
                  {metadata.icon}
                </span>
                <span>{metadata.name}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
} 