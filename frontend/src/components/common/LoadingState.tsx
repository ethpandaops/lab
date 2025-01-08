import { Loader2 } from 'lucide-react'

interface LoadingStateProps {
  message?: string
}

export const LoadingState = ({ message = 'Loading...' }: LoadingStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] p-4">
      <Loader2 className="h-8 w-8 animate-spin text-gray-500 dark:text-gray-400" />
      <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">{message}</p>
    </div>
  )
} 