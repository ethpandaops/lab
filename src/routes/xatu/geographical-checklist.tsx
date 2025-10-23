import { createFileRoute } from '@tanstack/react-router';
import { IndexPage } from '@/pages/xatu/geographical-checklist';

export const Route = createFileRoute('/xatu/geographical-checklist')({
  component: IndexPage,
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
      {
        property: 'og:image',
        content: '/images/experiments/geographical-checklist.png',
      },
      {
        property: 'og:description',
        content:
          'Explore the global distribution of Contributoor nodes across continents, countries, and cities with interactive 3D globe visualization and detailed geographical breakdown.',
      },
      {
        name: 'twitter:image',
        content: '/images/experiments/geographical-checklist.png',
      },
      {
        name: 'twitter:description',
        content:
          'Explore the global distribution of Contributoor nodes across continents, countries, and cities with interactive 3D globe visualization and detailed geographical breakdown.',
      },
    ],
  }),
});
