import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/ethereum/consensus')({
  component: Outlet,
  beforeLoad: () => ({
    getBreadcrumb: () => ({ label: 'Consensus', clickable: false }),
  }),
});
