import { Info } from 'lucide-react'

interface AboutThisDataProps {
  children: React.ReactNode
}

export const AboutThisData = ({ children }: AboutThisDataProps) => {
  return (
    <div className="relative backdrop-blur-md rounded-lg border border-cyber-neon/20 bg-cyber-dark/80 p-6 shadow-xl">
      {/* Glow Effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-cyber-neon/5 via-cyber-blue/5 to-cyber-pink/5 rounded-lg animate-pulse-slow" />
      
      {/* Content */}
      <div className="relative flex gap-4">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-cyber-neon/10 flex items-center justify-center">
          <Info className="w-5 h-5 text-cyber-neon" />
        </div>
        <div className="flex-grow">
          <h2 className="text-xl font-sans font-bold text-cyber-neon mb-2">About This Data</h2>
          <div className="text-base font-mono text-cyber-neon/85">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
} 