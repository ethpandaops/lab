import { Link, Outlet, useLocation } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { AboutThisData } from '../../components/common/AboutThisData'

function Beacon(): JSX.Element {
  const location = useLocation()

  // If we're on a nested route, render the child route
  if (location.pathname !== '/beacon') {
    return <Outlet />
  }

  return (
    <div className="space-y-6">

      <AboutThisData>
        <p>
          Explore detailed information about individual slots on the Ethereum beacon chain, including timing data, attestations, and network propagation metrics.
        </p>
      </AboutThisData>

      {/* Overview Section */}
      <div className="backdrop-blur-md   -default p-6 bg-surface/80">
        <div className="flex flex-col mb-6">
          <h2 className="text-2xl font-sans font-bold text-primary mb-2">Overview</h2>
          <p className="text-base font-mono text-secondary">
            View detailed slot information and live slot updates.
          </p>
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link 
            to="live" 
            className="group backdrop-blur-md   -default hover:-prominent hover:bg-hover p-6 transition-all duration-300"
          >
            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 text-4xl mt-0.5">⚡️</div>
              <div className="flex flex-col flex-grow">
                <h3 className="text-xl font-sans font-bold text-primary group-hover:text-accent transition-colors">Live View</h3>
                <p className="text-sm font-mono text-secondary">Watch slots as they happen in real-time</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <ArrowRight className="w-6 h-6 text-muted group-hover:text-accent group-hover:translate-x-1 transition-all duration-300" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}

export { Beacon } 