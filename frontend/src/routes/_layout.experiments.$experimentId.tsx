import { createFileRoute, Outlet } from '@tanstack/react-router';
import { z } from 'zod';
import { useEffect, useMemo } from 'react';
import { getRestApiClient } from '@/api';
import { SlotProvider } from '@/contexts/slot';
import { useSlotActions } from '@/hooks/useSlot';
import { useNetwork } from '@/stores/appStore';
import { useExperimentConfig } from '@/hooks/useExperimentConfig';
import { AlertCircle } from 'lucide-react';
import { isSlotBasedExperiment, extractSlotBounds } from '@/types/slot';

const experimentSearchSchema = z
  .object({
    slot: z.number().optional(),
    mode: z.enum(['continuous', 'single']).optional(),
    playing: z.boolean().optional(),
  })
  .catchall(z.unknown());

export const Route = createFileRoute('/_layout/experiments/$experimentId')({
  validateSearch: experimentSearchSchema,
  loader: async ({ params, location }) => {
    const client = await getRestApiClient();

    // Get network from URL search params or localStorage to load the correct config upfront, defaulting to mainnet.
    const searchParams = new URLSearchParams(location.search);
    const networkFromUrl = searchParams.get('network');
    const networkFromStorage = typeof window !== 'undefined'
      ? localStorage.getItem('selectedNetwork')
      : null;
    const network = networkFromUrl || networkFromStorage || 'mainnet';

    const experimentConfig = await client.getExperimentConfig(network, params.experimentId);
    return {
      experimentId: params.experimentId,
      experimentConfig,
    };
  },
  component: ExperimentLayout,
  errorComponent: ({ error }) => (
    <div className="flex min-h-dvh items-center justify-center">
      <div className="flex items-center gap-4 rounded-sm bg-surface p-6">
        <AlertCircle className="size-8 text-red-500" />
        <div>
          <h2 className="text-lg/7 font-semibold">Failed to load experiment</h2>
          <p className="text-sm/6 text-secondary">{error.message}</p>
        </div>
      </div>
    </div>
  ),
});

function KeyboardShortcuts() {
  const actions = useSlotActions();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          actions.toggle();
          break;
        case 'ArrowLeft':
          actions.previousSlot();
          break;
        case 'ArrowRight':
          actions.nextSlot();
          break;
        case 'KeyR':
          actions.rewind();
          break;
        case 'KeyF':
          actions.fastForward();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actions]);

  return null;
}

function ExperimentLayout() {
  const { experimentId, experimentConfig: loaderConfig } = Route.useLoaderData();
  const search = Route.useSearch();
  const { selectedNetwork } = useNetwork();

  // Check if loader already has the correct network config
  const loaderHasCorrectNetwork = loaderConfig?.experiment?.dataAvailability?.[selectedNetwork];

  // Only fetch if we don't have the correct network config from loader
  const { data: experimentConfig, isLoading } = useExperimentConfig(selectedNetwork, experimentId, {
    enabled: !loaderHasCorrectNetwork,
    refetchInterval: 10_000,
    staleTime: 10_000,
  });

  const activeConfig = experimentConfig ?? loaderConfig;

  // Check if we're still loading the correct network config
  const isLoadingNetworkConfig = !loaderHasCorrectNetwork && !experimentConfig;

  // Memoize bounds to prevent unnecessary re-renders when config refetches
  // MUST be called before any conditional returns to satisfy React rules of hooks
  const bounds = useMemo(() => {
    return extractSlotBounds(activeConfig, selectedNetwork);
  }, [
    activeConfig.experiment?.dataAvailability,
    selectedNetwork,
  ]);

  // With network-specific config, if we have data_availability for this network, it's available
  const hasDataAvailability = activeConfig.experiment?.dataAvailability &&
    Object.keys(activeConfig.experiment.dataAvailability).includes(selectedNetwork);
  const isNetworkAvailable = hasDataAvailability && activeConfig.experiment?.enabled;

  // Show loading state while fetching the correct network config
  if (isLoadingNetworkConfig) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="flex items-center gap-4 rounded-sm bg-surface p-6">
          <div className="size-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <div>
            <h2 className="text-lg/7 font-semibold">Loading configuration</h2>
            <p className="text-sm/6 text-secondary">
              Fetching experiment configuration for {selectedNetwork}...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isNetworkAvailable) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="flex items-center gap-4 rounded-sm bg-surface p-6">
          <AlertCircle className="size-8 text-yellow-500" />
          <div>
            <h2 className="text-lg/7 font-semibold">Experiment not available</h2>
            <p className="text-sm/6 text-secondary">
              Experiment "{experimentId}" is not available for network "{selectedNetwork}".
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isSlotBased = isSlotBasedExperiment(activeConfig);

  if (!isSlotBased) {
    return (
      <div className="flex min-h-dvh flex-col">
        <Outlet />
      </div>
    );
  }

  if (!bounds) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="flex items-center gap-4 rounded-sm bg-surface p-6">
          <AlertCircle className="size-8 text-red-500" />
          <div>
            <h2 className="text-lg/7 font-semibold">Invalid experiment configuration</h2>
            <p className="text-sm/6 text-secondary">
              Slot data availability not found for network "{selectedNetwork}".
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SlotProvider
      bounds={bounds}
      network={selectedNetwork}
      initialSlot={search.slot}
      initialMode={search.mode ?? 'continuous'}
      initialPlaying={search.playing ?? true}
    >
      <KeyboardShortcuts />
      <Outlet />
    </SlotProvider>
  );
}
