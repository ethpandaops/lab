import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { SlotView } from '../../components/beacon/SlotView'
import { NetworkSelector } from '../../components/common/NetworkSelector'
import { AboutThisData } from '../../components/common/AboutThisData'

function BeaconSlot(): JSX.Element {
  const { slot } = useParams<{ slot: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const [network, setNetwork] = useState<string>(() => 
    searchParams.get('network') || 'mainnet'
  )

  // Update URL when network changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams)
    params.set('network', network)
    setSearchParams(params)
  }, [network, setSearchParams, searchParams])

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="relative mb-12">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full h-px bg-gradient-to-r from-transparent via-cyber-neon/20 to-transparent" />
        </div>
        <div className="relative flex justify-center">
          <div className="px-4 bg-cyber-darker">
            <h1 className="text-3xl md:text-4xl font-sans font-black bg-gradient-to-r from-cyber-neon via-cyber-blue to-cyber-pink bg-clip-text text-transparent animate-text-shine">
              Slot {slot}
            </h1>
          </div>
        </div>
      </div>

      <AboutThisData>
        <p>
          View detailed information about slot {slot}, including block propagation, attestations, and network performance metrics.
        </p>
      </AboutThisData>

      {/* Controls Section */}
      <div className="backdrop-blur-md rounded-lg border border-cyber-neon/20 p-6 bg-cyber-dark/80">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <NetworkSelector
            selectedNetwork={network}
            onNetworkChange={setNetwork}
            className="w-full md:w-auto"
          />
        </div>
      </div>

      {/* Slot View */}
      <SlotView
        slot={slot ? parseInt(slot, 10) : undefined}
        network={network}
        isLive={false}
      />
    </div>
  )
}

export { BeaconSlot } 