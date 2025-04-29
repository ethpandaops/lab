import { Link } from 'react-router-dom'
import { ArrowRight, ExternalLink, Zap, ChevronRight } from 'lucide-react'
import { Card, CardBody } from '../components/common/Card'
import { useEffect, useState, useRef } from 'react'

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

function Home(): JSX.Element {
  const [animatedText, setAnimatedText] = useState("Ethereum");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const networkTerms = ["Ethereum", "Consensus Layer", "Execution Layer", "Beacon Chain"];
  const containerRef = useRef<HTMLDivElement>(null);
  const textContainerRef = useRef<HTMLDivElement>(null);
  
  // Calculate and store the max width for the ticker elements
  useEffect(() => {
    if (textContainerRef.current) {
      const container = textContainerRef.current;
      let maxWidth = 0;
      
      // Create temporary spans to measure each term's width
      networkTerms.forEach(term => {
        const span = document.createElement('span');
        span.innerText = term;
        span.style.visibility = 'hidden';
        span.style.position = 'absolute';
        span.style.font = window.getComputedStyle(container).font;
        span.className = 'text-accent font-bold';
        document.body.appendChild(span);
        maxWidth = Math.max(maxWidth, span.offsetWidth);
        document.body.removeChild(span);
      });
      
      // Set the container to the max width plus a small buffer
      container.style.width = `${maxWidth + 10}px`;
      container.style.display = 'inline-block';
    }
  }, []);
  
  // Cycle through network terms with smooth transition
  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);
      
      setTimeout(() => {
        setAnimatedText(prev => {
          const currentIndex = networkTerms.indexOf(prev);
          return networkTerms[(currentIndex + 1) % networkTerms.length];
        });
        
        // Start transition in
        setTimeout(() => {
          setIsTransitioning(false);
        }, 50);
      }, 200);
    }, 2000); // Slightly longer interval for better readability
    
    return () => clearInterval(interval);
  }, []);

  // Smooth scrolling for in-page links
  useEffect(() => {
    const handleSmoothScroll = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      if (target.tagName === 'A' && target.getAttribute('href')?.startsWith('#')) {
        e.preventDefault();
        const href = target.getAttribute('href');
        if (href) {
          const element = document.querySelector(href);
          element?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      }
    };
    
    document.addEventListener('click', handleSmoothScroll);
    return () => document.removeEventListener('click', handleSmoothScroll);
  }, []);

  return (
    <div className="w-full flex flex-col" ref={containerRef}>
      {/* Dynamic background elements with reduced intensity */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Animated gradient orbs - reduced sizes and opacity */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-accent/15 rounded-full filter blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-error/15 rounded-full filter blur-3xl animate-pulse-slow delay-1000"></div>
        <div className="absolute top-2/3 left-1/3 w-40 h-40 bg-cyber-cyan/10 rounded-full filter blur-3xl animate-pulse-slow"></div>
        
        {/* Grid overlay with reduced opacity */}
        <div className="absolute inset-0 bg-cyber-grid bg-cyber opacity-3"></div>
        
        {/* Scanlines with reduced opacity */}
        <div className="absolute inset-0 bg-scanlines opacity-[0.03]"></div>
        
        {/* Noise texture with reduced opacity */}
        <div className="absolute inset-0 bg-noise opacity-[0.015]"></div>
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
                  <img src="/ethereum.png" alt="Ethereum" className="w-12" />
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
            
            {/* Description with fixed-width animated text */}
            <p className="text-lg md:text-xl font-mono text-secondary max-w-2xl mx-auto mb-8">
              Experimental tools for <span ref={textContainerRef} className="inline-block align-middle relative" style={{ minHeight: '1.5em', textAlign: 'center' }}>
                <span className={`absolute left-0 right-0 flex items-center justify-center transition-all duration-300 ease-in-out ${isTransitioning ? 'opacity-0 transform -translate-y-1' : 'opacity-100 transform translate-y-0'}`}>
                  <span className="text-accent font-bold">{animatedText}</span>
                </span>
                <span className="absolute bottom-0 left-0 w-full h-px bg-accent/50"></span>
              </span> network analysis
            </p>
            
            {/* CTA Buttons with enhanced styling */}
            <div className="flex flex-wrap gap-4 justify-center mb-8">
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
          </div>
        </div>
        
        {/* Featured Experiments Section */}
        <div className="px-4 py-12 md:py-16 bg-gradient-to-b from-transparent relative overflow-hidden">
          {/* Subtle background patterns */}
          <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none"></div>
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent"></div>
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent"></div>
          
          <div className="max-w-6xl mx-auto relative">
            {/* Section Header with enhanced styling */}
            <div className="mb-10 text-center">
              <div className="relative inline-flex items-center justify-center w-20 h-20 mb-4">
                <div className="absolute inset-0 bg-accent/10 rounded-full"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-transparent rounded-full animate-pulse-slow"></div>
                <Zap className="h-10 w-10 text-accent relative z-10" />
              </div>
              <h2 className="text-3xl md:text-4xl font-sans font-bold mb-3">
                <span className="bg-gradient-to-r from-accent to-error bg-clip-text text-transparent animate-text-shine">
                  Featured Experiments
                </span>
              </h2>
              <p className="text-md font-mono text-secondary max-w-lg mx-auto">
                Explore our latest tools and visualizations for Ethereum network analysis
              </p>
            </div>
            
            {/* Featured Cards Grid - Enhanced with more visual interest */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              {featuredExperiments.map((experiment) => (
                <Card 
                  key={experiment.id} 
                  isInteractive 
                  className="group relative overflow-hidden rounded-xl bg-surface/30 backdrop-blur-sm border border-subtle hover:border-accent/50 transition-all duration-500 will-change-transform hover:shadow-lg dark:hover:shadow-accent/10"
                >
                  <Link to={experiment.href} className="block w-full h-full">
                    {/* Enhanced gradient background with animation */}
                    <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-700" 
                         style={{background: `radial-gradient(circle at 30% 107%, ${experiment.id === 'xatu' ? 'rgba(142, 45, 226, 0.05)' : 'rgba(56, 189, 248, 0.05)'} 0%, rgba(32, 32, 32, 0) 70%)`}}>
                    </div>
                    
                    {/* Animated grid pattern overlay */}
                    <div className="absolute inset-0 bg-grid-pattern opacity-0 group-hover:opacity-[0.03] transition-opacity duration-700 pointer-events-none"></div>
                    
                    {/* Card content container */}
                    <CardBody className="relative p-6 md:p-8">
                      <div className="flex flex-col md:flex-row md:items-start gap-6 md:gap-8">
                        {/* Logo with enhanced effects */}
                        <div className="w-16 h-16 md:w-20 md:h-20 flex items-center justify-center flex-shrink-0 relative mx-auto md:mx-0">
                          {/* Logo glow effect - pulsing */}
                          <div className="absolute inset-0 bg-gradient-to-br rounded-full opacity-70 blur-lg group-hover:blur-xl group-hover:scale-110 transition-all duration-700"
                               style={{background: `radial-gradient(circle, ${experiment.id === 'xatu' ? 'rgba(142, 45, 226, 0.15)' : 'rgba(56, 189, 248, 0.15)'} 0%, rgba(0, 0, 0, 0) 70%)`}}>
                          </div>
                          
                          {/* Animated border ring */}
                          <div className="absolute inset-0 rounded-full border border-accent/20 group-hover:border-accent/40 group-hover:scale-110 transition-all duration-700"></div>
                          
                          {/* Logo image */}
                          <img
                            src={experiment.logo}
                            alt=""
                            className="w-12 h-12 md:w-14 md:h-14 object-contain relative z-10 group-hover:scale-110 transition-transform duration-500"
                          />
                        </div>

                        {/* Card text content */}
                        <div className="flex-1 min-w-0 text-center md:text-left">
                          <div className="mb-1 text-xs font-mono text-accent/80 tracking-wide uppercase">
                            {experiment.subtitle}
                          </div>
                          
                          <h3 className="text-xl md:text-2xl font-sans font-bold text-primary group-hover:text-accent transition-colors duration-300 mb-2">
                            {experiment.title}
                          </h3>
                          
                          <p className="text-sm md:text-md font-mono text-secondary mb-4 group-hover:text-primary transition-colors duration-300">
                            {experiment.description}
                          </p>
                          
                          {/* Animated button/tag */}
                          <div className="inline-flex items-center text-accent bg-accent/5 border border-accent/10 px-3 py-1.5 rounded-full group-hover:bg-accent/10 group-hover:border-accent/20 transition-all duration-300">
                            <span className="text-sm font-mono">Explore</span>
                            <ChevronRight className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                          </div>
                        </div>
                      </div>
                      
                      {/* Decorative elements - subtle corner accents */}
                      <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none overflow-hidden">
                        <div className="absolute top-0 right-0 w-6 h-6 translate-x-3 -translate-y-3 bg-accent/5 rounded-full group-hover:bg-accent/10 group-hover:scale-150 transition-all duration-700"></div>
                      </div>
                      <div className="absolute bottom-0 left-0 w-16 h-16 pointer-events-none overflow-hidden">
                        <div className="absolute bottom-0 left-0 w-6 h-6 -translate-x-3 translate-y-3 bg-accent/5 rounded-full group-hover:bg-accent/10 group-hover:scale-150 transition-all duration-700"></div>
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
                className="group inline-flex items-center justify-center px-6 py-3 bg-surface/30 hover:bg-surface/50 text-primary font-bold rounded-lg transition-all duration-300 border border-subtle hover:border-accent/30 backdrop-blur-sm hover:shadow-sm hover:shadow-accent/5"
              >
                View all experiments
                <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
        
        {/* Footer Banner */}
        <div className="px-4 py-12 md:py-20 relative overflow-hidden">
          {/* Background elements for footer */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-accent/5 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent"></div>
          
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <h2 className="text-2xl md:text-3xl font-sans font-bold mb-4 animate-text-shine">Contribute to the Lab</h2>
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