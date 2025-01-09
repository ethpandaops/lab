import { Github, ExternalLink } from 'lucide-react'

export const About = () => {
  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold text-white">About The Lab</h2>

      <div className="prose prose-invert max-w-none">
        <p className="text-lg text-gray-300">
          The Lab is an experimental platform that provides insights into Ethereum.
          Here we present data and visualizations that we've collected. All of our data is public and open source.
        </p>
      </div>

      <h2 className="mt-8 text-white">About ethPandaOps</h2>
      <p className="text-gray-300">
        Check out our main website for more information:
      </p>

      <div className="flex flex-col sm:flex-row gap-4 mt-8">
        <a
          href="https://ethpandaops.io"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center px-6 py-3 text-base font-medium text-white bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/50 rounded-lg transition-all hover:scale-105"
        >
          <ExternalLink className="h-5 w-5 mr-2" />
          Visit ethPandaOps
        </a>
        <a
          href="https://github.com/ethpandaops"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center px-6 py-3 text-base font-medium text-gray-300 hover:text-white bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-lg transition-all hover:scale-105"
        >
          <Github className="h-5 w-5 mr-2" />
          View Our Projects
        </a>
      </div>
    </div>
  )
} 