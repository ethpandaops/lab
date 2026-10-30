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
        {/* Content */}
        <div className="relative flex flex-col items-center px-4">
          <img
            src="/images/lab.png"
            className="size-48 animate-spin object-contain sm:size-64 md:size-72"
            alt="Loading..."
          />
          <p className="mt-6 text-2xl/8 font-semibold tracking-tight text-foreground sm:mt-8">Loading Lab...</p>
        </div>
      </div>
    );
  }

  // Show error state if initial config fetch failed
  if (!config) {
    console.error('Config error:', error);

    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
        {/* Content */}
        <div className="relative flex flex-col items-center px-4">
          <img src="/images/lab.png" className="size-48 rotate-180 object-contain sm:size-64 md:size-72" alt="" />
          <h1 className="mt-6 text-xl/8 font-semibold tracking-tight text-danger sm:mt-8 sm:text-2xl/8">
            Failed to Load Configuration
          </h1>
          {error && <p className="mt-2 max-w-md text-center text-sm text-muted">{error.message}</p>}
          <button
            onClick={() => window.location.reload()}
            className="mt-6 inline-flex h-8 items-center rounded-sm bg-danger px-4 text-sm font-semibold text-white transition-colors hover:bg-danger/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:mt-8 dark:text-background"
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
