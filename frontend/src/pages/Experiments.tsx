import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Card, CardBody } from '../components/common/Card'

interface ExperimentCard {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  logo: string;
  href: string;
  color: string;
  features?: { title: string; href: string }[]
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
    color: 'from-accent/20 via-accent-secondary/20 to-error/20',
    features: [
      { title: 'Locally Built Blocks', href: '/beacon/locally-built-blocks' }
    ]
  },
];

function Experiments(): JSX.Element {
  return (
    <div className="min-h-[calc(100vh-10rem)] flex flex-col">
      {/* Hero Section */}
      <div className="relative mb-8">
        <Card isPrimary className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent" />
          <CardBody className="relative">
            <h1 className="text-3xl md:text-4xl font-sans font-bold text-primary mb-3">
              Experiments
            </h1>
            <p className="text-base md:text-lg font-mono text-secondary max-w-3xl">
              Explore our collection of experimental tools and visualizations for Ethereum network analysis.
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Experiments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {experiments.map((experiment) => (
          <Card key={experiment.id} isInteractive className="relative">
            <Link to={experiment.href} className="block w-full h-full">
              <div className={`absolute inset-0 bg-gradient-to-br ${experiment.color} opacity-0 group-hover:opacity-100 transition-opacity`} />
              
              <CardBody className="relative flex flex-col h-full">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 flex items-center justify-center flex-shrink-0 relative">
                    <div className={`absolute inset-0 bg-gradient-to-br ${experiment.color} blur-md rounded-full`} />
                    <img 
                      src={experiment.logo} 
                      alt="" 
                      className="w-10 h-10 object-contain relative z-10 group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-sans font-bold text-primary group-hover:text-accent transition-colors mb-1">
                      {experiment.title}
                    </h3>
                    <p className="text-sm font-mono text-tertiary truncate">
                      {experiment.subtitle}
                    </p>
                  </div>
                </div>

                <p className="text-sm font-mono text-secondary group-hover:text-primary/90 transition-colors mb-4">
                  {experiment.description}
                </p>
                
                {experiment.features && experiment.features.length > 0 && (
                  <div className="mt-auto">
                    <h4 className="text-xs font-mono text-tertiary mb-2">Featured Components</h4>
                    <ul className="space-y-2">
                      {experiment.features.map((feature, index) => (
                        <li key={index}>
                          <Link 
                            to={feature.href} 
                            className="flex items-center justify-between p-2 rounded bg-surface/40 hover:bg-surface/70 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="text-sm font-mono text-primary">{feature.title}</span>
                            <ArrowRight className="w-4 h-4 text-accent/50 group-hover:text-accent transition-colors" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardBody>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default Experiments; 