import { Outlet, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/ethereum/network/countries')({
  component: Outlet,
  beforeLoad: () => ({
    getBreadcrumb: () => ({ label: 'Countries' }),
  }),
});
