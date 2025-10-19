import { type JSX, useEffect } from 'react';
import { useConfig } from '@/hooks/useConfig';

interface ConfigGateProps {
  children: React.ReactNode;
}

// ConfigGate: Gates the entire app until config is successfully loaded
export function ConfigGate({ children }: ConfigGateProps): JSX.Element {
  const { data: config, isLoading, error } = useConfig();

  useEffect(() => {
    // Once React has mounted, hide the initial HTML loading screen
    document.body.classList.add('react-loaded');
  }, []);

  // Show loading screen while fetching initial config
  if (isLoading && !config) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950">
        <img src="/images/lab.png" className="h-72 w-72 animate-spin object-contain" alt="Loading..." />
        <p className="mt-8 text-2xl text-slate-400">Loading Lab...</p>
      </div>
    );
  }

  // Show error state if initial config fetch failed
  if (!config) {
    console.error('Config error:', error);

    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950">
        <img src="/images/lab.png" className="h-72 w-72 rotate-180 object-contain" alt="Lab Logo" />
        <h1 className="mt-6 text-2xl text-red-400">Failed to Load Configuration</h1>
        {error && <p className="mt-2 text-sm text-slate-400">{error.message}</p>}
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded-lg bg-red-500/20 px-6 py-2 text-sm text-red-300 transition-colors hover:bg-red-500/30"
        >
          Reload Page
        </button>
      </div>
    );
  }

  // Config loaded successfully - render the app
  // Pass config to children to avoid duplicate fetches
  return <>{children}</>;
}
