import { Link } from 'react-router-dom'
import { ArrowRight, Beaker, Database, Server, Activity } from 'lucide-react'

export const Home = () => {
  return (
    <div className="space-y-12 max-w-6xl mx-auto">
      {/* Hero Section */}
      <div className="relative rounded-2xl overflow-hidden bg-gray-900/80 backdrop-blur-md border border-gray-800">
        <div className="absolute inset-0">
          <img src="/header.png" alt="Header" className="w-full h-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-black/75" />
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/30 via-transparent to-purple-500/30" />
        <div className="relative p-6 md:p-12">
          <div className="text-center md:text-left max-w-6xl mx-auto">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 md:mb-4">The Lab</h1>
            <p className="text-lg md:text-xl text-gray-300 max-w-3xl mb-4">
              The Lab is our experimental platform for exploring Ethereum data. We collect data from various sources 
              and present it in a way that is easy to understand.
            </p>
            <p className="text-2xl font-mono text-cyan-400 italic opacity-75">&quot;Let the pandas cook 🐼👨‍🍳&quot;</p>
          </div>
          <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-6">
            <Link
              to="/experiments"
              className="inline-flex items-center px-6 py-3 text-base font-medium text-white bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/50 rounded-lg transition-all hover:scale-105"
            >
              View Experiments
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-900/80 backdrop-blur-md rounded-lg p-6 border border-gray-800">
          <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center mb-4">
            <Database className="h-6 w-6 text-cyan-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Observability</h3>
          <p className="text-gray-300">
            The Lab provides observability into the networks we're running. From devnet-0 to mainnet, we've got you covered.
          </p>
        </div>

        <div className="bg-gray-900/80 backdrop-blur-md rounded-lg p-6 border border-gray-800">
          <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center mb-4">
            <Beaker className="h-6 w-6 text-cyan-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Experimental Platform</h3>
          <p className="text-gray-300">
            A space for testing new ideas, visualizing data, and exploring the Ethereum network in new ways.
          </p>
        </div>


        <div className="bg-gray-900/80 backdrop-blur-md rounded-lg p-6 border border-gray-800">
          <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center mb-4">
            <Activity className="h-6 w-6 text-cyan-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Network Analytics</h3>
          <p className="text-gray-300">
            Explore network health and performance through dynamic data visualizations.
          </p>
        </div>
      </div>

      {/* Current Experiments */}
      <div className="bg-gray-900/80 backdrop-blur-md rounded-lg p-8 border border-gray-800">
        <h2 className="text-2xl font-bold text-white mb-6">Current Experiments</h2>
        <div className="prose prose-invert max-w-none">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0 mt-1">
              <Server className="h-4 w-4 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mt-0">Xatu Community Nodes</h3>
              <p className="text-gray-300 mt-2">
                A comprehensive dataset containing detailed information about the Ethereum network, including beacon chain events, mempool activity, and canonical chain events. Xatu helps monitor network health, and provide insights into network behavior.
              </p>
              <Link
                to="/experiments/xatu-community-nodes"
                className="inline-flex items-center mt-2 text-cyan-400 hover:text-cyan-300"
              >
                Learn more about Xatu Community Nodes
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* About ethPandaOps */}
      <div className="bg-gray-900/80 backdrop-blur-md rounded-lg p-8 border border-gray-800">
        <h2 className="text-2xl font-bold text-white mb-6">About ethPandaOps</h2>
        <div className="prose prose-invert max-w-none">
          <p className="text-gray-300">
            ethPandaOps is dedicated to supporting and improving the Ethereum ecosystem through tooling, monitoring, and data analysis. The Lab is one of our initiatives to make network data more accessible and understandable to the community.
          </p>
          <div className="flex flex-wrap gap-4 mt-6">
            <a
              href="https://ethpandaops.io"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-6 py-3 text-base font-medium text-gray-300 hover:text-white bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-lg transition-all hover:scale-105"
            >
              Visit ethPandaOps
              <ArrowRight className="ml-2 h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
} 