import { Github, ExternalLink } from 'lucide-react'

export const About = () => {
  return (
    <div className="space-y-12">
      {/* Page Header */}
      <div className="relative mb-12">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full h-px bg-gradient-to-r from-transparent via-cyber-neon/20 to-transparent" />
        </div>
        <div className="relative flex justify-center">
          <div className="px-4 bg-cyber-darker">
            <h1 className="text-3xl md:text-4xl font-sans font-black bg-gradient-to-r from-cyber-neon via-cyber-blue to-cyber-pink bg-clip-text text-transparent animate-text-shine">
              About
            </h1>
          </div>
        </div>
      </div>

      {/* The Lab Section */}
      <section className="mb-16">
        <h2 className="text-2xl font-sans font-bold text-cyber-neon mb-6">
          The Lab
        </h2>
        <div className="space-y-4">
          <p className="text-base font-mono text-cyber-neon/85">
            The Lab is an experimental platform that provides insights into Ethereum.
            Here we present data and visualizations that we've collected. All of our data is public and open source.
          </p>
        </div>
      </section>

      {/* ethPandaOps Section */}
      <section>
        <h2 className="text-2xl font-sans font-bold text-cyber-neon mb-6">
          ethPandaOps
        </h2>
        <div className="space-y-6">
          <p className="text-base font-mono text-cyber-neon/85">
            Check out our main website for more information:
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href="https://ethpandaops.io"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center justify-center px-6 py-3 font-mono text-cyber-neon backdrop-blur-sm border border-cyber-neon/10 hover:border-cyber-neon/30 hover:bg-cyber-neon/5 rounded-lg transition-all duration-300"
            >
              <ExternalLink className="h-5 w-5 mr-2 text-cyber-neon/70 group-hover:text-cyber-neon transition-colors" />
              Visit ethPandaOps
            </a>
            <a
              href="https://github.com/ethpandaops"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center justify-center px-6 py-3 font-mono text-cyber-neon backdrop-blur-sm border border-cyber-neon/10 hover:border-cyber-neon/30 hover:bg-cyber-neon/5 rounded-lg transition-all duration-300"
            >
              <Github className="h-5 w-5 mr-2 text-cyber-neon/70 group-hover:text-cyber-neon transition-colors" />
              View Our Projects
            </a>
          </div>
        </div>
      </section>
    </div>
  )
} 