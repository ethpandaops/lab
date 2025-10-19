import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/xatu-data')({
  component: Outlet,
  beforeLoad: () => {
    return {
      getTitle: () => 'Xatu Data',
    };
  },
  head: () => ({
    meta: [{ title: `${import.meta.env.VITE_BASE_TITLE} - Xatu Data` }],
  }),
});
