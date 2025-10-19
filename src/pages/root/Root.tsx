import { Link } from '@tanstack/react-router';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/solid';
import { BoltIcon } from '@heroicons/react/24/outline';
import { ArrowRightIcon } from '@heroicons/react/20/solid';
import { useEffect, useState, useRef, type JSX } from 'react';
import { FeatureCard } from '@/components/Layout/FeatureCard';

// Featured experiments with dummy links
const featuredExperiments = [
  {
    id: 'block-production',
    title: 'Block Production Flow',
    subtitle: 'Beacon Chain',
    description: 'Visualize the entire Ethereum block production process in real-time.',
    logo: '/images/ethereum.png',
    href: '/experiments/block-production-flow',
    accentColor: {
      light: 'rgba(34, 211, 238, 0.05)',
      medium: 'rgba(34, 211, 238, 0.15)',
    },
  },
  {
    id: 'beacon-chain',
    title: 'Slot Explorer',
    subtitle: 'Beacon Chain',
    description: 'Explore live slot data.',
    logo: '/images/ethereum.png',
    href: '/experiments/live-slots',
    accentColor: {
      light: 'rgba(56, 189, 248, 0.05)',
      medium: 'rgba(56, 189, 248, 0.15)',
    },
  },
];

const networkTerms = ['Ethereum', 'Consensus Layer', 'Execution Layer', 'Beacon Chain'];

