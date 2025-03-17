import { Info } from 'lucide-react'
import { Card, CardBody } from './Card'

interface AboutThisDataProps {
  children: React.ReactNode
}

export const AboutThisData = ({ children }: AboutThisDataProps) => {
  return (
    <Card isPrimary className="relative">
      {/* Glow Effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/5 to-error/5 rounded-lg animate-pulse-slow" />
      
      {/* Content */}
      <CardBody className="relative flex items-start gap-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mt-0.5">
          <Info className="w-5 h-5 text-accent" />
        </div>
        <div className="flex-grow">
          <h2 className="text-xl font-sans font-bold text-primary mb-2">About This Data</h2>
          <div className="text-base font-mono text-secondary">
            {children}
          </div>
        </div>
      </CardBody>
    </Card>
  )
} 