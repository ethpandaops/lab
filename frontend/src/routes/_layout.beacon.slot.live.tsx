import { createFileRoute } from '@tanstack/react-router';
import { BeaconLive } from '@/pages/beacon/live';

export const Route = createFileRoute('/_layout/beacon/slot/live')({
  component: BeaconLive,
});
