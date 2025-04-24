import { Link } from 'react-router-dom'
import { ArrowRight, ExternalLink, Zap } from 'lucide-react'
import { Card, CardBody } from '../components/common/Card'

// Import experiment data from Experiments page
const featuredExperiments = [
  {
    id: 'xatu',
    title: 'Xatu',
    subtitle: 'Node monitoring',
    logo: '/xatu.png',
    href: '/xatu',
    color: 'from-primary/20 via-accent/20 to-error/20',
  },
  {
    id: 'beacon-chain',
    title: 'Beacon Chain',
    subtitle: 'Consensus layer',
    logo: '/ethereum.png',
    href: '/beacon',
    color: 'from-accent/20 via-accent-secondary/20 to-error/20',
  }
];

function Home(): JSX.Element {
  return (
    <div className="w-full flex flex-col">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-accent/30 rounded-full filter blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-error/30 rounded-full filter blur-3xl animate-pulse-slow delay-1000"></div>
      </div>
      
      {/* Main content container with flex layout */}
      <div className="flex flex-col">
        {/* Hero Section - Takes 60% of the height */}
        <div className="py-16 md:py-24 flex items-center justify-center">
          <div className="max-w-6xl mx-auto px-4 text-center">
            {/* Main Title with animated effect */}
            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent"></div>
              </div>
              <div className="relative px-4">
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-sans font-black text-primary bg-clip-text text-transparent bg-gradient-to-r from-accent via-primary to-error animate-pulse-slow">
                  The Lab
                </h1>
              </div>
            </div>
            
            {/* Description with enhanced styling */}
            <p className="text-lg md:text-xl font-mono text-secondary max-w-2xl mx-auto mb-6">
              Experimental tools for <span className="text-accent">Ethereum</span> network analysis
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                to="/experiments"
                className="group inline-flex items-center justify-center px-6 py-2 bg-accent hover:bg-accent-hover text-accent-foreground font-bold rounded-lg transition-all duration-300 shadow-lg hover:shadow-accent/30 transform hover:-translate-y-1"
              >
                Explore All
                <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              
              <a
                href="https://github.com/ethpandaops/lab"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center justify-center px-6 py-2 bg-surface/50 hover:bg-surface/70 text-primary font-bold rounded-lg transition-all duration-300 border border-subtle hover:border-default"
              >
                GitHub
                <ExternalLink className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:rotate-12" />
              </a>
            </div>
          </div>
        </div>
        
        {/* Featured Experiments Section - Takes 40% of the height */}
        <div className="px-4 py-8 md:py-12">
          <div className="max-w-6xl mx-auto">
            {/* Section Header */}
            <div className="mb-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Zap className="h-5 w-5 text-accent" />
                <h2 className="text-xl md:text-2xl font-sans font-bold">Featured Experiments</h2>
              </div>
            </div>
            
            {/* Featured Cards Grid - Compact version */}
            <div className="grid grid-cols-2 gap-4">
              {featuredExperiments.map((experiment) => (
                <Card key={experiment.id} isInteractive className="relative">
                  <Link to={experiment.href} className="block w-full h-full">
                    <div className={`absolute inset-0 bg-gradient-to-br ${experiment.color} opacity-0 group-hover:opacity-100 transition-opacity`} />
                    
                    <CardBody className="relative p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 flex items-center justify-center flex-shrink-0 relative">
                          <div className={`absolute inset-0 bg-gradient-to-br ${experiment.color} blur-md rounded-full`} />
                          <img
                            src={experiment.logo}
                            alt=""
                            className="w-8 h-8 object-contain relative z-10 group-hover:scale-110 transition-transform duration-300"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-sans font-bold text-primary group-hover:text-accent transition-colors">
                            {experiment.title}
                          </h3>
                          <p className="text-xs font-mono text-tertiary truncate">
                            {experiment.subtitle}
                          </p>
                        </div>
                        
                        <ArrowRight className="w-4 h-4 text-accent/50 group-hover:text-accent transition-colors" />
                      </div>
                    </CardBody>
                  </Link>
                </Card>
              ))}
            </div>
            
            {/* View All Link */}
            <div className="mt-4 text-center">
              <Link
                to="/experiments"
                className="inline-flex items-center text-accent hover:text-accent-hover font-mono transition-colors text-sm"
              >
                View all experiments
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;