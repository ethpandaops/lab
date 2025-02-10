import { Link } from 'react-router-dom'
import { Beaker, ArrowRight } from 'lucide-react'

interface ExperimentLink {
  title: string;
  description: string;
  href: string;
}

interface ExperimentGroup {
  id: string;
  title: string;
  subtitle: string;
  logo: string;
  overview: ExperimentLink;
  links: ExperimentLink[];
}

const experimentGroups: ExperimentGroup[] = [
  {
    id: 'xatu',
    title: 'Xatu',
    subtitle: 'Check out the data that the Xatu project is collecting',
    logo: '/xatu.png',
    overview: {
      title: 'Overview',
      description: 'Explore the Xatu project and its data',
      href: '/xatu',
    },
    links: [
      {
        title: 'Community Nodes',
        description: 'Explore the nodes run by the community',
        href: '/xatu/community-nodes',
      },
      {
        title: 'Networks',
        description: 'Check out the networks that Xatu is monitoring',
        href: '/xatu/networks',
      },
      {
        title: 'Contributors',
        description: 'Learn more about those who are contributing to the Xatu project',
        href: '/xatu/contributors',
      },
    ],
  },
  {
    id: 'beacon-chain',
    title: 'Beacon Chain',
    subtitle: 'Analyze Ethereum beacon chain metrics and performance',
    logo: '/ethereum.png',
    overview: {
      title: 'Overview',
      description: 'Explore beacon chain metrics and performance data',
      href: '/beacon-chain-timings',
    },
    links: [
      {
        title: 'Blocks',
        description: 'Analyze block arrival times and network performance',
        href: '/beacon-chain-timings/blocks',
      },
    ],
  },
];

function Home(): JSX.Element {
  return (
    <div className="relative space-y-12 overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-cyber-grid bg-cyber opacity-5" />
      <div className="fixed inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-cyber-darker via-cyber-darker/50 to-cyber-darker" />
      </div>

      {/* Hero Section */}
      <div className="relative -mx-4 sm:-mx-6 lg:-mx-8 -mt-8 flex flex-col items-center justify-center min-h-[40vh] py-16">
        <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative flex flex-col items-center text-center">
            {/* Decorative elements */}
            <div className="absolute -left-4 top-0 w-px h-32 bg-gradient-to-b from-transparent via-cyber-neon/30 to-transparent" />
            <div className="absolute -right-4 top-0 w-px h-32 bg-gradient-to-b from-transparent via-cyber-blue/30 to-transparent" />
            
            <div className="relative inline-flex flex-col items-center">
              <h1 className="text-6xl md:text-7xl lg:text-8xl font-sans font-black mb-8">
                <span className="inline-block bg-gradient-to-r from-cyber-neon via-cyber-blue to-cyber-neon bg-300% bg-clip-text text-transparent">
                  The Lab
                </span>
              </h1>
              
              <div className="group relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-cyber-neon via-cyber-blue to-cyber-neon opacity-10 blur-sm group-hover:opacity-20 transition-opacity duration-500" />
                <p className="relative text-2xl md:text-3xl lg:text-4xl font-mono text-secondary italic px-6 py-2 border border-cyber-neon/20 rounded-lg backdrop-blur-sm group-hover:border-cyber-neon/40 transition-colors duration-500">
                  <span className="group-hover:text-primary transition-colors duration-500">
                    &quot;Let the pandas cook 🐼👨‍🍳&quot;
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom border effect */}
        <div className="absolute bottom-0 left-0 right-0">
          <div className="h-px bg-gradient-to-r from-transparent via-cyber-neon/10 to-transparent" />
          <div className="h-8 bg-gradient-to-b from-cyber-neon/5 to-transparent" />
        </div>
      </div>

      {/* Experiments Section */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="relative flex items-center gap-6 mb-16">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 bg-cyber-neon/10 rounded-lg blur-sm" />
            <div className="relative w-16 h-16 rounded-lg bg-cyber-darker/80 border border-cyber-neon/20 flex items-center justify-center">
              <Beaker className="w-8 h-8 text-cyber-neon" />
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-sans font-bold text-primary">
              <span className="relative">
                Experiments
                <span className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyber-neon/20 to-transparent" />
              </span>
            </h2>
            <p className="text-lg text-secondary font-mono mt-1">Explore our experimental features and projects</p>
          </div>
        </div>

        {/* New Experiment Layout */}
        <div className="relative">
          {experimentGroups.map((group, index) => (
            <div key={group.id} className="relative mb-24 last:mb-0">
              {/* Project Header Card */}
              <div className="relative backdrop-blur-sm bg-cyber-darker/90 rounded-xl border border-cyber-neon/20 overflow-hidden">
                {/* Background Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-cyber-darker via-cyber-darker to-transparent" />
                
                <div className="relative p-8 flex flex-col md:flex-row gap-8 items-center">
                  {/* Logo Section */}
                  <div className="relative shrink-0">
                    <div className="relative w-40 h-40 flex items-center justify-center">
                      {/* Logo Glow Effect */}
                      <div className="absolute inset-0 opacity-50 blur-xl">
                        <img 
                          src={group.logo} 
                          alt="" 
                          className="w-full h-full object-contain"
                          style={{ filter: 'brightness(1.5)' }}
                        />
                      </div>
                      <img 
                        src={group.logo} 
                        alt="" 
                        className="relative w-32 h-32 object-contain"
                        style={{ filter: 'drop-shadow(0 0 20px rgba(0, 255, 159, 0.5))' }}
                      />
                    </div>
                  </div>

                  {/* Content Section */}
                  <div className="flex-1 min-w-0 text-center md:text-left">
                    <h3 className="text-4xl font-sans font-black tracking-tight mb-4">
                      <span className="bg-gradient-to-r from-cyber-neon to-cyber-blue bg-clip-text text-transparent">
                        {group.title}
                      </span>
                    </h3>
                    <p className="text-xl text-secondary font-mono mb-6">{group.subtitle}</p>
                    <Link
                      to={group.overview.href}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-cyber-darker/80 border border-cyber-neon/20 hover:border-cyber-neon/40 rounded-lg text-primary hover:text-accent font-medium transition-all duration-300"
                    >
                      <span>View {group.title}</span>
                      <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Features Grid */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.links.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    className="group relative p-6 backdrop-blur-sm bg-cyber-darker/50 hover:bg-cyber-darker/80 border border-cyber-neon/10 hover:border-cyber-neon/30 rounded-lg transition-all duration-300"
                  >
                    {/* Feature Card Content */}
                    <div className="relative">
                      <h4 className="text-xl font-sans font-semibold text-accent mb-2 group-hover:text-primary transition-colors duration-300">
                        {link.title}
                      </h4>
                      <p className="text-secondary font-mono text-sm group-hover:text-primary/90 transition-colors duration-300">
                        {link.description}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Section Divider (except for last item) */}
              {index !== experimentGroups.length - 1 && (
                <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 w-1/2">
                  <div className="h-px bg-gradient-to-r from-transparent via-cyber-neon/20 to-transparent" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Home; 