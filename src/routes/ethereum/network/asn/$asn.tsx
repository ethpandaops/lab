import { createFileRoute } from '@tanstack/react-router';
import { AsnPage } from '@/pages/ethereum/network';
import { networkSearchSchema } from '@/pages/ethereum/network/constants';

export const Route = createFileRoute('/ethereum/network/asn/$asn')({
  component: AsnPage,
  validateSearch: networkSearchSchema,
  beforeLoad: ({ params }) => ({
    getBreadcrumb: () => ({ label: `AS${params.asn.replace(/^as/i, '')}` }),
    redirectOnNetworkChange: '/ethereum/network/asn',
  }),
  head: ctx => ({
    meta: [
      { title: `AS${ctx.params.asn} | ${import.meta.env.VITE_BASE_TITLE}` },
      { name: 'description', content: 'Ethereum consensus peers on one network, by client, over time' },
      { property: 'og:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/network/asn/${ctx.params.asn}` },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: `AS${ctx.params.asn} | ${import.meta.env.VITE_BASE_TITLE}` },
      { property: 'og:description', content: 'Ethereum consensus peers on one network, by client, over time' },
      { name: 'twitter:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/network/asn/${ctx.params.asn}` },
      { name: 'twitter:title', content: `AS${ctx.params.asn} | ${import.meta.env.VITE_BASE_TITLE}` },
      { name: 'twitter:description', content: 'Ethereum consensus peers on one network, by client, over time' },
    ],
  }),
});
