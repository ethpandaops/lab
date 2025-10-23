import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/experiments/slot-view')({
  component: () => <Outlet />,
});
