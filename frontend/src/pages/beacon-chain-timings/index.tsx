import { Link, Outlet, useLocation } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { AboutThisData } from '../../components/common/AboutThisData'

function BeaconChainTimings(): JSX.Element {
  const location = useLocation()

  // If we're on a nested route, render the child route
  if (location.pathname !== '/beacon-chain-timings') {
    return <Outlet />
  }

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
              Beacon Chain
            </h1>
          </div>
        </div>
      </div>

      <AboutThisData>
        <p>
          The Beacon Chain is the consensus layer of Ethereum, responsible for coordinating the network of validators.
          Here we analyze various metrics about block timing, network performance, and consensus health.
        </p>
      </AboutThisData>

      {/* Overview Section */}
      <div className="backdrop-blur-md rounded-lg border border-cyber-neon/20 p-6 bg-cyber-dark/80">
        <div className="flex flex-col mb-6">
          <h2 className="text-2xl font-sans font-bold text-cyber-neon mb-2">Overview</h2>
          <p className="text-base font-mono text-cyber-neon/85">
            Explore metrics and performance data from the Ethereum beacon chain.
          </p>
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link 
            to="blocks" 
            className="group backdrop-blur-md rounded-lg border border-cyber-neon/20 hover:border-cyber-neon/30 hover:bg-cyber-neon/5 p-6 transition-all duration-300"
          >
            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 text-4xl mt-0.5">⚡️</div>
              <div className="flex flex-col flex-grow">
                <h3 className="text-xl font-sans font-bold text-cyber-neon group-hover:text-cyber-blue transition-colors">Block Timings</h3>
                <p className="text-sm font-mono text-cyber-neon/85">Analyze block arrival times and network performance</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <ArrowRight className="w-6 h-6 text-cyber-neon/50 group-hover:text-cyber-blue group-hover:translate-x-1 transition-all duration-300" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}

export { BeaconChainTimings } 