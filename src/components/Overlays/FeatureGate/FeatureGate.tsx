import { type JSX, Fragment, useMemo } from 'react';
import { useLocation, Link } from '@tanstack/react-router';
import { useIsPageEnabled } from '@/hooks/useIsPageEnabled';
import { useNetwork } from '@/hooks/useNetwork';
import { useConfig } from '@/hooks/useConfig';
import { getNetworkFullLabel } from '@/utils/networks';

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
  const { data: config } = useConfig();
  const isEnabled = useIsPageEnabled(location.pathname);

  // Calculate which networks this feature is available on
  const availableNetworks = useMemo(() => {
    if (!config?.networks || !config?.features) return [];

    // Find the feature for current path
    const feature = config.features.find(f => f.path === location.pathname);

    // If not in features config, all networks are available
    if (!feature) return config.networks;

    // Filter out disabled networks
    return config.networks.filter(network => !feature.disabled_networks?.includes(network.name));
  }, [config, location.pathname]);

  // If feature is disabled for this network, show a message
  if (!isEnabled) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center p-6">
        {/* Content */}
        <div className="relative flex flex-col items-center">
          <img src="/images/lab.png" className="mb-8 size-32 object-contain" alt="" />

          <h1 className="text-2xl/8 font-semibold tracking-tight text-foreground">Feature Not Available</h1>
          <p className="mt-4 max-w-md text-center text-muted">
            This feature is not available on{' '}
            <span className="font-semibold text-foreground">
              {currentNetwork && getNetworkFullLabel(currentNetwork)}
            </span>
            .
          </p>

          {availableNetworks.length > 0 && (
            <p className="mt-3 text-center text-sm text-muted">
              Available on:{' '}
              {availableNetworks.map((network, index) => (
                <Fragment key={network.name}>
                  {index > 0 && ', '}
                  <Link
                    to={location.pathname}
                    search={{ network: network.name }}
                    className="font-medium text-primary hover:underline"
                  >
                    {getNetworkFullLabel(network)}
                  </Link>
                </Fragment>
              ))}
            </p>
          )}

          <div className="mt-8 flex gap-4">
            <Link
              to="/"
              className="inline-flex h-8 items-center rounded-sm bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
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
