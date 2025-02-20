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
    color: 'from-primary/20 via-accent/20 to-error/20',
  },
  {
    id: 'beacon-chain',
    title: 'Beacon Chain',
    subtitle: 'Ethereum consensus layer analysis',
    description: 'Analyze block timing, network performance, and consensus metrics on the Ethereum beacon chain.',
    logo: '/ethereum.png',
    href: '/beacon-chain-timings',
    color: 'from-accent/20 via-accent-secondary/20 to-error/20',
  },
];

function Experiments(): JSX.Element {
  return (
    <div className="min-h-[calc(100vh-10rem)] flex flex-col">
      {/* Experiments Grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 content-start auto-rows-min">
        {experiments.map((experiment) => (
          <Link
            key={experiment.id}
            to={experiment.href}
            className="group relative backdrop-blur-sm   -default hover:-primary/40 bg-surface/50 hover:bg-hover p-6 hover:transform hover:translate-y-[-2px] transition-all duration-300"
          >
            <div className="flex gap-4">
              {/* Logo */}
              <div className="relative w-14 h-14 flex-shrink-0">
                <div className="absolute inset-0 opacity-50 blur-lg">
                  <img src={experiment.logo} alt="" className="w-full h-full object-contain" />
                </div>
                <img 
                  src={experiment.logo} 
                  alt="" 
                  className="relative w-full h-full object-contain"
                  style={{ 
                    filter: experiment.id === 'xatu' 
                      ? 'drop-shadow(0 0 2px rgba(255, 255, 255, 1)) drop-shadow(0 0 4px rgba(255, 255, 255, 0.8)) drop-shadow(0 0 6px rgba(0, 255, 159, 0.5))'
                      : 'drop-shadow(0 0 12px rgba(0, 255, 159, 0.5))'
                  }}
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-sans font-bold text-primary group-hover:text-accent transition-colors truncate">
                  {experiment.title}
                </h2>
                <p className="text-base font-mono text-tertiary truncate">
                  {experiment.subtitle}
                </p>
              </div>
            </div>

            {/* Description */}
            <p className="text-sm font-mono text-primary/60 mt-4 mb-8">
              {experiment.description}
            </p>

            {/* Arrow */}
            <div className="absolute bottom-6 right-6">
              <ArrowRight className="w-6 h-6 text-muted group-hover:text-accent group-hover:translate-x-1 transition-all duration-300" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default Experiments; 