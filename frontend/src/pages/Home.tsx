import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

function Home(): JSX.Element {
  return (
    <div className="h-full w-full flex items-center justify-center">
      {/* Content */}
      <div className="relative flex flex-col items-center justify-center space-y-24">
        {/* Hero Content */}
        <div className="relative text-center space-y-12">
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-sans font-black mb-6 drop-shadow-lg">
            <span className="relative">
              <span className="absolute -inset-2 bg-gradient-to-r from-cyber-neon/20 via-cyber-blue/20 to-cyber-pink/20 blur-xl" />
              <span className="relative bg-gradient-to-r from-cyber-neon via-cyber-blue to-cyber-pink bg-clip-text text-transparent animate-text-shine">
                The Lab
              </span>
            </span>
          </h1>
          <p className="text-2xl md:text-3xl font-mono text-cyber-neon drop-shadow-lg">
            Let the pandas cook 🐼👨‍🍳
          </p>
          
          {/* CTA Button */}
          <Link 
            to="/experiments" 
            className="group relative inline-flex items-center gap-3 px-10 py-5 rounded-xl border-2 border-cyber-neon/20 hover:border-cyber-neon transition-all duration-300"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-cyber-neon/10 via-cyber-blue/10 to-cyber-pink/10 group-hover:opacity-20 transition-opacity rounded-xl backdrop-blur-sm" />
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="absolute inset-0 bg-gradient-to-r from-cyber-neon/20 via-cyber-blue/20 to-cyber-pink/20 animate-pulse-slow rounded-xl" />
              <div className="absolute inset-0 bg-gradient-to-r from-cyber-neon/5 via-transparent to-cyber-pink/5 rounded-xl" />
            </div>
            <span className="relative text-2xl font-mono font-bold bg-gradient-to-r from-cyber-neon via-cyber-blue to-cyber-pink bg-clip-text text-transparent animate-text-shine">
              Enter
            </span>
            <ArrowRight className="relative w-7 h-7 text-cyber-neon group-hover:translate-x-1 transition-all duration-300" />
          </Link>
        </div>

        {/* Showcase */}
        <div className="relative w-full max-w-2xl">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full h-px bg-gradient-to-r from-transparent via-cyber-neon/20 to-transparent" />
          </div>
          <div className="relative flex justify-center mb-4">
            <div className="px-4 bg-cyber-darker">
              <h2 className="text-xl font-sans font-bold text-cyber-neon/70">Featured Experiment</h2>
            </div>
          </div>
          <Link 
            to="/xatu/community-nodes" 
            className="group relative backdrop-blur-sm rounded-lg border border-cyber-neon/10 hover:border-cyber-neon/30 p-4 flex items-center gap-4 transition-all duration-300"
          >
            <div className="relative w-12 h-12 shrink-0">
              <div className="absolute inset-0 opacity-50 blur-lg">
                <img src="/xatu.png" alt="" className="w-full h-full object-contain" />
              </div>
              <img 
                src="/xatu.png" 
                alt="" 
                className="relative w-full h-full object-contain"
                style={{ 
                  filter: 'drop-shadow(0 0 2px rgba(255, 255, 255, 1)) drop-shadow(0 0 4px rgba(255, 255, 255, 0.8)) drop-shadow(0 0 6px rgba(0, 255, 159, 0.5))'
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-sans font-bold text-primary group-hover:text-cyber-neon transition-colors">
                Xatu Community Nodes
              </h3>
              <p className="text-sm font-mono text-secondary">
                Help improve Ethereum by contributing your node's data to our research
              </p>
            </div>
            <ArrowRight className="w-6 h-6 text-cyber-neon/30 group-hover:text-cyber-neon group-hover:translate-x-1 transition-all duration-300" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Home; 