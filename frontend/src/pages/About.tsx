import { Github, ExternalLink } from 'lucide-react'

export const About = () => {
  return (
    <div className="space-y-8 max-w-6xl mx-auto px-4">
      <div className="backdrop-blur-md rounded-xl p-4 md:p-8">
        <div className="space-y-8">
          {/* About The Lab */}
          <div>
            <h2 className="text-3xl md:text-4xl font-black text-primary tracking-tight mb-4">About The Lab</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-base md:text-lg text-primary">
                The Lab is an experimental platform that provides insights into Ethereum.
                Here we present data and visualizations that we've collected. All of our data is public and open source.
              </p>
            </div>
          </div>

          {/* About ethPandaOps */}
          <div>
            <h2 className="text-3xl md:text-4xl font-black text-primary tracking-tight mb-4">About ethPandaOps</h2>
            <p className="text-base md:text-lg text-primary mb-6">
              Check out our main website for more information:
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="https://ethpandaops.io"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-6 py-3 text-base font-medium text-primary bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/50 rounded-lg transition-all hover:scale-105"
              >
                <ExternalLink className="h-5 w-5 mr-2" />
                Visit ethPandaOps
              </a>
              <a
                href="https://github.com/ethpandaops"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-6 py-3 text-base font-medium text-primary hover:text-primary rounded-lg transition-all hover:scale-105"
              >
                <Github className="h-5 w-5 mr-2" />
                View Our Projects
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 