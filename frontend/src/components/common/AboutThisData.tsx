import { Info } from 'lucide-react'

interface AboutThisDataProps {
  children: React.ReactNode
}

export const AboutThisData = ({ children }: AboutThisDataProps) => {
  return (
    <div className="relative backdrop-blur-md   -default bg-surface/80 p-6 shadow-xl">
      {/* Glow Effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/5 to-error/5  animate-pulse-slow" />
      
      {/* Content */}
      <div className="relative flex gap-4">
        <div className="flex-shrink-0 w-8 h-8  bg-active flex items-center justify-center">
          <Info className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-grow">
          <h2 className="text-xl font-sans font-bold text-primary mb-2">About This Data</h2>
          <div className="text-base font-mono text-secondary">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
} 