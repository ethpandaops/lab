import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/ethereum/contracts')({
  component: Outlet,
  beforeLoad: () => ({
    getBreadcrumb: () => ({ label: 'Contracts' }),
  }),
  head: () => ({
    meta: [
      { title: `Contracts | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'description',
        content: 'Ethereum contract storage analysis and state expiry insights.',
      },
    ],
  }),
});
