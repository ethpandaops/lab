import { Link } from 'react-router-dom'
import { ArrowRight, ExternalLink, Zap, Code, Activity, Server, Database, ChevronRight } from 'lucide-react'
import { Card, CardBody } from '../components/common/Card'
import { useEffect, useState } from 'react'

// Import experiment data from Experiments page
const featuredExperiments = [
  {
    id: 'xatu',
    title: 'Locally Built Blocks',
    subtitle: 'Xatu',
    description: 'Analyze throw-away blocks built by our clients.',
    logo: '/xatu.png',
    href: '/beacon/locally-built-blocks',
    color: 'from-primary/20 via-accent/20 to-error/20',
  },
  {
    id: 'beacon-chain',
    title: 'Slot Explorer',
    subtitle: 'Beacon Chain',
    description: 'Explore detailed information about consensus layer slots.',
    logo: '/ethereum.png',
    href: '/beacon/slot/',
    color: 'from-accent/20 via-accent-secondary/20 to-error/20',
  }
];

// Additional features for the homepage
const labFeatures = [
  {
    icon: <Activity className="h-6 w-6 text-accent" />,
    title: "Network Analysis",
    description: "Real-time monitoring and analysis of Ethereum network performance metrics."
  },
  {
    icon: <Server className="h-6 w-6 text-accent" />,
    title: "Node Monitoring",
    description: "Track node distribution, health, and community contributions across networks."
  },
  {
    icon: <Database className="h-6 w-6 text-accent" />,
    title: "Data Visualization",
    description: "Interactive charts and visualizations of complex blockchain data."
  },
  {
    icon: <Code className="h-6 w-6 text-accent" />,
    title: "Developer Tools",
    description: "Experimental tools to assist Ethereum developers and researchers."
  }
];

