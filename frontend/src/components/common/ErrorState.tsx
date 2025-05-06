import { AlertCircle } from 'lucide-react';

interface ErrorStateProps {
  message?: string;
  error?: Error;
  retry?: () => void;
}

export const ErrorState = ({ message = 'Something went wrong', error, retry }: ErrorStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] p-4">
      <AlertCircle className="h-8 w-8 text-red-500" />
      <p className="mt-4 text-sm text-tertiary dark:text-secondary">{message}</p>
      {error && <p className="mt-2 text-xs text-secondary dark:text-tertiary">{error.message}</p>}
      {retry && (
        <button
          onClick={retry}
          className="mt-4 px-4 py-2 text-sm font-medium text-primary bg-indigo-600 hover:bg-indigo-700  transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
};
