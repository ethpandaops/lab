import { Outlet, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/ethereum/epochs')({
  component: Outlet,
  beforeLoad: () => ({
    getTitle: () => 'Epochs',
  }),
  head: () => ({
    meta: [{ title: `Epochs | ${import.meta.env.VITE_BASE_TITLE}` }],
  }),
});
