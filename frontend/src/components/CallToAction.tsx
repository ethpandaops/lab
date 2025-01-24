import { ArrowRight, Share2 } from 'lucide-react'
import { Link } from 'react-router-dom'

interface CallToActionProps {
  title: string
  description: string
  buttonText: string
  buttonLink: string
}

export const CallToAction = ({ title, description, buttonText, buttonLink }: CallToActionProps) => {
  return (
    <div className="relative overflow-hidden rounded-xl border border-cyan-400/30 bg-gradient-to-br from-cyan-500/20 via-purple-500/10 to-cyan-500/20 shadow-[0_0_30px_-5px_rgba(6,182,212,0.25)]">
      <div className="absolute inset-0 bg-grid-white/[0.02]" />
      <div className="relative p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-cyan-400/20 p-2 sm:p-2.5 flex items-center justify-center ring-1 ring-cyan-400/30 shadow-[0_0_15px_-3px_rgba(6,182,212,0.4)]">
            <Share2 className="h-5 w-5 sm:h-6 sm:w-6 text-cyan-300" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg sm:text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-purple-400">{title}</h3>
            <p className="mt-1 text-sm sm:text-base text-gray-200">{description}</p>
          </div>
          <Link
            to={buttonLink}
            className="w-full sm:w-auto flex-shrink-0 inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-cyan-500/20 to-purple-500/20 hover:from-cyan-500/30 hover:to-purple-500/30 border border-cyan-400/50 rounded-lg transition-all hover:scale-105 shadow-[0_0_15px_-3px_rgba(6,182,212,0.3)]"
          >
            {buttonText}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  )
} 