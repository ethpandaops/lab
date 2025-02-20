import { Link, Outlet, useLocation } from 'react-router-dom'
import { ArrowRight, Activity, Search, Clock } from 'lucide-react'
import { useContext } from 'react'
import { NetworkContext } from '../../App'
import { FaEthereum } from 'react-icons/fa'

function Beacon(): JSX.Element {
  const location = useLocation()

  // If we're on a nested route, render the child route
  if (location.pathname !== '/beacon') {
    return <Outlet />
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative backdrop-blur-md bg-surface/80 border border-subtle rounded-lg p-6 md:p-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent" />
        <div className="relative flex items-center gap-8">
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-sans font-bold text-primary mb-3">
              Beacon Chain Explorer
            </h1>
            <p className="text-base md:text-lg font-mono text-secondary max-w-3xl">
              Explore detailed information about individual slots on the Ethereum beacon chain, including timing data, attestations, and network propagation metrics.
            </p>
          </div>
          <FaEthereum className="w-24 h-24 text-accent/20" />
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-8">
        {/* Slot Section */}
        <div>
          <h2 className="text-xl font-sans font-bold text-primary mb-4 px-1">Slot Analysis</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl">
            {/* Live View Card */}
            <Link 
              to="slot/live" 
              className="group relative backdrop-blur-md bg-surface/80 border border-subtle hover:border-accent rounded-lg overflow-hidden transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="relative p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <Activity className="w-5 h-5 text-accent" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-sans font-bold text-primary group-hover:text-accent transition-colors mb-1">
                      Live View
                    </h3>
                    <p className="text-sm font-mono text-tertiary truncate">
                      Real-time slot monitoring
                    </p>
                  </div>

                  <ArrowRight className="w-5 h-5 text-accent/50 group-hover:text-accent group-hover:translate-x-1 transition-all duration-300" />
                </div>

                <p className="text-sm font-mono text-secondary group-hover:text-primary/90 transition-colors mt-4">
                  Watch slots as they happen in real-time with detailed metrics and visualizations
                </p>
              </div>
            </Link>

            {/* Historical Slots Card */}
            <Link 
              to="slot" 
              className="group relative backdrop-blur-md bg-surface/80 border border-subtle hover:border-accent rounded-lg overflow-hidden transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="relative p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <Search className="w-5 h-5 text-accent" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-sans font-bold text-primary group-hover:text-accent transition-colors mb-1">
                      Historical Slots
                    </h3>
                    <p className="text-sm font-mono text-tertiary truncate">
                      Past slot analysis
                    </p>
                  </div>

                  <ArrowRight className="w-5 h-5 text-accent/50 group-hover:text-accent group-hover:translate-x-1 transition-all duration-300" />
                </div>

                <p className="text-sm font-mono text-secondary group-hover:text-primary/90 transition-colors mt-4">
                  Search and analyze past slot data with comprehensive insights
                </p>
              </div>
            </Link>
          </div>
        </div>

        {/* Timing Analysis Section */}
        <div>
          <h2 className="text-xl font-sans font-bold text-primary mb-4 px-1">Timing Analysis</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl">
            {/* Block Timings Card */}
            <Link 
              to="timings/blocks" 
              className="group relative backdrop-blur-md bg-surface/80 border border-subtle hover:border-accent rounded-lg overflow-hidden transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="relative p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-accent" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-sans font-bold text-primary group-hover:text-accent transition-colors mb-1">
                      Block Timings
                    </h3>
                    <p className="text-sm font-mono text-tertiary truncate">
                      Network performance metrics
                    </p>
                  </div>

                  <ArrowRight className="w-5 h-5 text-accent/50 group-hover:text-accent group-hover:translate-x-1 transition-all duration-300" />
                </div>

                <p className="text-sm font-mono text-secondary group-hover:text-primary/90 transition-colors mt-4">
                  Analyze block propagation times and network performance metrics
                </p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export { Beacon } 