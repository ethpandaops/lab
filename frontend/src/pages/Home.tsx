import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

function Home(): JSX.Element {
  return (
    <div className="min-h-[calc(100vh-56px)] w-full flex items-center justify-center py-12">
      {/* Content */}
      <div className="relative flex flex-col items-center justify-center space-y-32">
        {/* Hero Content */}
        <div className="relative text-center space-y-12">
          <h1 className="text-6xl md:text-7xl lg:text-8xl title-gradient mb-6 font-bold">
            <span className="relative">
              <span className="relative">The Lab</span>
              <div className="absolute -inset-1 bg-accent/10 blur-2xl rounded-full" />
            </span>
          </h1>
          <p className="text-l md:text-3xl font-mono text-primary/90 italic">
            Let the pandas cook{' '}
          </p>
          
          {/* CTA Button */}
          <Link 
            to="/experiments" 
            className="btn btn-primary btn-lg group inline-flex items-center gap-3 px-8 py-4 text-lg hover:scale-105 transition-all duration-300"
          >
            <span className="relative text-2xl">Enter</span>
            <ArrowRight className="w-7 h-7 group-hover:translate-x-2 transition-all duration-300" />
          </Link>
        </div>

        {/* Showcase */}
        <div className="relative w-full max-w-2xl">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
          </div>
          <div className="relative flex justify-center mb-6">
            <div className="px-6 py-2 bg-nav/80 backdrop-blur-sm border border-subtle rounded-full">
              <h2 className="text-xl font-sans font-bold text-tertiary">Featured Experiment</h2>
            </div>
          </div>
          <div className="relative px-4">
            <Link 
              to="/beacon/slot/live" 
              className="relative block w-full bg-surface/80 backdrop-blur-sm border border-accent/20 hover:border-accent p-6 group transition-all duration-300 hover:bg-surface/90 cursor-pointer rounded-lg hover:shadow-lg hover:shadow-accent/5"
            >
              <div className="flex items-center gap-6">
                <div className="relative w-16 h-16 shrink-0">
                  <img 
                    src="/ethereum.png" 
                    alt="" 
                    className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-accent/10 blur-xl rounded-full group-hover:bg-accent/20 transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-sans font-bold text-accent group-hover:text-accent transition-colors mb-2">
                    Live Slot Visualizer
                  </h3>
                  <p className="text-sm font-mono text-secondary group-hover:text-primary/80 transition-colors">
                    Watch Ethereum slots in real-time with detailed metrics and visualizations
                  </p>
                </div>
                <ArrowRight className="w-6 h-6 text-accent/50 group-hover:text-accent group-hover:translate-x-2 transition-all duration-300" />
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home; 