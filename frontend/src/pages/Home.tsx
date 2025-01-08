import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export const Home = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
      <img
        src="/ethpandaops-logo.svg"
        alt="EthPandaOps Logo"
        className="w-48 h-48 mb-8"
      />
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
        Welcome to EthPandaOps Lab
      </h1>
      <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl">
        The Lab is our experimental platform for exploring Ethereum. 
      </p>
      <Link
        to="/xatu/contributors"
        className="inline-flex items-center px-6 py-3 text-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
      >
        Explore Data
        <ArrowRight className="ml-2 h-5 w-5" />
      </Link>
    </div>
  )
} 