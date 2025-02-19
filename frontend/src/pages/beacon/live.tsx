import { useEffect, useState, useContext } from 'react'
import { SlotView } from '../../components/beacon/SlotView'
import { useSearchParams } from 'react-router-dom'
import { BeaconClockManager } from '../../utils/beacon'
import { NetworkContext } from '../../App'

function BeaconLive(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams()
  const { selectedNetwork, setSelectedNetwork } = useContext(NetworkContext)
  const [currentSlot, setCurrentSlot] = useState<number>()

  // Get the BeaconClock for the current network
  const clock = BeaconClockManager.getInstance().getBeaconClock(selectedNetwork)
  const headLagSlots = BeaconClockManager.getInstance().getHeadLagSlots(selectedNetwork)

  // Update URL when network changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams)
    params.set('network', selectedNetwork)
    setSearchParams(params)
  }, [selectedNetwork, setSearchParams, searchParams])

  // Initialize and update current slot
  useEffect(() => {
    if (!clock) return

    // Calculate current slot with head lag plus one extra slot for processing
    const currentClockSlot = clock.getCurrentSlot()
    const slot = currentClockSlot - (headLagSlots + 2) // Add extra slot of lag
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

  return (
    <div className="space-y-6">
      {currentSlot !== undefined && (
        <SlotView
          slot={currentSlot}
          network={selectedNetwork}
          isLive={true}
          onSlotComplete={handleSlotComplete}
        />
      )}
    </div>
  )
}

export { BeaconLive } 