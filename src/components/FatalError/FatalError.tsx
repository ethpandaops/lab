import type { JSX } from 'react';

export function FatalError({ error }: { error: Error }): JSX.Element {
  console.error('Route error:', error);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950">
      <img src="/images/lab.png" className="h-72 w-72 rotate-180 object-contain" alt="Lab Logo" />
      <h1 className="mt-6 text-2xl text-red-400">Uhh... Something went wrong</h1>
      <p className="mt-2 text-sm text-slate-400">{error.message}</p>
      <button
        onClick={() => window.location.reload()}
        className="mt-4 rounded-lg bg-red-500/20 px-6 py-2 text-sm text-red-300 transition-colors hover:bg-red-500/30"
      >
        Reload Page
      </button>
    </div>
  );
}
