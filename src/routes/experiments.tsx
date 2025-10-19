import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/experiments')({
  component: Outlet,
  beforeLoad: () => {
    return {
      getTitle: () => 'Experiments',
    };
  },
});
