import { useEffect, useState } from 'react'
import { SlotView } from '../../components/beacon/SlotView'
import { NetworkSelector } from '../../components/common/NetworkSelector'
import { useSearchParams } from 'react-router-dom'
import { BeaconClockManager } from '../../utils/beacon'

function BeaconLive(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams()
  const [network, setNetwork] = useState<string>(() => 
    searchParams.get('network') || 'mainnet'
  )
  const [currentSlot, setCurrentSlot] = useState<number>()

  // Get the BeaconClock for the current network
  const clock = BeaconClockManager.getInstance().getBeaconClock(network)
  const headLagSlots = BeaconClockManager.getInstance().getHeadLagSlots(network)

  // Update URL when network changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams)
    params.set('network', network)
    setSearchParams(params)
  }, [network, setSearchParams, searchParams])

  // Initialize and update current slot
  useEffect(() => {
    if (!clock) return

    // Calculate current slot with head lag plus one extra slot for processing
    const currentClockSlot = clock.getCurrentSlot()
    const slot = currentClockSlot - (headLagSlots + 1) // Add extra slot of lag
    setCurrentSlot(slot)

    // Calculate when this slot ends
    const slotEndTime = clock.getSlotEndTime(currentClockSlot)
    const now = Math.floor(Date.now() / 1000)
    const timeUntilNext = (slotEndTime - now) * 1000 // Convert to ms

    // Schedule update for next slot
    const timer = setTimeout(() => {
      setCurrentSlot(slot + 1)
    }, timeUntilNext)

    return () => clearTimeout(timer)
  }, [clock, headLagSlots])

  // Handle slot completion
  const handleSlotComplete = () => {
    if (currentSlot !== undefined) {
      setCurrentSlot(currentSlot + 1)
    }
  }

  if (!clock) {
    return <div>No beacon clock available for network {network}</div>
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full h-px bg-gradient-to-r from-transparent via-cyber-neon/20 to-transparent" />
        </div>
        <div className="relative flex justify-between items-center">
          <div className="px-4 bg-cyber-darker">
            <h1 className="text-3xl md:text-4xl font-sans font-black bg-gradient-to-r from-cyber-neon via-cyber-blue to-cyber-pink bg-clip-text text-transparent animate-text-shine">
              Live Slot View
            </h1>
          </div>
          <div className="px-4 bg-cyber-darker">
            <NetworkSelector
              selectedNetwork={network}
              onNetworkChange={setNetwork}
              className="w-48"
            />
          </div>
        </div>
      </div>

      {/* Slot View */}
      <SlotView
        slot={currentSlot}
        network={network}
        isLive={true}
        onSlotComplete={handleSlotComplete}
      />
    </div>
  )
}

export { BeaconLive } 