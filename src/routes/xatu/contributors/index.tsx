import { createFileRoute } from '@tanstack/react-router';
import { IndexPage } from '@/pages/xatu/contributors';

export const Route = createFileRoute('/xatu/contributors/')({
  component: IndexPage,
  beforeLoad: () => ({
    getBreadcrumb: () => ({ show: false }), // Index routes should not show breadcrumbs
  }),
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
        content: '/images/xatu/contributors.png',
      },
      { name: 'twitter:url', content: `${import.meta.env.VITE_BASE_URL}/xatu/contributors` },
      { name: 'twitter:title', content: `Contributors | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'twitter:description',
        content: 'Browse Xatu Contributoor nodes and their network participation metrics.',
      },
      {
        name: 'twitter:image',
        content: '/images/xatu/contributors.png',
      },
    ],
  }),
});
