import type { JSX } from 'react';

export function FatalError({ error }: { error: Error }): JSX.Element {
  console.error('Route error:', error);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-base">
      <img src="/images/lab.png" className="h-72 w-72 rotate-180 object-contain" alt="Lab Logo" />
      <h1 className="mt-6 text-2xl text-error">Uhh... Something went wrong</h1>
      <p className="mt-2 text-sm text-muted">{error.message}</p>
      <button
        onClick={() => window.location.reload()}
        className="btn btn-error mt-4 rounded-lg px-6 py-2 text-sm transition-colors"
      >
        Reload Page
      </button>
    </div>
  );
}
