import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/ethereum/data-availability')({
  component: Outlet,
});
