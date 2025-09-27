import { Link } from '@tanstack/react-router';
import {
  ArrowRight,
  Activity,
  Search,
  Layers,
  Globe,
  Users,
  MapPin,
  GitBranch,
  Network,
} from 'lucide-react';
import { FaEthereum } from 'react-icons/fa';
import { Card, CardBody } from '@/components/common/Card';
import { useNetwork, useConfig } from '@/stores/appStore';

interface ExperimentItem {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ElementType;
  href: string;
  category: 'xatu' | 'beacon';
}

const experiments: ExperimentItem[] = [
  // Xatu overview
  {
    id: 'xatu-overview',
    title: 'Xatu Overview',
    subtitle: 'Node monitoring & analysis',
    description:
      'Explore node distribution, network health, and community contributions across Ethereum networks',
    icon: Globe,
    href: '/xatu-data',
    category: 'xatu',
  },
  {
    id: 'xatu-contributors',
    title: 'Contributors',
    subtitle: 'Community node operators',
    description: 'Track node operators and their contributions to network health',
    icon: Users,
    href: '/xatu-data/contributors',
    category: 'xatu',
  },
  {
    id: 'xatu-networks',
    title: 'Networks',
    subtitle: 'Multi-network monitoring',
    description: 'Monitor node distribution across different Ethereum networks',
    icon: Network,
    href: '/xatu-data/networks',
    category: 'xatu',
  },
  {
    id: 'xatu-geographical',
    title: 'Geographical Checklist',
    subtitle: 'Geographic distribution',
    description: 'Analyze geographical diversity of nodes across the network',
    icon: MapPin,
    href: '/xatu-data/geographical-checklist',
    category: 'xatu',
  },
  {
    id: 'xatu-fork-readiness',
    title: 'Fork Readiness',
    subtitle: 'Network upgrade status',
    description: 'Check client versions and network readiness for upcoming forks',
    icon: GitBranch,
    href: '/xatu-data/fork-readiness',
    category: 'xatu',
  },
  // Beacon Chain experiments
  {
    id: 'beacon-live',
    title: 'Live Slots',
    subtitle: 'Real-time slot monitoring',
    description: 'Watch slots as they happen in real-time with detailed metrics',
    icon: Activity,
    href: '/beacon/slot/live',
    category: 'beacon',
  },
  {
    id: 'beacon-historical',
    title: 'Historical Slots',
    subtitle: 'Look up past slots',
    description: 'Search for specific slots by number and analyze historical data',
    icon: Search,
    href: '/beacon/slot',
    category: 'beacon',
  },
  {
    id: 'beacon-production',
    title: 'Block Production Flow',
    subtitle: 'Production visualization',
    description: 'Visualize the entire Ethereum block production process in real-time',
    icon: FaEthereum,
    href: '/beacon/block-production/live',
    category: 'beacon',
  },
  {
    id: 'beacon-local-blocks',
    title: 'Locally Built Blocks',
    subtitle: 'Block production analysis',
    description: 'Explore blocks built by validators with detailed metrics',
    icon: Layers,
    href: '/beacon/locally-built-blocks',
    category: 'beacon',
  },
];

