import { createFileRoute, Navigate } from '@tanstack/react-router';

export const Route = createFileRoute('/_layout/beacon/block-production/')({
  component: () => <Navigate to="/beacon/block-production/live" />,
});
