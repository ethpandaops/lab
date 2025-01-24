import { Link, Outlet, useLocation } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

export function BeaconChainTimings(): JSX.Element {
  const location = useLocation()

  // If we're on a nested route, render the child route
  if (location.pathname !== '/beacon-chain-timings') {
    return (
        <div>
          <Outlet />
        </div>
    )
  }

  return (
    <div>
      {/* Overview Section */}
      <div className="bg-gray-900/80 backdrop-blur-md rounded-lg p-4 sm:p-6 border border-gray-800 shadow-xl mb-8">
        <div className="flex flex-col mb-6">
          <h2 className="text-2xl font-bold text-cyan-400">Beacon Chain Timings</h2>
          <p className="text-gray-300 mt-4 text-sm sm:text-base">
            This section provides insights into Ethereum beacon chain block timing metrics, including arrival times and block sizes.
          </p>
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6">
          <Link to="blocks" className="group bg-gray-800/50 rounded-lg p-4 sm:p-6 border border-gray-700 hover:bg-gray-700/50 hover:border-cyan-500/50 transition-all">
            <div className="flex gap-4 sm:gap-6 items-start">
              <div className="flex-shrink-0 text-3xl sm:text-4xl text-gray-200 mt-0.5">⚡</div>
              <div className="flex flex-col flex-grow min-w-0">
                <h3 className="text-lg sm:text-xl font-semibold text-cyan-400 mb-2">Block Arrival Times</h3>
                <p className="text-gray-300 text-xs sm:text-sm">Analyze block arrival times and their distribution across the network</p>
              </div>
            </div>
            <button type="button" className="mt-4 sm:mt-6 w-full py-2 sm:py-3 px-4 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 hover:border-cyan-500/30 rounded-lg text-cyan-400 text-sm sm:text-base font-medium transition-all flex items-center justify-center gap-2 group-hover:bg-cyan-500/20">
              View Details
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
} 