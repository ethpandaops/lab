import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export const Home = () => {
  return (
    <div className="relative min-h-[80vh]">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src="/header.png"
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
        <div className="bg-black/20 backdrop-blur-sm p-12 rounded-3xl max-w-3xl border border-white/10">
          <h1 className="text-5xl font-bold text-white mb-6">
            Welcome to The Lab
          </h1>
          <p className="text-xl text-gray-100 mb-10 max-w-2xl">
            The Lab is our experimental platform for exploring Ethereum
          </p>
          <Link
            to="/xatu/contributors"
            className="inline-flex items-center px-8 py-4 text-lg font-medium text-white bg-indigo-600/90 hover:bg-indigo-700 rounded-xl transition-all hover:scale-105"
          >
            Explore
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </div>
    </div>
  )
} 