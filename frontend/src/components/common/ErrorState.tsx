import { AlertCircle } from 'lucide-react'

interface ErrorStateProps {
  message?: string
  error?: Error
  retry?: () => void
}

export const ErrorState = ({
  message = 'Something went wrong',
  error,
  retry
}: ErrorStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] p-4">
      <AlertCircle className="h-8 w-8 text-red-500" />
      <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">{message}</p>
      {error && (
        <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
          {error.message}
        </p>
      )}
      {retry && (
        <button
          onClick={retry}
          className="mt-4 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  )
} 