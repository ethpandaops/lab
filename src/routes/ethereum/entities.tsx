import { Outlet, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/ethereum/entities')({
  component: Outlet,
  beforeLoad: () => ({
    getTitle: () => 'Entities',
  }),
  head: () => ({
    meta: [{ title: `Entities | ${import.meta.env.VITE_BASE_TITLE}` }],
  }),
});
