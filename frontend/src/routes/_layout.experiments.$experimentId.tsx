import { createFileRoute, Outlet } from '@tanstack/react-router';
import { z } from 'zod';
import { useEffect } from 'react';
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
  loader: async ({ params }) => {
    const client = await getRestApiClient();
    const experimentConfig = await client.getExperimentConfig(params.experimentId);
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

  const { data: experimentConfig } = useExperimentConfig(experimentId, {
    refetchInterval: 10_000,
    staleTime: 10_000,
  });

  const activeConfig = experimentConfig ?? loaderConfig;

  const availableNetworks = activeConfig.experiment?.networks ?? [];
  const isNetworkAvailable = availableNetworks.includes(selectedNetwork);

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
            <p className="text-sm/6 text-secondary">
              Available networks: {availableNetworks.join(', ')}
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

  const bounds = extractSlotBounds(activeConfig, selectedNetwork);

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
