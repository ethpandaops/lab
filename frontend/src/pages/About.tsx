import { Github, ExternalLink } from 'lucide-react'

export const About = () => {
  return (
    <div className="space-y-8 max-w-4xl">
      <h2 className="text-2xl font-bold text-white">About The Lab</h2>

      <div className="prose prose-invert max-w-none">
        <p className="text-lg text-gray-300">
          The Lab is an experimental platform that provides insights into Ethereum.
          Here we present data and visualizations that we've collected. All of our data is public and open source.
        </p>
      </div>

      <h2 className="mt-8 text-white">About EthPandaOps</h2>
      <p className="text-gray-300">
        Check out our main website for more information:
      </p>

      <div className="flex flex-col sm:flex-row gap-4 mt-8">
        <a
          href="https://ethpandaops.io"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center px-6 py-3 text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
        >
          <ExternalLink className="h-5 w-5 mr-2" />
          Visit EthPandaOps
        </a>
        <a
          href="https://github.com/ethpandaops"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center px-6 py-3 text-base font-medium text-indigo-600 bg-indigo-100 hover:bg-indigo-200 dark:text-white dark:bg-indigo-900 dark:hover:bg-indigo-800 rounded-lg transition-colors"
        >
          <Github className="h-5 w-5 mr-2" />
          View Our Projects
        </a>
      </div>
    </div>
  )
} 