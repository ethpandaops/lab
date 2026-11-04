import { createFileRoute } from '@tanstack/react-router';

import { IndexPage } from '@/pages/ethereum/entities';
import { entitiesSearchSchema } from '@/pages/ethereum/entities/constants';

export const Route = createFileRoute('/ethereum/entities/')({
  component: IndexPage,
  validateSearch: entitiesSearchSchema,
  beforeLoad: () => ({
    getBreadcrumb: () => ({ show: false }), // Index routes should not show breadcrumbs
  }),
  head: () => ({
    meta: [
      { title: `Entities | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'description',
        content:
          'Who runs Ethereum validators and how well they perform: stake, attestations and block proposals per staking entity against the network.',
      },
      { property: 'og:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/entities` },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: `Entities | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        property: 'og:description',
        content:
          'Who runs Ethereum validators and how well they perform: stake, attestations and block proposals per staking entity against the network.',
      },
      { name: 'twitter:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/entities` },
      { name: 'twitter:title', content: `Entities | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'twitter:description',
        content:
          'Who runs Ethereum validators and how well they perform: stake, attestations and block proposals per staking entity against the network.',
      },
    ],
  }),
});
