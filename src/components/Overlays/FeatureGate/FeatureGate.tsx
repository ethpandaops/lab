import { type JSX } from 'react';
import { useLocation, Link } from '@tanstack/react-router';
import { useIsPageEnabled } from '@/hooks/useIsPageEnabled';
import { useNetwork } from '@/hooks/useNetwork';

interface FeatureGateProps {
  children: React.ReactNode;
}

/**
 * FeatureGate: Checks if the current page is enabled for the active network.
 * Shows a friendly message if the feature is disabled for the current network.
 */
export function FeatureGate({ children }: FeatureGateProps): JSX.Element {
  const location = useLocation();
  const { currentNetwork } = useNetwork();
  const isEnabled = useIsPageEnabled(location.pathname);

  // If feature is disabled for this network, show a message
  if (!isEnabled) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center p-6">
        {/* Content */}
        <div className="relative flex flex-col items-center">
          <div className="relative mb-8">
            {/* Glow effect */}
            <div className="absolute inset-0 animate-pulse rounded-full bg-warning/20 blur-3xl"></div>
            <img src="/images/lab.png" className="relative size-32 object-contain" alt="Lab Logo" />
          </div>

          <h1 className="text-2xl font-bold text-foreground">Feature Not Available</h1>
          <p className="mt-4 max-w-md text-center text-muted">
            This feature is not available on{' '}
            <span className="font-semibold text-foreground">{currentNetwork?.display_name}</span>.
          </p>

          <div className="mt-8 flex gap-4">
            <Link
              to="/"
              className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary/90 hover:shadow-md active:scale-95"
            >
              Go Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Feature is enabled - render the page
  return <>{children}</>;
}
