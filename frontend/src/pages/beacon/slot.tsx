import { useEffect, useContext } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { SlotView } from '../../components/beacon/SlotView'
import { NetworkContext } from '../../App'
import { AboutThisData } from '../../components/common/AboutThisData'

function BeaconSlot(): JSX.Element {
  const { slot } = useParams<{ slot: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const { selectedNetwork, setSelectedNetwork } = useContext(NetworkContext)

  // Update URL when network changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams)
    params.set('network', selectedNetwork)
    setSearchParams(params)
  }, [selectedNetwork, setSearchParams, searchParams])

  return (
    <div className="space-y-6">
      {/* Slot View */}
      <SlotView
        slot={slot ? parseInt(slot, 10) : undefined}
        network={selectedNetwork}
        isLive={false}
      />
    </div>
  )
}

export { BeaconSlot } 