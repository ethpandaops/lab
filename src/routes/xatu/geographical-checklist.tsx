import { createFileRoute } from '@tanstack/react-router';
import { IndexPage } from '@/pages/xatu/geographical-checklist';

export const Route = createFileRoute('/xatu/geographical-checklist')({
  component: IndexPage,
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
        content:
          'Explore the global distribution of Contributoor nodes across continents, countries, and cities with interactive 3D globe visualization and detailed geographical breakdown.',
      },
      { property: 'og:url', content: `${import.meta.env.VITE_BASE_URL}/xatu/geographical-checklist` },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: `Geographical Checklist | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        property: 'og:description',
        content:
          'Explore the global distribution of Contributoor nodes across continents, countries, and cities with interactive 3D globe visualization and detailed geographical breakdown.',
      },
      {
        property: 'og:image',
        content: `${import.meta.env.VITE_BASE_URL}/images/xatu/geographical-checklist.png`,
      },
      { name: 'twitter:url', content: `${import.meta.env.VITE_BASE_URL}/xatu/geographical-checklist` },
      { name: 'twitter:title', content: `Geographical Checklist | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'twitter:description',
        content:
          'Explore the global distribution of Contributoor nodes across continents, countries, and cities with interactive 3D globe visualization and detailed geographical breakdown.',
      },
      {
        name: 'twitter:image',
        content: `${import.meta.env.VITE_BASE_URL}/images/xatu/geographical-checklist.png`,
      },
    ],
  }),
});
