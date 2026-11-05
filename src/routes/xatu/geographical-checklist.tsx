import { createFileRoute } from '@tanstack/react-router';
import { IndexPage } from '@/pages/xatu/geographical-checklist';
import { nodesSearchSchema } from '@/pages/xatu/nodes/constants';

export const Route = createFileRoute('/xatu/geographical-checklist')({
  component: IndexPage,
  validateSearch: nodesSearchSchema,
  beforeLoad: () => ({
    getBreadcrumb: () => ({ label: 'Geographical Checklist' }),
  }),
  head: () => ({
    meta: [
      {
        title: `Geographical Checklist | ${import.meta.env.VITE_BASE_TITLE}`,
      },
      {
        name: 'description',
        content: 'Xatu nodes by continent, country and city.',
      },
      { property: 'og:url', content: `${import.meta.env.VITE_BASE_URL}/xatu/geographical-checklist` },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: `Geographical Checklist | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        property: 'og:description',
        content: 'Xatu nodes by continent, country and city.',
      },
      {
        property: 'og:image',
        content: `${import.meta.env.VITE_BASE_URL}/images/xatu/geographical-checklist.png`,
      },
      { name: 'twitter:url', content: `${import.meta.env.VITE_BASE_URL}/xatu/geographical-checklist` },
      { name: 'twitter:title', content: `Geographical Checklist | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'twitter:description',
        content: 'Xatu nodes by continent, country and city.',
      },
      {
        name: 'twitter:image',
        content: `${import.meta.env.VITE_BASE_URL}/images/xatu/geographical-checklist.png`,
      },
    ],
  }),
});