export function Root(): JSX.Element {
  const [animatedText, setAnimatedText] = useState('Ethereum');
  const [isTransitioning, setIsTransitioning] = useState(false);
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
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Smooth scrolling for in-page links
  useEffect(() => {
    const handleSmoothScroll = (e: MouseEvent): void => {
      const target = e.target as HTMLElement;

      if (target.tagName === 'A' && target.getAttribute('href')?.startsWith('#')) {
        e.preventDefault();
        const href = target.getAttribute('href');
        if (href) {
          const element = document.querySelector(href);
          element?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        }
      }
    };

    document.addEventListener('click', handleSmoothScroll);
    return () => document.removeEventListener('click', handleSmoothScroll);
  }, []);

  return (
    <div className="-mx-10 -my-2">
      <div className="relative p-4 md:p-6 lg:p-8">
        <div className="flex w-full flex-col" ref={containerRef}>
          {/* Dynamic background elements with reduced intensity */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 h-64 w-64 animate-pulse-slow rounded-full bg-accent/15 blur-3xl filter"></div>
            <div className="absolute right-1/4 bottom-1/4 h-64 w-64 animate-pulse-slow rounded-full bg-error/15 blur-3xl filter delay-1000"></div>
            <div className="absolute top-2/3 left-1/3 h-40 w-40 animate-pulse-slow rounded-full bg-cyber-cyan/10 blur-3xl filter"></div>
            <div className="bg-cyber-grid bg-cyber absolute inset-0"></div>
            <div className="bg-scanlines absolute inset-0 opacity-[0.03]"></div>
            <div className="bg-noise absolute inset-0 opacity-[0.015]"></div>
          </div>

          {/* Main content container with flex layout */}
          <div className="relative z-10 flex flex-col">
            {/* Hero Section */}
            <div className="flex items-center justify-center py-16 md:py-24">
              <div className="mx-auto max-w-6xl px-4 text-center">
                {/* Decorative elements */}
                <div className="mb-8 flex justify-center">
                  <div className="relative size-60">
                    <div className="absolute inset-0 animate-pulse-slow rounded-full bg-accent/20"></div>
                    <div className="absolute inset-2 rounded-full border border-accent/30"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <img src="/images/ethpandaops.png" alt="Ethereum" className="w-32" />
                    </div>
                  </div>
                </div>

                {/* Main Title with enhanced animated effect */}
                <div className="relative mb-6">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-px w-full bg-linear-to-r from-transparent via-accent/30 to-transparent"></div>
                  </div>
                  <div className="relative">
                    <h1 className="mb-2 font-sans text-5xl font-black text-primary md:text-6xl lg:text-7xl">The Lab</h1>
                    <div className="mx-auto h-1 w-32 rounded-full bg-linear-to-r from-accent/50 to-error/50"></div>
                  </div>
                </div>

                {/* Description with fixed-width animated text */}
                <p className="mx-auto mb-8 max-w-2xl font-mono text-lg/7 text-secondary md:text-xl/8">
                  Experimental tools for{' '}
                  <span
                    ref={textContainerRef}
                    className="relative inline-block align-middle"
                    style={{ minHeight: '1.5em', textAlign: 'center' }}
                  >
                    <span
                      className={`absolute right-0 left-0 flex items-center justify-center transition-all duration-300 ease-in-out ${isTransitioning ? 'translate-y-1 opacity-0' : 'translate-y-0 opacity-100'}`}
                    >
                      <span className="font-bold text-accent">{animatedText}</span>
                    </span>
                    <span className="absolute bottom-0 left-0 h-px w-full bg-accent/50"></span>
                  </span>{' '}
                  network analysis
                </p>

                {/* CTA Buttons with enhanced styling */}
                <div className="mb-8 flex flex-wrap justify-center gap-4">
                  <Link
                    to="/explore"
                    className="group text-accent-foreground hover:bg-accent-hover inline-flex items-center justify-center rounded-lg bg-accent px-6 py-3 font-bold transition-all duration-300 hover:-translate-y-1 hover:shadow-neon"
                  >
                    Explore All
                    <ArrowRightIcon className="ml-2 size-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>

                  <a
                    href="https://github.com/ethpandaops/lab"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group border-default hover:border-default inline-flex items-center justify-center rounded-lg border bg-surface/50 px-6 py-3 font-bold text-primary backdrop-blur-sm transition-all duration-300 hover:bg-surface/70"
                  >
                    GitHub
                    <ArrowTopRightOnSquareIcon className="ml-2 size-4 transition-transform duration-300 group-hover:rotate-12" />
                  </a>
                </div>
              </div>
            </div>

            {/* Featured Experiments Section */}
            <div className="relative overflow-hidden bg-linear-to-b from-transparent px-4 py-12 md:py-16">
              {/* Subtle background patterns */}
              <div className="bg-grid-pattern pointer-events-none absolute inset-0 opacity-[0.03]"></div>
              <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-accent/30 to-transparent"></div>
              <div className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-accent/30 to-transparent"></div>

              <div className="relative mx-auto max-w-6xl">
                {/* Section Header with enhanced styling */}
                <div className="mb-10 text-center">
                  <div className="relative mx-auto mb-4 inline-flex size-20 items-center justify-center">
                    <div className="absolute inset-0 rounded-full bg-accent/10"></div>
                    <div className="absolute inset-0 animate-pulse-slow rounded-full bg-linear-to-br from-accent/20 to-transparent"></div>
                    <BoltIcon className="relative z-10 size-10 text-accent" />
                  </div>
                  <h2 className="mb-3 font-sans text-3xl font-bold md:text-4xl">
                    <span className="bg-linear-to-r from-accent to-accent bg-clip-text text-transparent">
                      Featured Experiments
                    </span>
                  </h2>
                </div>

                {/* Featured Cards Grid - Using the FeatureCard component */}
                <div className="mb-12 grid grid-cols-1 gap-8 md:grid-cols-2">
                  {featuredExperiments.map(experiment => (
                    <FeatureCard
                      key={experiment.id}
                      id={experiment.id}
                      title={experiment.title}
                      subtitle={experiment.subtitle}
                      description={experiment.description}
                      logo={experiment.logo}
                      href={experiment.href}
                      accentColor={experiment.accentColor}
                    />
                  ))}
                </div>

                {/* View All Link with enhanced styling */}
                <div className="text-center">
                  <Link
                    to="/explore"
                    className="group border-default inline-flex items-center justify-center rounded-lg border bg-surface/30 px-6 py-3 font-bold text-primary backdrop-blur-sm transition-all duration-300 hover:border-accent/30 hover:bg-surface/50 hover:shadow-sm hover:shadow-accent/5"
                  >
                    View all experiments
                    <ArrowRightIcon className="ml-2 size-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Footer Banner */}
            <div className="relative overflow-hidden px-4 py-12 md:py-20">
              {/* Background elements for footer */}
              <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-transparent to-accent/5"></div>
              <div className="absolute bottom-0 left-0 h-px w-full bg-linear-to-r from-transparent via-accent/20 to-transparent"></div>

              <div className="relative z-10 mx-auto max-w-4xl text-center">
                <h2 className="mb-4 font-sans text-2xl font-bold md:text-3xl">Contribute to the Lab</h2>
                <p className="mx-auto mb-8 max-w-2xl font-mono text-lg/7 text-secondary">
                  Contribute to our open-source tools and help advance Ethereum network analysis
                </p>
                <a
                  href="https://github.com/ethpandaops/lab"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-foreground hover:bg-accent-hover inline-flex items-center justify-center rounded-lg bg-accent px-8 py-4 font-bold transition-all duration-300 hover:-translate-y-1 hover:shadow-neon"
                >
                  Get Involved
                  <ArrowTopRightOnSquareIcon className="ml-2 size-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
