import { Link, Outlet, useLocation } from 'react-router-dom';
import { ArrowRight, Activity, Search, Clock, Layers } from 'lucide-react';
import { FaEthereum } from 'react-icons/fa';
import { Card, CardBody } from '@/components/common/Card';

function Beacon() {
  const location = useLocation();

  // If we're on a nested route, render the child route
  if (location.pathname !== '/beacon') {
    return <Outlet />;
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <Card isPrimary className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent" />
        <CardBody className="relative flex items-center gap-8">
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-sans font-bold text-primary mb-3">
              Beacon Chain Explorer
            </h1>
            <p className="text-base md:text-lg font-mono text-secondary max-w-3xl">
              Explore detailed information about individual slots on the Ethereum beacon chain,
              including timing data, attestations, and network propagation metrics.
            </p>
          </div>
          <FaEthereum className="w-24 h-24 text-accent/20" />
        </CardBody>
      </Card>

      {/* Sections */}
      <div className="space-y-8">
        {/* Slot Section */}
        <div>
          <h2 className="text-xl font-sans font-bold text-primary mb-4 px-1">Slot Analysis</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Live View Card */}
            <Card isInteractive className="relative">
              <Link to="slot/live" className="block w-full">
                <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <CardBody className="relative">
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
                </CardBody>
              </Link>
            </Card>

            {/* Historical Slots Card */}
            <Card isInteractive className="relative">
              <Link to="slot" className="block w-full">
                <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <CardBody className="relative">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                      <Search className="w-5 h-5 text-accent" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-sans font-bold text-primary group-hover:text-accent transition-colors mb-1">
                        Historical Slots
                      </h3>
                      <p className="text-sm font-mono text-tertiary truncate">Look up past slots</p>
                    </div>

                    <ArrowRight className="w-5 h-5 text-accent/50 group-hover:text-accent group-hover:translate-x-1 transition-all duration-300" />
                  </div>

                  <p className="text-sm font-mono text-secondary group-hover:text-primary/90 transition-colors mt-4">
                    Search for specific slots by number and analyze historical data
                  </p>
                </CardBody>
              </Link>
            </Card>

            {/* Block Production Flow Card */}
            <Card isInteractive className="relative">
              <Link to="block-production/live" className="block w-full">
                <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <CardBody className="relative">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                      <FaEthereum className="w-5 h-5 text-accent" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-sans font-bold text-primary group-hover:text-accent transition-colors mb-1">
                        Block Production Flow
                      </h3>
                      <p className="text-sm font-mono text-tertiary truncate">
                        Real-time production visualization
                      </p>
                    </div>

                    <ArrowRight className="w-5 h-5 text-accent/50 group-hover:text-accent group-hover:translate-x-1 transition-all duration-300" />
                  </div>

                  <p className="text-sm font-mono text-secondary group-hover:text-primary/90 transition-colors mt-4">
                    Visualize the entire Ethereum block production process in real-time
                  </p>
                </CardBody>
              </Link>
            </Card>

            {/* Locally Built Blocks Card */}
            <Card isInteractive className="relative">
              <Link to="locally-built-blocks" className="block w-full">
                <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <CardBody className="relative">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                      <Layers className="w-5 h-5 text-accent" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-sans font-bold text-primary group-hover:text-accent transition-colors mb-1">
                        Locally Built Blocks
                      </h3>
                      <p className="text-sm font-mono text-tertiary truncate">
                        Analyze block production
                      </p>
                    </div>

                    <ArrowRight className="w-5 h-5 text-accent/50 group-hover:text-accent group-hover:translate-x-1 transition-all duration-300" />
                  </div>

                  <p className="text-sm font-mono text-secondary group-hover:text-primary/90 transition-colors mt-4">
                    Explore blocks built by validators with detailed metrics and statistics
                  </p>
                </CardBody>
              </Link>
            </Card>
          </div>
        </div>

        {/* Timing Section */}
        <div>
          <h2 className="text-xl font-sans font-bold text-primary mb-4 px-1">Timing Analysis</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl">
            <Card isInteractive className="relative">
              <Link to="timings" className="block w-full">
                <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <CardBody className="relative">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-5 h-5 text-accent" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-sans font-bold text-primary group-hover:text-accent transition-colors mb-1">
                        Chain Timings
                      </h3>
                      <p className="text-sm font-mono text-tertiary truncate">
                        Block and attestation timing analysis
                      </p>
                    </div>

                    <ArrowRight className="w-5 h-5 text-accent/50 group-hover:text-accent group-hover:translate-x-1 transition-all duration-300" />
                  </div>

                  <p className="text-sm font-mono text-secondary group-hover:text-primary/90 transition-colors mt-4">
                    Analyze timing patterns, block propagation, and network performance
                  </p>
                </CardBody>
              </Link>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export { Beacon };
