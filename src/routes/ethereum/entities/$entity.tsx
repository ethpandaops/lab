import { createFileRoute } from '@tanstack/react-router';
import { DetailPage } from '@/pages/ethereum/entities';
import { entityLabel } from '@/pages/ethereum/clients/utils/client-share';
import { entityDetailSearchSchema } from '@/pages/ethereum/entities/constants';

export const Route = createFileRoute('/ethereum/entities/$entity')({
  component: DetailPage,
  validateSearch: entityDetailSearchSchema,
  beforeLoad: ({ params }) => ({
    getBreadcrumb: () => ({ label: entityLabel(params.entity) }),
    redirectOnNetworkChange: '/ethereum/entities',
  }),
  head: ctx => ({
    meta: [
      { title: `${entityLabel(ctx.params.entity)} | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'description',
        content:
          'Stake, attestation and block proposal performance of one staking entity against the network, its blocks and the clients it runs.',
      },
      { property: 'og:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/entities/${ctx.params.entity}` },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: `${entityLabel(ctx.params.entity)} | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        property: 'og:description',
        content:
          'Stake, attestation and block proposal performance of one staking entity against the network, its blocks and the clients it runs.',
      },
      { name: 'twitter:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/entities/${ctx.params.entity}` },
      { name: 'twitter:title', content: `${entityLabel(ctx.params.entity)} | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'twitter:description',
        content:
          'Stake, attestation and block proposal performance of one staking entity against the network, its blocks and the clients it runs.',
      },
    ],
  }),
});
