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
];

function Home(): JSX.Element {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative rounded-2xl overflow-hidden bg-gray-900/80 backdrop-blur-md border border-gray-800">
        <div className="absolute inset-0">
          <img src="/header.png" alt="Header" className="w-full h-full object-cover opacity-50" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/30 via-transparent to-purple-500/30" />
        <div className="relative p-6 md:p-12">
          <div className="text-center md:text-left max-w-4xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">The Lab</h1>
            <p className="text-xl md:text-2xl font-mono text-cyan-400 italic">
              &quot;Let the pandas cook 🐼👨‍🍳&quot;
            </p>
          </div>
        </div>
      </div>

      {/* Experiments Section */}
      <div className="bg-gray-900/80 backdrop-blur-md rounded-xl p-4 md:p-6 border border-gray-800">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
            <Beaker className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Experiments</h3>
            <p className="text-gray-400 text-sm">Explore our experimental features and projects</p>
          </div>
        </div>

        <div className="space-y-12">
          {experimentGroups.map((group) => (
            <div key={group.id} className="space-y-6">
              {/* Group Header */}
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                <div className="w-40 h-40 rounded-2xl bg-gray-900/50 flex items-center justify-center flex-shrink-0 relative group/logo">
                  <div className="relative">
                    <div className="absolute inset-0 w-32 h-32 animate-pulse-slow">
                      <img 
                        src={group.logo} 
                        alt="" 
                        className="w-full h-full object-contain opacity-50 blur-md brightness-200"
                        style={{ filter: 'brightness(2) drop-shadow(0 0 8px rgb(6 182 212 / 1))' }}
                      />
                    </div>
                    <img 
                      src={group.logo} 
                      alt="" 
                      className="relative w-32 h-32 object-contain transition-transform duration-300 group-hover/logo:scale-110"
                      style={{ filter: 'drop-shadow(0 0 4px rgb(6 182 212 / 0.7))' }}
                    />
                  </div>
                </div>
                <div className="flex-1 min-w-0 space-y-4 text-center md:text-left">
                  <div>
                    <h3 className="text-3xl md:text-4xl font-black text-white tracking-tight">{group.title}</h3>
                    <p className="text-gray-400 mt-2 text-base md:text-lg">{group.subtitle}</p>
                  </div>
                  <Link
                    to={group.overview.href}
                    className="group inline-flex items-center gap-3 px-6 py-3 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 hover:border-cyan-500/30 rounded-lg text-cyan-400 font-medium transition-all"
                  >
                    <span>View {group.title}</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>

              {/* Group Links */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {group.links.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    className="group relative bg-gray-800/50 rounded-lg p-4 md:p-6 border border-gray-700 hover:border-cyan-500/50 transition-all"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-cyan-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative">
                      <h3 className="text-lg font-semibold text-cyan-400 mb-2">{link.title}</h3>
                      <p className="text-gray-300">{link.description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Home; 