import { createFileRoute } from '@tanstack/react-router';
import { BeaconSlot } from '@/pages/beacon/slot';

export const Route = createFileRoute('/_layout/beacon/slot/$slot')({
  component: BeaconSlot,
});