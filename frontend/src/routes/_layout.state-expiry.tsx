import { createFileRoute } from '@tanstack/react-router';
import StateExpiryPage from '@/pages/state-expiry';

export const Route = createFileRoute('/_layout/state-expiry')({
  component: StateExpiryPage,
});
