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
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
        {/* Animated background effect */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-accent/5"></div>
        </div>

        {/* Content */}
        <div className="relative flex flex-col items-center">
          <img src="/images/lab.png" className="size-72 animate-spin object-contain" alt="Loading..." />
          <p className="mt-8 text-2xl font-semibold text-foreground">Loading Lab...</p>
          <div className="mt-4 h-1 w-32 animate-pulse rounded-full bg-linear-to-r from-primary to-accent"></div>
        </div>
      </div>
    );
  }

  // Show error state if initial config fetch failed
  if (!config) {
    console.error('Config error:', error);

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
          <h1 className="mt-8 text-2xl font-bold text-danger">Failed to Load Configuration</h1>
          {error && <p className="mt-2 max-w-md text-center text-sm text-muted">{error.message}</p>}
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

  // Config loaded successfully - render the app
  // Pass config to children to avoid duplicate fetches
  return <>{children}</>;
}
