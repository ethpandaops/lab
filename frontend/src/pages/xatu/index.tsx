import { Link } from 'react-router-dom'
import { ArrowRight, Database, Server, Activity, Github } from 'lucide-react'

export const Xatu = () => {
  return (
    <div className="space-y-12 max-w-6xl mx-auto">
      {/* Hero Section */}
      <div className="relative rounded-2xl overflow-hidden bg-gray-900/80 backdrop-blur-md border border-gray-800">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-purple-500/10" />
        <div className="relative p-8 md:p-12">
          <div className="flex flex-col md:flex-row items-center gap-8 mb-8">
            <div className="w-32 h-32 flex items-center justify-center rounded-2xl bg-white/10 p-2">
              <img src="/xatu.png" alt="Xatu" className="w-auto h-auto max-w-full max-h-full object-contain" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Xatu</h1>
              <p className="text-xl text-gray-300 max-w-3xl">
                A comprehensive dataset containing detailed information about the Ethereum network, including beacon chain events, mempool activity, and canonical chain events.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/experiments/xatu/contributors"
              className="inline-flex items-center px-6 py-3 text-base font-medium text-white bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/50 rounded-lg transition-all hover:scale-105"
            >
              Explore Xatu
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <a
              href="https://github.com/ethpandaops/xatu"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-6 py-3 text-base font-medium text-gray-300 hover:text-white bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-lg transition-all hover:scale-105"
            >
              <Github className="mr-2 h-5 w-5" />
              View on GitHub
            </a>
          </div>
        </div>
      </div>

      {/* Available Data Grid */}
      <div className="bg-gray-900/80 backdrop-blur-md rounded-lg p-8 border border-gray-800">
        <h2 className="text-2xl font-bold text-white mb-6">Available Data</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0 mt-1">
                <Database className="h-4 w-4 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Beacon API Event Stream</h3>
                <p className="text-gray-300">Events derived from the Beacon API event stream</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0 mt-1">
                <Server className="h-4 w-4 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Execution Layer P2P</h3>
                <p className="text-gray-300">Events from the execution layer p2p network</p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0 mt-1">
                <Activity className="h-4 w-4 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Canonical Beacon</h3>
                <p className="text-gray-300">Events derived from the finalized beacon chain</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0 mt-1">
                <Database className="h-4 w-4 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">MEV Relay</h3>
                <p className="text-gray-300">Events derived from MEV relays</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 