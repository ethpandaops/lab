import { Github, ExternalLink, Users, Zap, Search } from 'lucide-react';

export const About = () => {
  return (
    <div className="max-w-6xl mx-auto space-y-12">
      {/* Hero Section */}
      <section className="text-center py-12 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/5 via-transparent to-transparent rounded-xl pointer-events-none" />
        <div className="relative">
          <div className="inline-flex items-center justify-center w-20 h-20 mb-6 bg-accent/10 rounded-full border border-accent/30 p-3">
            <img
              src="/ethpandaops.png"
              alt="ethPandaOps logo"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-4xl md:text-5xl font-sans font-bold text-primary mb-4">The Lab</h1>
          <p className="text-lg font-mono text-secondary max-w-2xl mx-auto">
            An experimental platform providing deep insights into Ethereum through open data and
            powerful visualizations
          </p>
        </div>
      </section>

      {/* ethPandaOps Section */}
      <section className="space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center text-4xl mb-4">🐼</div>
          <h2 className="text-2xl font-sans font-bold text-primary mb-4">Built by ethPandaOps</h2>
          <p className="text-base font-mono text-secondary max-w-2xl mx-auto">
            We're a team of DevOps engineers dedicated to supporting Ethereum through
            infrastructure, tooling, and research. Our work spans testnets, monitoring, and protocol
            testing.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: 'Infrastructure',
              description: 'Running and maintaining Ethereum testnets and infrastructure',
              icon: Zap,
            },
            {
              title: 'Research',
              description: 'Analyzing network behavior and performance metrics',
              icon: Search,
            },
            {
              title: 'Community',
              description: 'Supporting the ecosystem with tools and documentation',
              icon: Users,
            },
          ].map((item, index) => (
            <div key={index} className="bg-surface/30 rounded-lg p-6 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 mb-4 bg-surface/70 rounded-lg">
                <item.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-sans font-semibold text-primary mb-2">{item.title}</h3>
              <p className="text-sm font-mono text-tertiary">{item.description}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="https://ethpandaops.io"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center justify-center px-6 py-3 font-mono text-primary bg-accent/10 hover:bg-accent/20 border border-accent/30 rounded-lg transition-all duration-300 hover:scale-105"
          >
            <ExternalLink className="h-5 w-5 mr-2 text-accent" />
            Visit ethPandaOps
          </a>
          <a
            href="https://github.com/ethpandaops"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center justify-center px-6 py-3 font-mono text-primary bg-surface/50 hover:bg-surface/70 border border-subtle rounded-lg transition-all duration-300 hover:scale-105"
          >
            <Github className="h-5 w-5 mr-2 text-tertiary group-hover:text-primary transition-colors" />
            View Our Projects
          </a>
        </div>
      </section>

      {/* Resources Section */}
      <section className="border-t border-subtle pt-12">
        <h2 className="text-xl font-sans font-bold text-primary mb-6">Resources & Links</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Documentation', href: 'https://ethpandaops.io/docs', icon: ExternalLink },
            { label: 'Twitter', href: 'https://twitter.com/ethpandaops', icon: ExternalLink },
            { label: 'Blog', href: 'https://ethpandaops.io/blog', icon: ExternalLink },
            { label: 'Github', href: 'https://github.com/ethpandaops', icon: ExternalLink },
          ].map((link, index) => (
            <a
              key={index}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 bg-surface/30 hover:bg-surface/50 rounded-lg border border-subtle hover:border-accent/30 transition-all group"
            >
              <span className="text-sm font-mono text-primary">{link.label}</span>
              <link.icon className="h-4 w-4 text-tertiary group-hover:text-accent transition-colors" />
            </a>
          ))}
        </div>
      </section>
    </div>
  );
};