function Home(): JSX.Element {
  const [animatedText, setAnimatedText] = useState("Ethereum");
  const networkTerms = ["Ethereum", "Consensus Layer", "Execution Layer", "Beacon Chain"];
  
  // Cycle through network terms for the animated text
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimatedText(prev => {
        const currentIndex = networkTerms.indexOf(prev);
        return networkTerms[(currentIndex + 1) % networkTerms.length];
      });
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full flex flex-col">
      {/* Dynamic background elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Animated gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-accent/20 rounded-full filter blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-error/20 rounded-full filter blur-3xl animate-pulse-slow delay-1000"></div>
        <div className="absolute top-2/3 left-1/3 w-48 h-48 bg-cyber-cyan/10 rounded-full filter blur-3xl animate-pulse-slow"></div>
        
        {/* Grid overlay */}
        <div className="absolute inset-0 bg-cyber-grid bg-cyber opacity-5"></div>
        
        {/* Scanlines */}
        <div className="absolute inset-0 bg-scanlines"></div>
        
        {/* Noise texture */}
        <div className="absolute inset-0 bg-noise"></div>
      </div>
      
      {/* Main content container with flex layout */}
      <div className="flex flex-col relative z-10">
        {/* Hero Section */}
        <div className="py-16 md:py-24 flex items-center justify-center">
          <div className="max-w-6xl mx-auto px-4 text-center">
            {/* Decorative elements */}
            <div className="mb-8 flex justify-center">
              <div className="relative w-24 h-24">
                <div className="absolute inset-0 bg-accent/20 rounded-full animate-pulse-slow"></div>
                <div className="absolute inset-2 border border-accent/30 rounded-full"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <img src="/ethereum.png" alt="Ethereum" className="w-12 h-12" />
                </div>
              </div>
            </div>
            
            {/* Main Title with enhanced animated effect */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent"></div>
              </div>
              <div className="relative">
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-sans font-black text-primary animate-text-shine mb-2">
                  The Lab
                </h1>
                <div className="w-32 h-1 mx-auto bg-gradient-to-r from-accent/50 to-error/50 rounded-full"></div>
              </div>
            </div>
            
            {/* Description with enhanced styling and animation */}
            <p className="text-lg md:text-xl font-mono text-secondary max-w-2xl mx-auto mb-8">
              Experimental tools for <span className="text-accent font-bold relative inline-block">
                {animatedText}
                <span className="absolute bottom-0 left-0 w-full h-px bg-accent/50"></span>
              </span> network analysis
            </p>
            
            {/* CTA Buttons with enhanced styling */}
            <div className="flex flex-wrap gap-4 justify-center mb-16">
              <Link
                to="/experiments"
                className="group inline-flex items-center justify-center px-6 py-3 bg-accent hover:bg-accent-hover text-accent-foreground font-bold rounded-lg transition-all duration-300 shadow-lg hover:shadow-neon transform hover:-translate-y-1"
              >
                Explore All
                <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              
              <a
                href="https://github.com/ethpandaops/lab"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center justify-center px-6 py-3 bg-surface/50 hover:bg-surface/70 text-primary font-bold rounded-lg transition-all duration-300 border border-subtle hover:border-default backdrop-blur-sm"
              >
                GitHub
                <ExternalLink className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:rotate-12" />
              </a>
            </div>
            
            {/* Features Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
              {labFeatures.map((feature, index) => (
                <div 
                  key={index} 
                  className="p-5 rounded-lg backdrop-blur-sm bg-surface/30 border border-subtle hover:border-accent/30 transition-all duration-300 hover:transform hover:scale-105 hover:shadow-neon group"
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="mb-4 p-3 rounded-full bg-surface/50 group-hover:bg-accent/10 transition-colors duration-300">
                      {feature.icon}
                    </div>
                    <h3 className="text-lg font-sans font-bold text-primary mb-2 group-hover:text-accent transition-colors">{feature.title}</h3>
                    <p className="text-sm font-mono text-tertiary group-hover:text-secondary transition-colors">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Featured Experiments Section */}
        <div className="px-4 py-12 md:py-16 bg-surface/10 backdrop-blur-sm border-t border-b border-subtle/30">
          <div className="max-w-6xl mx-auto">
            {/* Section Header with enhanced styling */}
            <div className="mb-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-accent/10 rounded-full mb-4 relative">
                <div className="absolute inset-0 bg-accent/5 rounded-full animate-pulse-slow"></div>
                <Zap className="h-8 w-8 text-accent" />
              </div>
              <h2 className="text-2xl md:text-3xl font-sans font-bold mb-3 animate-text-shine">Featured Experiments</h2>
              <p className="text-sm font-mono text-tertiary max-w-lg mx-auto">
                Explore our latest tools and visualizations for Ethereum network analysis
              </p>
            </div>
            
            {/* Featured Cards Grid - Enhanced version */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              {featuredExperiments.map((experiment) => (
                <Card key={experiment.id} isInteractive className="relative overflow-hidden backdrop-blur-sm border-subtle hover:border-accent/30 transition-all duration-300">
                  <Link to={experiment.href} className="block w-full h-full">
                    <div className={`absolute inset-0 bg-gradient-to-br ${experiment.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                    
                    {/* Decorative corner elements */}
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-accent/30 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-accent/30 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    
                    <CardBody className="relative p-6">
                      <div className="flex flex-col md:flex-row md:items-start gap-6">
                        <div className="w-16 h-16 md:w-20 md:h-20 flex items-center justify-center flex-shrink-0 relative mx-auto md:mx-0">
                          <div className={`absolute inset-0 bg-gradient-to-br ${experiment.color} blur-md rounded-full`} />
                          <img
                            src={experiment.logo}
                            alt=""
                            className="w-12 h-12 md:w-14 md:h-14 object-contain relative z-10 group-hover:scale-110 transition-transform duration-300"
                          />
                        </div>

                        <div className="flex-1 min-w-0 text-center md:text-left">
                          <h3 className="text-xl md:text-2xl font-sans font-bold text-primary group-hover:text-accent transition-colors mb-2">
                            {experiment.title}
                          </h3>
                          <p className="text-sm font-mono text-tertiary mb-2">
                            {experiment.subtitle}
                          </p>
                          <p className="text-sm font-mono text-secondary mb-4">
                            {experiment.description}
                          </p>
                          <div className="inline-flex items-center text-accent bg-accent/10 px-3 py-1 rounded-full">
                            <span className="text-xs font-mono">Explore</span>
                            <ChevronRight className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      </div>
                    </CardBody>
                  </Link>
                </Card>
              ))}
            </div>
            
            {/* View All Link with enhanced styling */}
            <div className="text-center">
              <Link
                to="/experiments"
                className="inline-flex items-center justify-center px-6 py-3 bg-surface/30 hover:bg-surface/50 text-primary font-bold rounded-lg transition-all duration-300 border border-subtle hover:border-accent/30 backdrop-blur-sm hover:shadow-neon"
              >
                View all experiments
                <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
        
        {/* Footer Banner */}
        <div className="px-4 py-16 md:py-24 relative overflow-hidden">
          {/* Background elements for footer */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-accent/5 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent"></div>
          
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <h2 className="text-2xl md:text-3xl font-sans font-bold mb-4 animate-text-shine">Join the Ethereum Research Community</h2>
            <p className="text-lg font-mono text-secondary mb-8 max-w-2xl mx-auto">
              Contribute to our open-source tools and help advance Ethereum network analysis
            </p>
            <a
              href="https://github.com/ethpandaops/lab"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-8 py-4 bg-accent hover:bg-accent-hover text-accent-foreground font-bold rounded-lg transition-all duration-300 shadow-lg hover:shadow-neon transform hover:-translate-y-1"
            >
              Get Involved
              <ExternalLink className="ml-2 h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;