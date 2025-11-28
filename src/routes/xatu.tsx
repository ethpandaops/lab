import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/xatu')({
  component: Outlet,
  beforeLoad: () => ({
    getBreadcrumb: () => ({ label: 'Xatu', clickable: false }),
  }),
});
