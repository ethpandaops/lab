import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

function Home(): JSX.Element {
  return (
    <div className="h-full w-full flex items-center justify-center">
      {/* Content */}
      <div className="relative flex flex-col items-center justify-center space-y-24">
        {/* Hero Content */}
        <div className="relative text-center space-y-12">
          <h1 className="text-6xl md:text-7xl lg:text-8xl title-gradient mb-6">
            <span className="relative">
              <span className="relative">The Lab</span>
            </span>
          </h1>
          <p className="text-2xl md:text-3xl font-mono text-primary">
            Let the pandas cook 🐼👨‍🍳
          </p>
          
          {/* CTA Button */}
          <Link 
            to="/experiments" 
            className="btn btn-primary btn-lg group inline-flex items-center gap-3"
          >
            <span className="relative text-2xl">Enter</span>
            <ArrowRight className="w-7 h-7 group-hover:translate-x-1 transition-all duration-300" />
          </Link>
        </div>

        {/* Showcase */}
        <div className="relative w-full max-w-2xl">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
          </div>
          <div className="relative flex justify-center mb-4">
            <div className="px-4">
              <h2 className="text-xl font-sans font-bold text-tertiary">Featured Experiment</h2>
            </div>
          </div>
          <div className="relative">
            <Link 
              to="/xatu/community-nodes" 
              className="relative block w-full bg-surface border border-accent/20 hover:border-accent p-4 group transition-all duration-300 hover:bg-surface/90 cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="relative w-12 h-12 shrink-0">
                  <img 
                    src="/xatu.png" 
                    alt="" 
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-sans font-bold text-accent group-hover:text-accent transition-colors">
                    Xatu Community Nodes
                  </h3>
                  <p className="text-sm font-mono text-secondary">
                    Help improve Ethereum by contributing your node's data to our research
                  </p>
                </div>
                <ArrowRight className="w-6 h-6 text-accent/50 group-hover:text-accent group-hover:translate-x-1 transition-all duration-300" />
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home; 