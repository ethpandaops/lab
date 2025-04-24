import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

function Home(): JSX.Element {
  return (
    // Outer container to fill viewport height below header and center content
    <div className="min-h-[calc(100vh-56px)] w-full flex items-center justify-center py-12 px-4">
      {/* Centered content container with vertical spacing */}
      <div className="relative flex flex-col items-center justify-center text-center space-y-12 md:space-y-16 lg:space-y-20">
        {/* Hero Title */}
        <div className="relative">
          {/* Subtle horizontal line effect */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3/4 h-px bg-gradient-to-r from-transparent via-primary/10 to-transparent" />
          </div>
          {/* Title text positioned above the line */}
          <div className="relative px-4 bg-base">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-sans font-black text-primary animate-text-shine">
              The Lab
            </h1>
          </div>
        </div>

        {/* Description */}
        <p className="text-lg md:text-xl font-mono text-secondary max-w-md">
          Let the pandas cook
        </p>

        {/* Enter Link/Button */}
        <Link
          to="/experiments"
          className="group inline-flex items-center justify-center px-8 py-3 bg-accent hover:bg-accent-hover text-accent-foreground font-bold rounded-lg transition-colors duration-300 text-lg shadow-lg hover:shadow-accent/30 transform hover:-translate-y-1"
        >
          Enter
          <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}

export default Home;