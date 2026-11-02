import { Outlet, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/ethereum/clients')({
  component: Outlet,
  beforeLoad: () => ({
    getTitle: () => 'Clients',
    getBreadcrumb: () => ({ label: 'Clients' }),
  }),
});
