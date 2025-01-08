import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'

export const Home = () => {
  return (
    <Layout>
      <div className="relative min-h-[80vh]">
        {/* Header Image */}
        <div className="absolute inset-0 z-0">
          <div className="relative w-full h-full">
            <img
              src="/header.png"
              alt=""
              className="w-full h-full object-cover [mask-image:radial-gradient(ellipse_at_center,rgba(0,0,0,1)_50%,transparent_100%)]"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
          <div className="bg-gray-900/80 backdrop-blur-md p-12 rounded-lg border border-gray-800 shadow-xl">
            <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-cyan-400 via-purple-500 to-cyan-400 text-transparent bg-clip-text animate-text-shine">
              Welcome to The Lab
            </h1>
            
            <p className="text-xl text-gray-300 mb-10 max-w-2xl font-light">
              The Lab is our experimental platform for exploring Ethereum data
            </p>
            
            <Link
              to="/experiments/"
              className="group relative inline-flex items-center px-8 py-4 text-lg font-medium text-white bg-transparent border border-cyan-500/50 rounded-lg overflow-hidden transition-all hover:scale-105 hover:border-cyan-400"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-cyan-500/10 group-hover:opacity-100 opacity-0 transition-opacity" />
              <span className="relative">
                Explore
                <ArrowRight className="inline-block ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  )
} 