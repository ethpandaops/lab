import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/xatu/contributors')({
  component: Outlet,
  beforeLoad: () => {
    return {
      getTitle: () => 'Contributors',
      getBreadcrumb: () => ({ label: 'Contributors' }),
    };
  },
  head: () => ({
    meta: [
      {
        title: `Contributors | ${import.meta.env.VITE_BASE_TITLE}`,
      },
      {
        name: 'description',
        content: 'Contributors running Xatu nodes: how many, where and with which clients.',
      },
      { property: 'og:url', content: `${import.meta.env.VITE_BASE_URL}/xatu/contributors` },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: `Contributors | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        property: 'og:description',
        content: 'Contributors running Xatu nodes: how many, where and with which clients.',
      },
      {
        property: 'og:image',
        content: `${import.meta.env.VITE_BASE_URL}/images/xatu/contributors.png`,
      },
      { name: 'twitter:url', content: `${import.meta.env.VITE_BASE_URL}/xatu/contributors` },
      { name: 'twitter:title', content: `Contributors | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'twitter:description',
        content: 'Contributors running Xatu nodes: how many, where and with which clients.',
      },
      {
        name: 'twitter:image',
        content: `${import.meta.env.VITE_BASE_URL}/images/xatu/contributors.png`,
      },
    ],
  }),
});
