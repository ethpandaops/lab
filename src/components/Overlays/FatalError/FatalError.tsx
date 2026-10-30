import type { JSX } from 'react';

export function FatalError({ error }: { error: Error }): JSX.Element {
  console.error('Route error:', error);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
      {/* Content */}
      <div className="relative flex flex-col items-center">
        <img src="/images/lab.png" className="size-72 rotate-180 object-contain" alt="" />
        <h1 className="mt-8 text-2xl/8 font-semibold tracking-tight text-danger">Something went wrong</h1>
        <p className="mt-2 max-w-md text-center text-sm text-muted">{error.message}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-8 inline-flex h-8 items-center rounded-sm bg-danger px-4 text-sm font-semibold text-white transition-colors hover:bg-danger/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:text-background"
        >
          Reload Page
        </button>
      </div>
    </div>
  );
}
