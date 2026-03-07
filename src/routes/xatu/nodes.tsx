import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/xatu/nodes')({
  component: Outlet,
  beforeLoad: () => ({
    getBreadcrumb: () => ({ label: 'Nodes' }),
  }),
  head: () => ({
    meta: [
      { title: `Nodes | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'description',
        content:
          'Monitor Xatu node hardware specs and resource utilization including CPU, memory, disk I/O, and network I/O.',
      },
    ],
  }),
});
