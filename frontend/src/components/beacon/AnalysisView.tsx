import { ReactNode } from 'react'

interface AnalysisViewProps {
  loading?: boolean
  isMissing?: boolean
}

export function AnalysisView({ loading, isMissing }: AnalysisViewProps): JSX.Element {
  return (
    <div className="lg:col-span-9 backdrop-blur-md rounded-lg border border-cyber-neon/20 p-6 bg-cyber-dark/80">
      <h3 className="text-lg font-sans font-bold text-cyber-neon mb-4">Analysis</h3>
      <p className="text-sm font-mono text-cyber-neon/70">Coming soon...</p>
    </div>
  )
} 