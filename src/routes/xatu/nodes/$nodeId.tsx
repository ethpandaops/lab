import { createFileRoute } from '@tanstack/react-router';
import { DetailPage } from '@/pages/xatu/nodes';
import { nodeDetailSearchSchema } from '@/pages/xatu/nodes/constants';

export const Route = createFileRoute('/xatu/nodes/$nodeId')({
  component: DetailPage,
  validateSearch: nodeDetailSearchSchema,
  beforeLoad: ({ params }) => ({
    getBreadcrumb: () => ({ label: params.nodeId }),
    redirectOnNetworkChange: '/xatu/nodes',
  }),
  head: ctx => ({
    meta: [
      { title: `${ctx.params.nodeId} | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'description',
        content: 'Block, attestation and data column arrival for one Xatu node, ranked against every other node.',
      },
      { property: 'og:url', content: `${import.meta.env.VITE_BASE_URL}/xatu/nodes/${ctx.params.nodeId}` },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: `${ctx.params.nodeId} | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        property: 'og:description',
        content: 'Block, attestation and data column arrival for one Xatu node, ranked against every other node.',
      },
      { property: 'og:image', content: `${import.meta.env.VITE_BASE_URL}/images/xatu/nodes.png` },
      { name: 'twitter:url', content: `${import.meta.env.VITE_BASE_URL}/xatu/nodes/${ctx.params.nodeId}` },
      { name: 'twitter:title', content: `${ctx.params.nodeId} | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'twitter:description',
        content: 'Block, attestation and data column arrival for one Xatu node, ranked against every other node.',
      },
      { name: 'twitter:image', content: `${import.meta.env.VITE_BASE_URL}/images/xatu/nodes.png` },
    ],
  }),
});
