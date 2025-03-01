import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

interface ExperimentCard {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  logo: string;
  href: string;
  color: string;
}

const experiments: ExperimentCard[] = [
  {
    id: 'xatu',
    title: 'Xatu',
    subtitle: 'Node monitoring and network analysis',
    description: 'Explore node distribution, network health, and community contributions across Ethereum networks.',
    logo: '/xatu.png',
    href: '/xatu',
    color: 'from-primary/20 via-accent/20 to-error/20'
  },
  {
    id: 'beacon-chain',
    title: 'Beacon Chain',
    subtitle: 'Ethereum consensus layer analysis',
    description: 'Analyze slots, block timing, network performance, and consensus metrics on the Ethereum beacon chain.',
    logo: '/ethereum.png',
    href: '/beacon',
    color: 'from-accent/20 via-accent-secondary/20 to-error/20'
  },
];

function Experiments(): JSX.Element {
  return (
    <div className="min-h-[calc(100vh-10rem)] flex flex-col">
      {/* Hero Section */}
      <div className="relative mb-8">
        <div className="relative backdrop-blur-md bg-surface/80 border border-subtle rounded-lg p-6 md:p-8 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent" />
          <div className="relative">
            <h1 className="text-3xl md:text-4xl font-sans font-bold text-primary mb-3">
              Experiments
            </h1>
            <p className="text-base md:text-lg font-mono text-secondary max-w-3xl">
              Explore our collection of experimental tools and visualizations for Ethereum network analysis.
            </p>
          </div>
        </div>
      </div>

      {/* Experiments Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl">
        {experiments.map((experiment) => (
          <Link
            key={experiment.id}
            to={experiment.href}
            className="group relative backdrop-blur-md bg-surface/80 border border-subtle hover:border-accent rounded-lg overflow-hidden transition-all duration-300"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent bg-opacity-0 group-hover:bg-opacity-100 transition-colors duration-300" />
            
            <div className="relative p-6">
              <div className="flex items-start gap-4">
                <div className="relative w-12 h-12 flex-shrink-0">
                  <div className="absolute inset-0 opacity-50 blur-xl">
                    <img src={experiment.logo} alt="" className="w-full h-full object-contain" />
                  </div>
                  <img 
                    src={experiment.logo} 
                    alt="" 
                    className="relative w-full h-full object-contain group-hover:scale-110 transition-transform duration-300"
                    style={{ 
                      filter: experiment.id === 'xatu' 
                        ? 'drop-shadow(0 0 2px rgba(255, 255, 255, 1)) drop-shadow(0 0 4px rgba(255, 255, 255, 0.8)) drop-shadow(0 0 6px rgba(0, 255, 159, 0.5))'
                        : 'drop-shadow(0 0 12px rgba(0, 255, 159, 0.5))'
                    }}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-sans font-bold text-primary group-hover:text-accent transition-colors mb-1">
                    {experiment.title}
                  </h2>
                  <p className="text-sm font-mono text-tertiary truncate">
                    {experiment.subtitle}
                  </p>
                </div>

                <ArrowRight className="w-5 h-5 text-accent/50 group-hover:text-accent group-hover:translate-x-1 transition-all duration-300" />
              </div>

              <p className="text-sm font-mono text-secondary group-hover:text-primary/90 transition-colors mt-4">
                {experiment.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default Experiments; 