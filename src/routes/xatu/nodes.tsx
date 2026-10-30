import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/xatu/nodes')({
  component: Outlet,
  beforeLoad: () => ({
    getTitle: () => 'Nodes',
    getBreadcrumb: () => ({ label: 'Nodes' }),
  }),
  head: () => ({
    meta: [
      { title: `Nodes | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'description',
        content: 'Every node reporting to Xatu: where they run, which clients they use and how fast they see blocks.',
      },
      { property: 'og:url', content: `${import.meta.env.VITE_BASE_URL}/xatu/nodes` },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: `Nodes | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        property: 'og:description',
        content: 'Every node reporting to Xatu: where they run, which clients they use and how fast they see blocks.',
      },
      { property: 'og:image', content: `${import.meta.env.VITE_BASE_URL}/images/xatu/nodes.png` },
      { name: 'twitter:url', content: `${import.meta.env.VITE_BASE_URL}/xatu/nodes` },
      { name: 'twitter:title', content: `Nodes | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'twitter:description',
        content: 'Every node reporting to Xatu: where they run, which clients they use and how fast they see blocks.',
      },
      { name: 'twitter:image', content: `${import.meta.env.VITE_BASE_URL}/images/xatu/nodes.png` },
    ],
  }),
});
