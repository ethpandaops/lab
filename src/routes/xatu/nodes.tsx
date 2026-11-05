import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/xatu/nodes')({
  component: Outlet,
  beforeLoad: () => ({
    getTitle: () => 'Xatu nodes',
    getBreadcrumb: () => ({ label: 'Xatu nodes' }),
  }),
  head: () => ({
    meta: [
      { title: `Xatu nodes | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'description',
        content: 'Where Xatu nodes run, which clients they use and when they first see blocks.',
      },
      { property: 'og:url', content: `${import.meta.env.VITE_BASE_URL}/xatu/nodes` },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: `Xatu nodes | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        property: 'og:description',
        content: 'Where Xatu nodes run, which clients they use and when they first see blocks.',
      },
      { property: 'og:image', content: `${import.meta.env.VITE_BASE_URL}/images/xatu/nodes.png` },
      { name: 'twitter:url', content: `${import.meta.env.VITE_BASE_URL}/xatu/nodes` },
      { name: 'twitter:title', content: `Xatu nodes | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'twitter:description',
        content: 'Where Xatu nodes run, which clients they use and when they first see blocks.',
      },
      { name: 'twitter:image', content: `${import.meta.env.VITE_BASE_URL}/images/xatu/nodes.png` },
    ],
  }),
});
