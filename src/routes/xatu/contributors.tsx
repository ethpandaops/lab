import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/xatu/contributors')({
  component: Outlet,
  beforeLoad: () => {
    return {
      getTitle: () => 'Contributors',
    };
  },
  head: () => ({
    meta: [{ title: `Contributors | ${import.meta.env.VITE_BASE_TITLE}` }],
  }),
});
