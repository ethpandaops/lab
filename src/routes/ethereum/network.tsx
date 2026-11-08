import { Outlet, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/ethereum/network')({
  component: Outlet,
  beforeLoad: () => ({
    getTitle: () => 'Network',
    getBreadcrumb: () => ({ label: 'Network' }),
  }),
});
