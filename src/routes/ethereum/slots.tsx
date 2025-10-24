import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/ethereum/slots')({
  component: Outlet,
  beforeLoad: () => {
    return {
      getTitle: () => 'Slots',
    };
  },
  head: () => ({
    meta: [{ title: `Slots | ${import.meta.env.VITE_BASE_TITLE}` }],
  }),
});
