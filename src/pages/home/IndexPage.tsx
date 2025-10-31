import { type JSX } from 'react';
import { Link } from '@tanstack/react-router';
import { Card } from '@/components/Layout/Card';
import { BeakerIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { AlgorithmicArt } from './components/AlgorithmicArt';

export function IndexPage(): JSX.Element {
  return (
    <div className="relative h-[calc(100dvh-65px)] overflow-hidden lg:h-screen">
      {/* Full-page Network Visualization - fills viewport */}
      <div className="absolute inset-0 z-0">
        <AlgorithmicArt height={typeof window !== 'undefined' ? window.innerHeight : 800} seed={12345} speed={1} />
      </div>

      {/* Content Layer - positioned on top of visualization */}
      <div className="absolute inset-0 z-20 overflow-y-auto">
        <div className="flex min-h-full flex-col px-4 pt-20 sm:pt-40">
          {/* Hero Section - centered and spacious */}
          <div className="mb-16 flex flex-col items-center text-center sm:mb-48">
            {/* Main Title - matching sidebar style */}
            <h1 className="mb-4 animate-fade-in font-sans text-5xl font-bold tracking-tight text-foreground drop-shadow-2xl sm:mb-6 sm:text-7xl md:text-8xl lg:text-9xl">
              The Lab
            </h1>

            {/* Subtitle with subtle animation */}
            <p className="max-w-xl animate-fade-in-delay font-sans text-base font-light tracking-wide text-foreground/80 drop-shadow-lg sm:text-lg md:text-sm">
              by ethPandaOps
            </p>

            {/* Optional tagline */}
            <p className="mt-3 animate-fade-in-delay-2 font-sans text-xs font-light tracking-widest text-muted/60 uppercase sm:mt-4 sm:text-sm">
              Explore · Analyze · Discover
            </p>
          </div>

          {/* Featured Cards - cleaner spacing */}
          <div className="mx-auto grid w-full max-w-5xl animate-fade-in-delay-3 gap-6 pb-16 sm:grid-cols-2 sm:gap-8 sm:pb-32">
            {/* Ethereum Live */}
            <Link to="/ethereum/live" className="group block">
              <Card
                isInteractive
                rounded
                className="h-full bg-surface/95 backdrop-blur-md transition-all duration-300 hover:bg-surface"
              >
                <div className="flex flex-col gap-4">
                  <BeakerIcon className="size-10 text-primary transition-transform duration-300 group-hover:scale-110" />
                  <h3 className="font-mono text-xl font-semibold tracking-tight text-foreground">Ethereum Live</h3>
                  <p className="text-base/relaxed text-muted">
                    Visualize beacon chain slots and block proposals in real-time
                  </p>
                </div>
              </Card>
            </Link>

            {/* Xatu Contributors */}
            <Link to="/xatu/contributors" className="group block">
              <Card
                isInteractive
                rounded
                className="h-full bg-surface/95 backdrop-blur-md transition-all duration-300 hover:bg-surface"
              >
                <div className="flex flex-col gap-4">
                  <UserGroupIcon className="size-10 text-primary transition-transform duration-300 group-hover:scale-110" />
                  <h3 className="font-mono text-xl font-semibold tracking-tight text-foreground">Xatu Contributoors</h3>
                  <p className="text-base/relaxed text-muted">Explore the contributors to the Xatu project</p>
                </div>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
