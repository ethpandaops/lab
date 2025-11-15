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
        content: 'Browse Xatu Contributoor nodes and their network participation metrics.',
      },
      { property: 'og:url', content: `${import.meta.env.VITE_BASE_URL}/xatu/contributors` },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: `Contributors | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        property: 'og:description',
        content: 'Browse Xatu Contributoor nodes and their network participation metrics.',
      },
      {
        property: 'og:image',
        content: `${import.meta.env.VITE_BASE_URL}/images/xatu/contributors.png`,
      },
      { name: 'twitter:url', content: `${import.meta.env.VITE_BASE_URL}/xatu/contributors` },
      { name: 'twitter:title', content: `Contributors | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'twitter:description',
        content: 'Browse Xatu Contributoor nodes and their network participation metrics.',
      },
      {
        name: 'twitter:image',
        content: `${import.meta.env.VITE_BASE_URL}/images/xatu/contributors.png`,
      },
    ],
  }),
});