function Experiments(): React.ReactElement {
  const { selectedNetwork } = useNetwork();
  const { config } = useConfig();

  // Filter experiments based on selected network
  const availableExperimentIds = new Set<string>();
  if (config?.experiments) {
    config.experiments.forEach(exp => {
      if (exp.enabled && exp.networks?.includes(selectedNetwork)) {
        availableExperimentIds.add(exp.id);
      }
    });
  }

  // Map our experiment IDs to the ones from config
  const experimentIdMapping: Record<string, string> = {
    'xatu-overview': 'xatu-overview',
    'beacon-live': 'live-slots',
    'beacon-historical': 'historical-slots',
    'beacon-production': 'block-production-flow',
    'beacon-local-blocks': 'locally-built-blocks',
  };

  // Contributor experiments that are enabled by the "contributoors" config
  const contributorExperiments = new Set([
    'xatu-contributors',
    'xatu-networks',
    'xatu-geographical',
    'xatu-fork-readiness',
  ]);

  // Filter based on available experiments for this network
  const filteredExperiments = experiments.filter(e => {
    // If no config available, show all experiments (backward compatibility)
    if (!config?.experiments || config.experiments.length === 0) {
      return true;
    }

    // Check if this is a contributor experiment
    if (contributorExperiments.has(e.id)) {
      return availableExperimentIds.has('contributoors');
    }

    // For other experiments, use direct mapping
    const mappedId = experimentIdMapping[e.id];
    return mappedId && availableExperimentIds.has(mappedId);
  });

  const xatuExperiments = filteredExperiments.filter(e => e.category === 'xatu');
  const beaconExperiments = filteredExperiments.filter(e => e.category === 'beacon');

  return (
    <div className="min-h-[calc(100vh-10rem)] flex flex-col">
      {/* Compact Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-sans font-bold text-primary mb-2">Experiments</h1>
        <p className="text-sm md:text-base font-mono text-secondary">
          Explore our collection of experimental tools and visualizations for Ethereum network
          analysis
        </p>
      </div>

      {/* Show message if no experiments available for this network */}
      {filteredExperiments.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg font-mono text-secondary mb-2">
              No experiments available for {selectedNetwork}
            </p>
            <p className="text-sm font-mono text-tertiary">
              Switch to a different network to see available experiments
            </p>
          </div>
        </div>
      ) : (
        /* Two Column Layout for Experiments */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Xatu Column */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img src="/xatu.png" alt="Xatu" className="w-8 h-8" />
              <h2 className="text-xl font-sans font-bold text-primary">Xatu</h2>
            </div>
            <div className="space-y-4">
              {xatuExperiments.length > 0 ? (
                xatuExperiments.map(experiment => (
                  <Card key={experiment.id} isInteractive className="relative">
                    <Link to={experiment.href} className="block w-full">
                      <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                      <CardBody className="relative">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                            {experiment.id === 'xatu-overview' ? (
                              <img src="/xatu.png" alt="Xatu" className="w-4 h-4" />
                            ) : (
                              <experiment.icon className="w-4 h-4 text-accent" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-sans font-bold text-primary group-hover:text-accent transition-colors mb-0.5">
                              {experiment.title}
                            </h3>
                            <p className="text-xs font-mono text-tertiary truncate">
                              {experiment.subtitle}
                            </p>
                          </div>

                          <ArrowRight className="w-4 h-4 text-accent/50 group-hover:text-accent group-hover:translate-x-1 transition-all duration-300 mt-1" />
                        </div>

                        <p className="text-xs font-mono text-secondary group-hover:text-primary/90 transition-colors mt-3 line-clamp-2">
                          {experiment.description}
                        </p>
                      </CardBody>
                    </Link>
                  </Card>
                ))
              ) : (
                <div className="p-6 rounded-lg border border-dashed border-subtle bg-surface/10">
                  <p className="text-sm font-mono text-secondary text-center">
                    No Xatu experiments available for {selectedNetwork}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Beacon Chain Column */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <FaEthereum className="w-8 h-8 text-accent/80" />
              <h2 className="text-xl font-sans font-bold text-primary">Beacon Chain</h2>
            </div>
            <div className="space-y-4">
              {beaconExperiments.length > 0 ? (
                beaconExperiments.map(experiment => (
                  <Card key={experiment.id} isInteractive className="relative">
                    <Link to={experiment.href} className="block w-full">
                      <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                      <CardBody className="relative">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                            <experiment.icon className="w-4 h-4 text-accent" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-sans font-bold text-primary group-hover:text-accent transition-colors mb-0.5">
                              {experiment.title}
                            </h3>
                            <p className="text-xs font-mono text-tertiary truncate">
                              {experiment.subtitle}
                            </p>
                          </div>

                          <ArrowRight className="w-4 h-4 text-accent/50 group-hover:text-accent group-hover:translate-x-1 transition-all duration-300 mt-1" />
                        </div>

                        <p className="text-xs font-mono text-secondary group-hover:text-primary/90 transition-colors mt-3 line-clamp-2">
                          {experiment.description}
                        </p>
                      </CardBody>
                    </Link>
                  </Card>
                ))
              ) : (
                <div className="p-6 rounded-lg border border-dashed border-subtle bg-surface/10">
                  <p className="text-sm font-mono text-secondary text-center">
                    No Beacon Chain experiments available for {selectedNetwork}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Coming Soon Section */}
      <div className="mt-8">
        <div className="p-6 rounded-lg border border-dashed border-subtle bg-surface/20">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-sans font-bold text-primary mb-1">
                More Experiments Coming Soon
              </h3>
              <p className="text-sm font-mono text-secondary">
                We're actively developing new tools for network analysis and monitoring
              </p>
            </div>
            <div className="text-3xl opacity-20">🚀</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Experiments;
