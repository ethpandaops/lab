import { useState, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Search } from 'lucide-react'
import { NetworkContext } from '../../../App'
import { BeaconClockManager } from '../../../utils/beacon'

function SlotLookup(): JSX.Element {
  const navigate = useNavigate()
  const [slotNumber, setSlotNumber] = useState('')
  const { selectedNetwork } = useContext(NetworkContext)
  const clock = BeaconClockManager.getInstance().getBeaconClock(selectedNetwork)
  const currentSlot = clock?.getCurrentSlot() || 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!slotNumber) return
    navigate(`${slotNumber}`)
  }

  return (
    <div className="space-y-8">
      {/* Warning Section */}
      <div className="relative backdrop-blur-md bg-surface/80 border border-warning/20 rounded-lg p-6 overflow-hidden">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 mt-1">
            <AlertTriangle className="w-5 h-5 text-warning" />
          </div>
          <div>
            <p className="text-base font-mono text-secondary">
              This is an experimental feature. Historical slot data is only available for the past few days.
            </p>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative backdrop-blur-md bg-surface/80 border border-subtle rounded-lg p-8 md:p-12 overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent" />
        
        <div className="relative">
          <h1 className="text-4xl md:text-5xl font-sans font-bold text-primary mb-4">
            Slot Explorer
          </h1>
          <p className="text-lg md:text-xl font-mono text-secondary max-w-3xl mb-8">
            Search for a specific slot to view detailed information about its timing, attestations, and network propagation metrics.
          </p>

          {/* Search Form */}
          <form onSubmit={handleSubmit} className="flex gap-4">
            <div className="flex-1 max-w-xl">
              <input
                type="number"
                value={slotNumber}
                onChange={(e) => setSlotNumber(e.target.value)}
                placeholder="Enter slot number..."
                className="w-full bg-nav/50 backdrop-blur-sm border border-subtle rounded-lg px-4 py-3 text-lg font-mono text-primary placeholder:text-tertiary focus:border-accent focus:outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            <button
              type="submit"
              disabled={!slotNumber}
              className="flex items-center gap-2 px-6 py-3 bg-accent/10 backdrop-blur-sm border border-accent/20 rounded-lg text-accent hover:bg-accent/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Search className="w-5 h-5" />
              <span className="font-medium">Search</span>
            </button>
          </form>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4">
        <button
          onClick={() => navigate('live')}
          className="flex items-center gap-2 px-4 py-2 bg-nav/50 backdrop-blur-sm border border-accent/20 rounded-lg text-sm font-mono text-accent hover:bg-accent/20 hover:border-accent transition-colors"
        >
          View Live
        </button>
      </div>
    </div>
  )
}

export { SlotLookup } 