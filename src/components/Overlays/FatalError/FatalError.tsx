import type { JSX } from 'react';

export function FatalError({ error }: { error: Error }): JSX.Element {
  console.error('Route error:', error);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
      {/* Subtle background pattern */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-50">
        <div className="absolute inset-0 bg-linear-to-br from-danger/5 via-transparent to-danger/10"></div>
      </div>

      {/* Content */}
      <div className="relative flex flex-col items-center">
        <div className="relative">
          {/* Glow effect */}
          <div className="absolute inset-0 animate-pulse rounded-full bg-danger/20 blur-3xl"></div>
          <img src="/images/lab.png" className="relative size-72 rotate-180 object-contain" alt="Lab Logo" />
        </div>
        <h1 className="mt-8 text-2xl font-bold text-danger">Uhh... Something went wrong</h1>
        <p className="mt-2 max-w-md text-center text-sm text-muted">{error.message}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-8 rounded-lg bg-danger px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-danger/90 hover:shadow-md active:scale-95"
        >
          Reload Page
        </button>
      </div>
    </div>
  );
}
