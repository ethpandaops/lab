import { Github, ExternalLink } from 'lucide-react'

export const About = () => {
  return (
    <div className="space-y-8 max-w-4xl">
      <h2 className="text-2xl font-bold">About EthPandaOps Lab</h2>

      <div className="prose dark:prose-invert max-w-none">
        <p className="text-lg">
          EthPandaOps Lab is an experimental platform that provides insights into the Ethereum network. 
          We collect, analyze, and visualize data from various sources to help understand the network's health, 
          client diversity, and overall ecosystem.
        </p>

        <h3>Our Data Sources</h3>
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 space-y-4">
          <div>
            <h4 className="text-lg font-semibold mb-2">Xatu</h4>
            <p className="text-gray-600 dark:text-gray-300">
              A beacon chain event collector and metrics exporter. Xatu helps monitor the Ethereum network by collecting:
            </p>
            <div className="mt-4">
              <a
                href="https://github.com/ethpandaops/xatu"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                <Github className="h-5 w-5 mr-2" />
                View Xatu on GitHub
              </a>
            </div>
          </div>
        </div>

        <h2 className="mt-8">About EthPandaOps</h2>
        <p>
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
    </div>
  )
} 