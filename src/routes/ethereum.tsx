import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/ethereum')({
  component: Outlet,
  beforeLoad: () => ({
    getBreadcrumb: () => ({ label: 'Ethereum', clickable: false }),
  }),
});
