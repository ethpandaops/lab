import { createFileRoute, Navigate } from '@tanstack/react-router';
import { z } from 'zod';

const beaconLiveSearchSchema = z.object({
  slot: z.number().optional(),
  mode: z.enum(['continuous', 'single']).optional(),
  playing: z.boolean().optional(),
});

export const Route = createFileRoute('/_layout/beacon/slot/live')({
  validateSearch: beaconLiveSearchSchema,
  component: BeaconLiveRedirect,
});

function BeaconLiveRedirect() {
  const search = Route.useSearch();

  return <Navigate to="/experiments/live-slots" search={search} replace />;
}
