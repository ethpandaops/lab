import { createFileRoute } from '@tanstack/react-router';
import { Beacon } from '@/pages/beacon';

export const Route = createFileRoute('/_layout/beacon')({
  component: Beacon,
});
